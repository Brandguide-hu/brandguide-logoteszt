# LogoLab - Teljes Elemzes Folyamat

## 1. FELTOLTES (`/elemzes/uj`)

| Lepes | Mi tortenik | Endpoint | Idotartam |
|-------|-------------|----------|-----------|
| 1a | User kivalaszt tier-t (free/paid/consultation) | -- | -- |
| 1b | User feltolt logot (PNG/JPG/WebP, max 5MB) | -- | -- |
| 1c | User kitolti az adatokat (nev, alkoto, kategoria, email) | -- | -- |
| 1d | **Submit** -> logo feltoltes Supabase storage-ba + `pending_analyses` sor letrehozas | `POST /api/analysis/prepare` | ~2s |

### Prepare endpoint (`/api/analysis/prepare`)

- Input: `logo` (File), `tier`, `logoName`, `creatorName`, `category`, `email`, `userId`, `sessionId`
- Validacio: PNG/JPG/WebP, max 5MB
- Feltoltes: Supabase `logos-temp` bucket: `temp/{pendingId}/original.{ext}`
- Thumbnail: WebP 400x400 (Sharp): `temp/{pendingId}/thumb.webp`
- DB: INSERT `pending_analyses` (status='pending')
- Output: `{ pendingAnalysisId }`

---

## 2. ROUTING (tier + auth alapjan)

```
                          +-- bejelentkezett -- FREE --> /api/analysis/create -> redirect /feldolgozas/{id}
                          |                    PAID --> /api/checkout/create-session -> Stripe
Submit --> /api/prepare --+
                          |                    FREE --> /api/auth/lazy-register -> email megerosites
                          +-- nem bejelentkezett PAID --> /api/checkout/create-session -> Stripe
```

### 2A. FREE, bejelentkezett

**Endpoint**: `POST /api/analysis/create`
- Token-based auth (Bearer token)
- Lekepdezi a pending_analyses rekordot
- 24h limit ellenorzes (profile.last_free_analysis_at) -- DISABLE_FREE_LIMIT=true teszteles alatt
- Logo athelyezes: `logos-temp` -> `logos/{userId}/{analysisId}/original.{ext}`
- Thumbnail athelyezes (ha van)
- Logo -> base64 konverzio
- DB: INSERT `analyses` (status='pending', test_level='basic', visibility='pending_approval')
- Profile update: `last_free_analysis_at`, `last_free_analysis_ip`
- Cleanup: DELETE pending_analyses + temp fajlok
- Output: `{ analysisId }`
- **Redirect** -> `/elemzes/feldolgozas/{analysisId}`

### 2B. PAID (barki)

**Endpoint**: `POST /api/checkout/create-session`
- Input: `pendingAnalysisId`, `tier` ('paid'|'consultation'), `email`
- Stripe checkout session letrehozas:
  - `payment_method_types: ['card']`
  - `mode: 'payment'`
  - `locale: 'hu'`
  - `metadata: { pending_analysis_id, tier }`
  - `success_url: /elemzes/sikeres?session_id={CHECKOUT_SESSION_ID}`
  - `cancel_url: /elemzes/uj?canceled=true`
- Output: `{ url: session.url }`
- **Redirect** -> Stripe fizetes oldal

**Stripe Webhook** (`checkout.session.completed`):
1. User fiok:
   - Letez -> hasznaljuk
   - Nem letezik -> regisztracio (email_confirm=true, created_via='stripe')
2. Logo mozgatas: temp -> vegleges
3. DB: INSERT `analyses` (status='pending', test_level='detailed', visibility='private')
4. Email kuldes:
   - Uj user: magic link + fizetes megerosites
   - Letezo user: fizetes megerosites
5. Cleanup: DELETE pending_analyses + temp fajlok

**Sikeres oldal** (`/elemzes/sikeres`):
- Bejelentkezett -> auto redirect `/elemzes/feldolgozas/{analysisId}`
- Nem bejelentkezett -> "Fizetes sikeres, nezd meg az emailt" + direkt link

### 2C. FREE, nem bejelentkezett

**Endpoint**: `POST /api/auth/lazy-register`
- Input: `email`, `pendingAnalysisId`
- User letezik -> linkeljes pending_analyses-t
- User nem letezik -> letrehozas (email_confirm=true, created_via='direct')
- **MailerLite feliratkozas** (fire-and-forget)
- Magic link generaals + email kuldes (redirect: `/auth/confirm?pending={pendingAnalysisId}`)
- Output: `{ success: true, isNewUser }`

**Megerosites oldal** (`/elemzes/megerosites`):
- "Ellenorizd az emailed" uzenet
- "Ujrakuldes" gomb (60s cooldown)

**Magic link kattintas** -> `/auth/confirm?pending={id}` -> auto-login -> redirect `/feldolgozas/{id}`

---

## 3. FELDOLGOZAS (`/elemzes/feldolgozas/{id}`)

### Inicializacio

1. `GET /api/result/{id}` -> analyses rekord lekeres
2. Status ellenorzes:
   - `completed` + result -> redirect `/eredmeny/{id}`
   - `processing` + result (mar fut) -> polling mod
   - `pending` vagy `processing` (ures result) -> SSE elemzes inditas
   - `failed` -> hibauzenet

### Flow valasztas

```
if tier='free' AND test_level='basic':
   -> Light Analysis (SSE) -> /api/analyze/light
else (tier='paid'|'consultation'):
   -> MAX Analysis (Vision SSE + Background Function + Polling)
```

---

## 4. LIGHT ELEMZES (FREE tier)

**Endpoint**: `POST /api/analyze/light`
**Timeout**: 120s (Next.js)
**Osszido**: ~52 mp

```
Feldolgozas oldal --SSE--> POST /api/analyze/light
                              |
                              +-- 1. Logo base64 lekerdes DB-bol
                              +-- 2. Claude Vision -> visionDescription (~22s)
                              |     (cache: ha vision_description letezik DB-ben, hasznaljuk)
                              +-- 3. KB-Extract (Light schema: scoring+summary) (~30s)
                              +-- 4. Pontszam szamitas (7 szempont, clamp maxPont-ra)
                              +-- 5. DB mentes: result + status='completed' + completed_at
                              +-- SSE: complete event
```

### SSE Esemenyek

| Event | Tartalom |
|-------|----------|
| `status` | Phase + uzenet (progress bar) |
| `debug` | Belso log |
| `complete` | Vegleges eredmeny |
| `error` | Hibauzenet |
| `heartbeat` | Keep-alive (2s-enkent) |

### Light Result Schema

```typescript
{
  osszpontszam: number,        // max 100
  minosites: string,
  osszegzes: string,
  erossegek: string[],
  fejlesztendo: string[],
  szempontok: {
    megkulonboztethetoseg: { pont, maxPont, indoklas },
    egyszeruseg: { pont, maxPont, indoklas },
    alkalmazhatosag: { pont, maxPont, indoklas },
    emlekezetesseg: { pont, maxPont, indoklas },
    idotallosag: { pont, maxPont, indoklas },
    univerzalitas: { pont, maxPont, indoklas },
    lathatosag: { pont, maxPont, indoklas },
  },
  logoTipus: string,
  testLevel: 'basic'
}
```

---

## 5. MAX ELEMZES (PAID/CONSULTATION tier)

### 5A. Vision SSE (~22s)

**Endpoint**: `POST /api/analyze/vision`
**Timeout**: 60s (Netlify gateway)

- Input: `logo` (base64), `mediaType`, `colors[]`, `fontName`
- Claude 3.5 Sonnet Vision -> "Vakvezeto Designer" leiras (~3500 karakter)
- SSE stream a progresszel
- Output: `visionDescription`

### 5B. Background Function Trigger

**Endpoint**: `POST /api/analyze/trigger`
- Input: `visionDescription`, `logo` (base64), `analysisId`, `tier`
- Fire-and-forget: fetch `/.netlify/functions/analyze-background`
- Azonnal 202 Accepted-et ad vissza
- Kliens atvalt polling modra

### 5C. Background Function (`netlify/functions/analyze-background.mts`)

**Limit**: 15 perc (Netlify background functions)
**Osszido**: ~55 mp

```
1. Body kicsomagolas: visionDescription, logo, analysisId
2. Status -> 'processing' (DB PATCH)
3. Parhuzamos KB-Extract hivasok:
   +-- Scoring: 7 szempont pontszam (~30s)
   +-- Summary+Details: osszegzes, erossegek, fejlesztendo, szinek, tipografia, vizualisNyelv (~9s)
4. Eredmeny feldolgozas:
   +-- Criteria clamp (maxPont-ra)
   +-- Osszpontszam szamitas
   +-- AnalysisResult osszerakas
5. DB mentes: result + status='completed' + completed_at
6. HIBA ESETEN: status='failed'
```

### 5D. Polling (kliens oldal)

```
GET /api/result/{id} minden 3 masodpercben, max 5 percig
   +-- status='completed' -> redirect /eredmeny/{id}
   +-- status='failed' -> hibauzenet
   +-- timeout (300s) -> "Az elemzes tul sokaig tart"
```

---

## 6. EREDMENY OLDAL (`/eredmeny/{id}`)

### Adatlekerdes

`GET /api/result/{id}` -> teljes analyses rekord (result, visual_analysis, tier, status, stb.)

### Status kezeles

| Status | Reakcio |
|--------|---------|
| `completed` + osszpontszam | Eredmeny megjelenitese |
| `failed` | Hibauzenet + "Uj elemzes" gomb |
| `processing` | "Elemzes folyamatban" + auto-poll (5s) |
| Polling kozben `failed` | Hibauzenet |

### Megjelenites

- **Osszpontszam**: animalt count-up (0 -> vegso, easeOutCubic, 1.2s)
- **Radar chart**: 7 szempont vizualizacio
- **Osszegzes**: szoveges ertekeles
- **Erossegek / Fejlesztendo**: listaszeruen
- **Szempont reszletezes**: kattinthato tabfutek (indoklas, reszletek)

### PAID tier extra tartalmak

- Szinek: harmonia, pszichologia, technikai reszletek
- Tipografia: betu elemzes
- Vizualis nyelv: formak, elemek, koherencia

### Visual Analysis Lazy Loading (PAID tier)

```
useEffect: ha tier='paid'|'consultation' ES nincs visual_analysis:
   +-- POST /api/analyze/visual-trigger
   |     +-- Tier ellenorzes (paid/consultation kell)
   |     +-- Idempotencia: ha mar van visual_analysis, skip
   |     +-- Logo lekerdes (base64 vagy storage)
   |     +-- processVisualAnalysis(analysisId, userId, imageBuffer)
   |     +-- DB mentes: visual_analysis JSONB
   +-- Re-fetch -> megjelenes
```

**Visual tesztek**:
- BackgroundTests (kontraszt aranyok kulonbozo hattereken)
- BalanceOverlay (vizualis egyensuly)
- ColorblindSimulation (szintevesztes szimulacio)
- ComplexityGauge (bonyolultsag meter)
- ContrastMatrix (szin kontraszt matrix)
- SilhouetteTest (sziluett teszt)
- SymmetryHeatmap (szimmetria hoterkep)
- Mockups (app ikon, nevjegy, levelpapir, telefon, uzletfront, polo)

---

## 7. ERROR HANDLING

| Hol | Mi tortenik hiba eseten |
|-----|------------------------|
| Background function crash | `status='failed'` (Supabase PATCH) |
| Feldolgozas oldal poll | `status='failed'` -> hibauzenet + "Ujraprobalkozas" |
| Eredmeny oldal | `status='failed'` -> "Sikertelen" + Uj elemzes gomb |
| KB-Extract timeout | Background function catch -> `status='failed'` |
| Stripe fizetes | cancel -> redirect `/elemzes/uj?canceled=true` |
| File upload | "Csak PNG/JPG/WebP, max 5MB" |

---

## 8. IDOZITESEK

| Lepes | Szolgaltatas | Ido | Timeout |
|-------|-------------|-----|---------|
| Logo feltoltes | Supabase Storage | ~2s | 30s |
| Claude Vision | Anthropic API | ~22s | 60s |
| KB-Extract (scoring) | brandguideAI | ~30s | 60s |
| KB-Extract (summary) | brandguideAI | ~9s | 60s |
| **Light teljes** | Next.js SSE | **~52s** | 120s |
| **MAX teljes** | Netlify BG | **~55s** | 15 perc |
| Visual analysis | Claude Vision | ~30s | 60s |
| Polling intervallum | Client | 3-5s | 5 perc |

---

## 9. DB STATUS FLOW

```
pending -> processing -> completed
                      -> failed (hiba eseten)
```

**Constraint**: `analyses_status_check` -- megengedett ertekek: `pending`, `processing`, `completed`, `failed`

---

## 10. DB SCHEMA (fo tablak)

### pending_analyses

| Mezo | Tipus | Leiras |
|------|-------|--------|
| id | UUID (PK) | |
| session_id | text | Tracking session |
| tier | text | free/paid/consultation |
| logo_temp_path | text | Temp storage path |
| logo_thumbnail_temp_path | text | Temp thumb path |
| logo_name | text | Logo neve |
| creator_name | text | Alkoto neve |
| category | text | Kategoria |
| email | text | User email |
| user_id | UUID (FK) | Nullable |

### analyses

| Mezo | Tipus | Leiras |
|------|-------|--------|
| id | UUID (PK) | |
| user_id | UUID (FK) | auth.users |
| tier | text | free/paid/consultation |
| status | text | pending/processing/completed/failed |
| visibility | text | private/pending_approval/public |
| logo_base64 | text (NOT NULL) | Teljes base64 az API-nak |
| logo_original_path | text | Storage path |
| logo_thumbnail_path | text | Storage thumb path |
| logo_name | text | Logo neve |
| creator_name | text | Alkoto neve |
| category | text | Kategoria |
| result | JSONB | AnalysisResult |
| vision_description | text | Cached vision leiras (~3500 char) |
| visual_analysis | JSONB | Visual teszt eredmenyek |
| test_level | text | basic/detailed |
| created_at | timestamptz | |
| completed_at | timestamptz | |
| stripe_payment_intent_id | text | |
| stripe_checkout_session_id | text | |
| stripe_amount | integer | |
| share_hash | text | Publikus megosztas hash |

### profiles

| Mezo | Tipus | Leiras |
|------|-------|--------|
| id | UUID (FK) | auth.users |
| email | text | |
| name | text | |
| is_admin | boolean | |
| is_email_verified | boolean | |
| created_via | text | stripe/direct/google/stb |
| last_free_analysis_at | timestamptz | 24h limit |
| last_free_analysis_ip | text | IP limit |

---

## 11. STORAGE BUCKETS

- **logos-temp**: Atmeneti feltoltesek
  - `temp/{pendingId}/original.{ext}`
  - `temp/{pendingId}/thumb.webp`
- **logos**: Vegleges logok
  - `{userId}/{analysisId}/original.{ext}`
  - `{userId}/{analysisId}/thumb.webp`
- **visual-analysis**: Visual teszt eredmenyek (PAID tier)

---

## 12. FREE vs PAID OSSZEHASONLITAS

| Feature | FREE | PAID | CONSULTATION |
|---------|------|------|--------------|
| Elemzes tipus | Light (2 API hivas) | Full (3 API hivas) | Full |
| Criteria Scoring | 7 szempont | 7 szempont | 7 szempont |
| Visual Details | Nincs | Szinek, Tipografia, Vizualis nyelv | Minden |
| Visual Tests | Nincs | Geometria, szin szimulacio, mockups | Minden |
| Lathatosag | pending_approval (galeria) | Private | Private |
| Ar | Ingyenes (1/24h, IP-alapu) | Fizetett (HUF) | Fizetett (HUF) |

---

## 13. MAILERLITE INTEGRACIO

Minden regisztracios pontnal fire-and-forget MailerLite API hivas:

- `POST /api/auth/register` -- teljes regisztracio (email + nev)
- `POST /api/auth/lazy-register` -- lazy regisztracio (email)
- Stripe webhook -- (meg nincs, csak register uton)

**API hivas**:
```
POST https://connect.mailerlite.com/api/subscribers
Authorization: Bearer {MAILERLITE_API_KEY}
Body: { email, fields: { name }, groups: [MAILERLITE_GROUP_ID] }
```

---

## 14. ERINTETT FAJLOK LISTAJA

| Fajl | Cel |
|------|-----|
| `src/app/elemzes/uj/page.tsx` | Feltolto oldal |
| `src/app/api/analysis/prepare/route.ts` | Logo feltoltes + pending |
| `src/app/api/analysis/create/route.ts` | FREE elemzes letrehozas |
| `src/app/api/checkout/create-session/route.ts` | Stripe checkout |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook |
| `src/app/api/auth/lazy-register/route.ts` | Lazy regisztracio |
| `src/app/api/auth/register/route.ts` | Teljes regisztracio |
| `src/app/elemzes/feldolgozas/[id]/page.tsx` | Feldolgozas oldal |
| `src/app/api/analyze/light/route.ts` | Light elemzes (FREE) |
| `src/app/api/analyze/vision/route.ts` | Vision SSE (MAX) |
| `src/app/api/analyze/trigger/route.ts` | BG function trigger |
| `netlify/functions/analyze-background.mts` | Background function |
| `src/app/api/analyze/visual-trigger/route.ts` | Visual analysis trigger |
| `src/app/api/analyze/visual-process/route.ts` | Visual analysis processing |
| `src/app/api/result/[id]/route.ts` | Eredmeny API |
| `src/app/eredmeny/[id]/page.tsx` | Eredmeny oldal |
| `src/lib/prompts-v2.ts` | Prompt sablonok + isValidTextItem |

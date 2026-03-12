/**
 * Supabase Edge Function: analyze-pipeline
 *
 * KB-Extract pipeline párhuzamos javaslatokkal — nincs Netlify 60s limit!
 * Supabase Edge Function timeout: Pro 150s, Team 400s.
 *
 * Lépések:
 *   step='scoring':            Scoring KB-Extract → partial result DB-be (status='processing')
 *   step='summary':            Summary KB-Extract (osszegzes, erossegek, fejlesztendo) → status='processing'
 *   step='details':            Details KB-Extract (szinek, tipografia, vizualisNyelv) → status='processing'
 *   step='suggestions-a':      Javaslatok 4 szemponthoz (generate-only, NINCS DB write)
 *   step='suggestions-b':      Javaslatok 3 szemponthoz (generate-only, NINCS DB write)
 *   step='detail-suggestions': Részletes javaslatok (generate-only, NINCS DB write)
 *   step='finalize':           Merge all + status='completed' + email
 *
 * Kliens:
 *   vision (Next.js) → scoring → summary → details
 *     → Promise.all(suggestions-a, suggestions-b, detail-suggestions)
 *     → finalize → redirect
 */

// @ts-nocheck — Deno imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// CORS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================================
// TYPES
// ============================================================================

interface SzempontItem {
  pont: number;
  maxPont: number;
  indoklas: string;
  javaslatok: string[];
}

interface ScoringDataRaw {
  scoring: {
    osszpontszam: number;
    logotipus: "klasszikus_logo" | "kampany_badge" | "illusztracio_jellegu";
    hiresLogo: {
      ismert: boolean;
      marka: string;
      tervezo: string;
      kontextus: string;
    };
    szempontok: Record<string, SzempontItem>;
  };
}

interface SummaryDetailsDataRaw {
  summary: {
    osszegzes: string;
    erossegek: string[];
    fejlesztendo: string[];
  };
  details: {
    szinek: {
      harmonia: string;
      pszichologia: string;
      technikai: string;
      javaslatok: string[];
    };
    tipografia: {
      karakter: string;
      olvashatosag: string;
      javaslatok: string[];
    };
    vizualisNyelv: {
      formak: string;
      elemek: string;
      stilusEgyseg: string;
      javaslatok: string[];
    };
  };
  szempontJavaslatok?: Record<string, string[]>;
}

type SzempontKey =
  | "megkulonboztethetoseg"
  | "egyszeruseg"
  | "alkalmazhatosag"
  | "emlekezetesseg"
  | "idotallosag"
  | "univerzalitas"
  | "lathatosag";

// ============================================================================
// CONSTANTS
// ============================================================================

const SZEMPONT_ORDER: SzempontKey[] = [
  "megkulonboztethetoseg",
  "egyszeruseg",
  "alkalmazhatosag",
  "emlekezetesseg",
  "idotallosag",
  "univerzalitas",
  "lathatosag",
];

const MAX_VALUES: Record<SzempontKey, number> = {
  megkulonboztethetoseg: 20,
  egyszeruseg: 18,
  alkalmazhatosag: 15,
  emlekezetesseg: 15,
  idotallosag: 12,
  univerzalitas: 10,
  lathatosag: 10,
};

// ============================================================================
// SCHEMAS (from prompts-v2.ts)
// ============================================================================

// Szempont schema (scoring step — pont, maxPont, indoklas, nincs javaslatok)
const szempontItemScoringSchema = {
  type: "object",
  properties: {
    pont: { type: "integer" },
    maxPont: { type: "integer" },
    indoklas: { type: "string" },
  },
  required: ["pont", "maxPont", "indoklas"],
};

const KB_EXTRACT_SCORING_SCHEMA = {
  type: "object",
  properties: {
    scoring: {
      type: "object",
      properties: {
        osszpontszam: { type: "integer" },
        logotipus: {
          type: "string",
          enum: ["klasszikus_logo", "kampany_badge", "illusztracio_jellegu"],
        },
        hiresLogo: {
          type: "object",
          properties: {
            ismert: { type: "boolean" },
            marka: { type: "string" },
            tervezo: { type: "string" },
            kontextus: { type: "string" },
          },
          required: ["ismert", "marka", "tervezo", "kontextus"],
        },
        szempontok: {
          type: "object",
          properties: {
            megkulonboztethetoseg: szempontItemScoringSchema,
            egyszeruseg: szempontItemScoringSchema,
            alkalmazhatosag: szempontItemScoringSchema,
            emlekezetesseg: szempontItemScoringSchema,
            idotallosag: szempontItemScoringSchema,
            univerzalitas: szempontItemScoringSchema,
            lathatosag: szempontItemScoringSchema,
          },
          required: [
            "megkulonboztethetoseg",
            "egyszeruseg",
            "alkalmazhatosag",
            "emlekezetesseg",
            "idotallosag",
            "univerzalitas",
            "lathatosag",
          ],
        },
      },
      required: ["osszpontszam", "logotipus", "hiresLogo", "szempontok"],
    },
  },
  required: ["scoring"],
};

// Suggestions-A schema: 4 szempont (megkulonboztethetoseg, egyszeruseg, alkalmazhatosag, emlekezetesseg)
const KB_EXTRACT_SUGGESTIONS_A_SCHEMA = {
  type: "object",
  properties: {
    javaslatok: {
      type: "object",
      properties: {
        megkulonboztethetoseg: { type: "array", items: { type: "string" } },
        egyszeruseg: { type: "array", items: { type: "string" } },
        alkalmazhatosag: { type: "array", items: { type: "string" } },
        emlekezetesseg: { type: "array", items: { type: "string" } },
      },
      required: ["megkulonboztethetoseg", "egyszeruseg", "alkalmazhatosag", "emlekezetesseg"],
    },
  },
  required: ["javaslatok"],
};

// Suggestions-B schema: 3 szempont (idotallosag, univerzalitas, lathatosag)
const KB_EXTRACT_SUGGESTIONS_B_SCHEMA = {
  type: "object",
  properties: {
    javaslatok: {
      type: "object",
      properties: {
        idotallosag: { type: "array", items: { type: "string" } },
        univerzalitas: { type: "array", items: { type: "string" } },
        lathatosag: { type: "array", items: { type: "string" } },
      },
      required: ["idotallosag", "univerzalitas", "lathatosag"],
    },
  },
  required: ["javaslatok"],
};

// Summary schema — CSAK összefoglaló (könnyű, gyors)
const KB_EXTRACT_SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "object",
      properties: {
        osszegzes: { type: "string" },
        erossegek: { type: "array", items: { type: "string" } },
        fejlesztendo: { type: "array", items: { type: "string" } },
      },
      required: ["osszegzes", "erossegek", "fejlesztendo"],
    },
  },
  required: ["summary"],
};

// Details schema — részletes elemzés (színek, tipográfia, vizuális nyelv)
// NINCS javaslatok — azok a suggestions stepben generálódnak
const KB_EXTRACT_DETAILS_SCHEMA = {
  type: "object",
  properties: {
    details: {
      type: "object",
      properties: {
        szinek: {
          type: "object",
          properties: {
            harmonia: { type: "string" },
            pszichologia: { type: "string" },
            technikai: { type: "string" },
          },
          required: ["harmonia", "pszichologia", "technikai"],
        },
        tipografia: {
          type: "object",
          properties: {
            karakter: { type: "string" },
            olvashatosag: { type: "string" },
          },
          required: ["karakter", "olvashatosag"],
        },
        vizualisNyelv: {
          type: "object",
          properties: {
            formak: { type: "string" },
            elemek: { type: "string" },
            stilusEgyseg: { type: "string" },
          },
          required: ["formak", "elemek", "stilusEgyseg"],
        },
      },
      required: ["szinek", "tipografia", "vizualisNyelv"],
    },
  },
  required: ["details"],
};

// ============================================================================
// QUERY BUILDERS (from prompts-v2.ts — inlined)
// ============================================================================

const PETI_STYLE_BLOCK = `## KOMMUNIKÁCIÓS STÍLUS – "Peti mentor"

Te egy tapasztalt branding mentor vagy. Úgy kommunikálsz, mint aki:
- Őszintén megmondja a véleményét, de nem bunkó módon
- A problémákat világosan megnevezi, de mindig ad megoldást is
- Támogató, de nem szépít – ha valami nem működik, azt kimondja
- Konkrét, actionable javaslatokat ad

### ALAPELVEK:
1. Legyél objektív és kritikus. Ne szépítsd a hibákat.
2. Ha a design amatőr vagy generikus, mondd ki szakszerűen.
3. Ha illusztráció-komplexitású, jelezd: "Ez inkább illusztráció, mint logó."

### KERÜLENDŐ: "fantasztikus", "briliáns", "tökéletes", "talán", "esetleg"
### HASZNÁLANDÓ: "jelenleg", "fejlesztésre szorul", "a probléma az, hogy..."`;

function buildScoringExtractQuery(): string {
  return `## HÍRES LOGÓK FELISMERÉSE

Ha a logó egy **ismert márka** (Fortune 500, híres brand, kulturális ikon):
- Nevezd meg a márkát és kontextust
- Ha ismered a tervezőt, említsd meg
- Értékeld objektíven – a hírnév NEM jelent automatikusan magas pontot

Ha **TV műsor, film, esemény** logója:
- Jelezd, hogy ez "kampány-badge" vagy "event branding", nem klasszikus céges logó
- Más szabályok vonatkoznak rá: lehet komplexebb, mert rövid életciklusra tervezték

---

## LOGÓ DEFINÍCIÓ – KRITIKUS ALAPELV

Egy logó NEM illusztráció. A logó egyszerű, skálázható, időtálló azonosító jel.

### Mi a különbség?

| LOGÓ | ILLUSZTRÁCIÓ |
|------|--------------|
| Egyszerűsíthető 2-3 elemre | Sok részlet = gazdagság |
| 1-2 színnel is működik | Színek nélkül értelmetlen |
| 10mm-en is felismerhető | Kicsiben részletek elvesznek |
| 50 év múlva is modern | Korszakhoz kötött |
| Gyerek le tudná rajzolni | Művészi készség kell hozzá |

### AUTOMATIKUS "ILLUSZTRÁCIÓ-GYANÚ" INDIKÁTOROK:

⚠️ **SZIGORÚ SZABÁLY** – Ha ezek közül **2 vagy több** jelen van → **MAX 45-50 pont összesen**:
- 4+ szín használata gradienssel
- Apró, 10mm alatt olvashatatlan részletek
- Körbe írt szöveg + központi kép + peremdekoráció együtt
- Fotorealisztikus vagy árnyékolt elemek
- Badge/embléma stílus túl sok réteggel (5+ vizuális elem)
- Rajzos, illusztrációs karakterek vagy jelenetek
- Vékony vonalak, textúrák, árnyékok amelyek kis méretben eltűnnek
- "Nem tudnám 30 másodperc alatt fejből lerajzolni"

### KIS MÉRETBEN NEM MŰKÖDIK = SZIGORÚ BÜNTETÉS:

**Ez az egyik legfontosabb teszt.** Egy logónak 16px-en (favicon), 32px-en (app ikon) és 10mm-en (névjegykártya) is felismerhetőnek KELL lennie.

Ha a leírás alapján a logó kis méretben elveszíti a részleteit:
- Apró szövegek olvashatatlanná válnak → MAX 50 pont
- Vékony vonalak, dekoratív elemek eltűnnek → MAX 50 pont
- A logó lényegi eleme (karakter, jelenet) felismerhetetlen lesz → MAX 40 pont
- Több probléma együtt → MAX 35 pont

### A "BADGE-CSAPDA":

Sok logó badge formátumú (kör/pajzs + szöveg körben + központi kép).
Ez ÖNMAGÁBAN rendben van (gondolj a Starbucksra).

DE ha a badge-en belül:
- 3+ különböző vizuális elem van → MAX 55 pont
- Apró dekoratív részletek vannak a peremen → MAX 50 pont
- A központi kép önmagában is összetett illusztráció → MAX 45 pont

→ Ez már NEM működőképes logó. Jelezd ezt explicit módon és BÜNTESS keményen!

---

## ÉRTÉKELÉSI SZEMPONTOK – Brandguide 100 pontos rendszer

### ÖSSZPONTSZÁM KALIBRÁCIÓ – SZIGORÚ!

| Pontszám | Mit jelent | Példák |
|----------|------------|--------|
| 85-100 | Világszínvonalú, ikonikus | Nike, Apple, FedEx, McDonald's |
| 70-84 | Professzionális, jól működik | Jó ügynökségi munka |
| 55-69 | Működőképes, de fejlesztésre szorul | Átlagos kisvállalkozói logók |
| 40-54 | Jelentős problémák, újratervezés javasolt | Canva-sablonok, túlzsúfolt badge-ek |
| 0-39 | Alapvető koncepcionális gondok | Olvashatatlan, pixeles |

### AUTOMATIKUS PONTSZÁM-PLAFON:

- Ha a logó **illusztráció-komplexitású** (rajzos elemek, karakterek, jelenetek) → **MAX 45 pont**
- Ha **badge 5+ elemmel** → MAX 50 pont
- Ha **gradiens + apró részletek együtt** → MAX 40 pont
- Ha **kis méretben (16-32px) részletek elvesznek** → MAX 45 pont
- Ha **pixeles, elmosódott vagy rossz minőségű** → MAX 35 pont

**KRITIKUS:** Légy kritikus és objektív! A magas pontszámot KI KELL ÉRDEMELNI.
Az illusztrációs, rajzos logók NEM kaphatnak magas pontszámot, mert nem működnek valós felhasználásban!

---

## KRITÉRIUMONKÉNTI PONTOZÁSI ÚTMUTATÓ

### 1. MEGKÜLÖNBÖZTETHETŐSÉG (max 20 pont)
18-20: Ikonikus, összetéveszthetetlen - RITKA!
14-17: Egyedi, erős brand-személyiség
9-13: Felismerhető, de vannak hasonlók
5-8: Generikus kategória-klisé
0-4: Stock-szerű, sablonos

### 2. EGYSZERŰSÉG (max 18 pont) – KRITIKUS!
16-18: Max 2 elem, 1 szín - RITKA!
12-15: 3 elem, 2 szín, tiszta struktúra
7-11: 4-5 elem, zsúfoltabb de érthető
3-6: Illusztráció-szintű komplexitás
0-2: Kaotikus részletáradat

LEVONÁSOK: Gradiens = MAX 11, 4+ szín = MAX 9, Körbeírt szöveg + komplex kép = MAX 7

### 3. ALKALMAZHATÓSÁG (max 15 pont)
14-15: Bármilyen méretben tökéletes - RITKA!
10-13: Minimális kompromisszummal skálázható
6-9: Módosítás kell kis mérethez
3-5: Csak nagy méretben működik
0-2: Egyetlen használatra korlátozott

### 4. EMLÉKEZETESSÉG (max 15 pont)
14-15: Egyetlen pillantás, azonnal bevésődik - RITKA!
10-13: Megjegyezhető, van vizuális horog
6-9: Átlagos, elmegy mellette a szem
3-5: Jellegtelen, könnyen felejthető
0-2: Nyomot sem hagy

### 5. IDŐTÁLLÓSÁG (max 12 pont)
11-12: 20+ évig változatlanul működne - RITKA!
8-10: 10-15 évig stabil
4-7: 5-10 év, utána frissítés kell
0-3: Már most datált

### 6. UNIVERZALITÁS (max 10 pont)
9-10: Kulturálisan semleges, globálisan működik
7-8: Széles körben működik
4-6: Egyes kultúrákban kérdéses
0-3: Erősen kulturálisan kötött

### 7. LÁTHATÓSÁG (max 10 pont)
9-10: Kiváló kontraszt, távolról is működik
7-8: Jó láthatóság normál körülmények közt
4-6: Bizonyos helyzetben problémás
0-3: Gyakran elvész a környezetében

---

[Feladat]
A logó leírása az image_description mezőben található. Értékeld a Brandguide 100 pontos rendszerével!

KRITIKUS: A szempontok tömbben MIND A 7 szempont KÖTELEZŐ! Ne hagyd ki egyiket sem: megkulonboztethetoseg, egyszeruseg, alkalmazhatosag, emlekezetesseg, idotallosag, univerzalitas, lathatosag.

FONTOS: Ebben a lépésben CSAK a pontozás (pont, maxPont) és az indoklás (indoklas) szükséges szempontonként. Javaslatokat (javaslatok) NE generálj – azok a következő lépésben készülnek.`;
}

function buildSummaryExtractQuery(scoringJson: Record<string, unknown>): string {
  return `## ELŐZŐ ELEMZÉS EREDMÉNYE

Az alábbi strukturált pontozást kaptuk az első elemzési körben:

\`\`\`json
${JSON.stringify(scoringJson, null, 2)}
\`\`\`

FONTOS: NE elemezd újra a logót! Az első kör pontozásából és a logó leírásából (image_description) dolgozz.
A pontszámokat és indoklásokat fogadd el tényként — a feladatod az összefoglaló elkészítése.

---

${PETI_STYLE_BLOCK}

## ÖSSZEFOGLALÓ KÉSZÍTÉSE – "Peti mentori értékelés"

Írj 3-5 mondatos ŐSZINTE, személyes hangú értékelést a logóról (max 600 karakter).
Úgy írj, mintha egy tapasztalt branding mentor mondaná el a véleményét egy barátságos konzultáción.

### STÍLUSJEGYEK az összefoglalóhoz:
- **Rögtön a lényegre térj** – az első mondat MINDIG a konkrét logóról szóljon, ne legyen általános bevezető
- **Rövid, lendületes mondatok**: "A titok? Nincs benne felesleges elem." / "Őszintén? Ez fejlesztésre szorul."
- **Kérdés-válasz ritmus**: "De működik? Igen, mert..."  / "A kérdés az, hogy elég-e ez?"
- **Hétköznapi analógiák**: Hasonlítsd hétköznapi dolgokhoz, ne design-zsargonhoz
- **Félkövér kiemelés** a legfontosabb megállapításnál (markdown **félkövér**)
- **Gondolatjeles megtörés**: "Nem rossz – de lehetne sokkal jobb."

### KERÜLENDŐ az összefoglalóban:
- "Fantasztikus", "briliáns", "tökéletes" – túl lelkes szavak
- "Innovatív", "dinamikus", "komplex megoldás" – üres buzzwordök
- Sablonos nyitás – TILOS: "Nézzük, mi a helyzet...", "Ez a logó egy...", "Ami elsőre szembetűnik..." – minden elemzés más nyitómondattal kezdődjön!
- Passzív szerkezetek ("megfigyelhető, hogy...") – aktív, közvetlen hangnem

Erősségek és fejlesztendő területek: max 3-3 db, RÖVID 2-5 szavas bullet-ek.

---

[Feladat]
A logó leírása az image_description mezőben található, az első kör pontozása fentebb.
Készítsd el az összefoglalót (osszegzes, erossegek, fejlesztendo)!

FONTOS: Az összefoglaló (osszegzes) legyen Peti mentori stílusú – közvetlen, őszinte, barátságos hangú, mintha személyesen mondaná el a véleményét.`;
}

function buildDetailsExtractQuery(scoringJson: Record<string, unknown>): string {
  return `## PONTOZÁS

\`\`\`json
${JSON.stringify(scoringJson, null, 2)}
\`\`\`

NE elemezd újra — a logó leírásából (image_description) és a fenti pontszámokból dolgozz.

## RÉSZLETES ELEMZÉS — max 2 mondat mezőnként!

### SZÍNPALETTA
- harmonia: Színek együttműködése (max 2 mondat)
- pszichologia: Milyen érzéseket közvetítenek? (max 2 mondat)
- technikai: RGB/CMYK reprodukálhatóság (max 2 mondat)

### TIPOGRÁFIA
- karakter: A betűtípus személyisége (max 2 mondat)
- olvashatosag: Különböző méretekben (max 2 mondat)

### VIZUÁLIS NYELV
- formak: Formavilág jellemzése (max 2 mondat)
- elemek: Ikon/szimbólum erőssége (max 2 mondat)
- stilusEgyseg: Elemek összhangja (max 2 mondat)

[Feladat]
Készítsd el a fenti 8 mezőt! Javaslatokat NE generálj, azok külön lépésben készülnek. Minden mező max 2 tömör mondat.`;
}

function buildSuggestionsAExtractQuery(scoringJson: Record<string, unknown>): string {
  return `## SCORING EREDMÉNY

\`\`\`json
${JSON.stringify(scoringJson, null, 2)}
\`\`\`

## FELADAT

A fenti pontozás alapján adj 2-3 konkrét, actionable javaslatot az alábbi 4 szemponthoz:
- megkulonboztethetoseg (Megkülönböztethetőség)
- egyszeruseg (Egyszerűség)
- alkalmazhatosag (Alkalmazhatóság)
- emlekezetesseg (Emlékezetesség)

Az indoklásokra építs — ne ismételd az indoklást, hanem adj MEGOLDÁST!
Rövid, tömör javaslatok kellenek (max 1-2 mondat javaslatonként).

FONTOS: CSAK a fenti 4 szemponthoz adj javaslatot!`;
}

function buildSuggestionsBExtractQuery(scoringJson: Record<string, unknown>): string {
  return `## SCORING EREDMÉNY

\`\`\`json
${JSON.stringify(scoringJson, null, 2)}
\`\`\`

## FELADAT

A fenti pontozás alapján adj 2-3 konkrét, actionable javaslatot az alábbi 3 szemponthoz:
- idotallosag (Időtállóság)
- univerzalitas (Univerzalitás)
- lathatosag (Láthatóság)

Az indoklásokra építs — ne ismételd az indoklást, hanem adj MEGOLDÁST!
Rövid, tömör javaslatok kellenek (max 1-2 mondat javaslatonként).

FONTOS: CSAK a fenti 3 szemponthoz adj javaslatot!`;
}

function buildDetailSuggestionsExtractQuery(scoringJson: Record<string, unknown>): string {
  return `## PONTOZÁS

\`\`\`json
${JSON.stringify(scoringJson, null, 2)}
\`\`\`

## FELADAT

A logó leírása (image_description) és a fenti pontszámok alapján adj 2 konkrét, actionable javaslatot az alábbi területekhez:

- szinek: Színpaletta javítási javaslatok (hogyan lehetne jobb a színhasználat?)
- tipografia: Tipográfiai javaslatok (betűtípus, olvashatóság fejlesztése)
- vizualisNyelv: Vizuális nyelv javaslatok (formavilág, elemek, stílusegység)

Max 1-2 mondat javaslatonként!`;
}

const KB_EXTRACT_DETAIL_SUGGESTIONS_SCHEMA = {
  type: "object",
  properties: {
    szinek: { type: "array", items: { type: "string" } },
    tipografia: { type: "array", items: { type: "string" } },
    vizualisNyelv: { type: "array", items: { type: "string" } },
  },
  required: ["szinek", "tipografia", "vizualisNyelv"],
};

// ============================================================================
// UTILS (from prompts-v2.ts and score-summary/route.ts)
// ============================================================================

function isValidTextItem(s: unknown): s is string {
  if (typeof s !== "string") return false;
  if (s.length < 10) return false;
  if (s.includes('":{') || s.includes('":[') || s.includes('":\\"')) return false;
  return true;
}

type Rating = "Kivételes" | "Profi" | "Jó minőségű" | "Átlagos" | "Problémás" | "Újragondolandó";

function getRatingFromScore(score: number): Rating {
  if (score >= 90) return "Kivételes";
  if (score >= 80) return "Profi";
  if (score >= 70) return "Jó minőségű";
  if (score >= 60) return "Átlagos";
  if (score >= 40) return "Problémás";
  return "Újragondolandó";
}

function clampSzempontok(
  szempontok: Record<string, SzempontItem>
): Record<string, SzempontItem> {
  const clamped: Record<string, SzempontItem> = {};
  for (const key of SZEMPONT_ORDER) {
    const item = szempontok[key];
    const maxPont = MAX_VALUES[key];
    clamped[key] = {
      pont: Math.min(Math.max(0, item?.pont || 0), maxPont),
      maxPont,
      indoklas: item?.indoklas || "",
      javaslatok: Array.isArray(item?.javaslatok) ? item.javaslatok : [],
    };
  }
  return clamped;
}

function calculateTotalScore(
  szempontok: Record<string, SzempontItem>
): number {
  return SZEMPONT_ORDER.reduce(
    (sum, key) => sum + (szempontok[key]?.pont || 0),
    0
  );
}

function appendBrief(query: string, brief: string | null | undefined): string {
  if (!brief) return query;
  return `${query}

## DESIGNER BRIEF
A feltöltő kontextusa: "${brief}"
Értékeld, mennyire teljesíti a logó a kitűzött célt.`;
}

// ============================================================================
// KB-EXTRACT API CALL
// ============================================================================

async function queryKBExtractOnce<T>(
  query: string,
  imageDescription: string,
  schema: object,
  mode: "strict" | "best_effort" = "strict",
  options?: { max_sources?: number; language?: "hu" | "en" }
): Promise<{
  data: T;
  sources: Array<{ source_id: string; title: string; type: string }>;
  meta: { tokens_used?: number; validation?: { passed: boolean; errors: string[] } };
}> {
  const apiKey = Deno.env.get("BRANDGUIDE_API_KEY");
  const endpoint =
    Deno.env.get("BRANDGUIDE_ENDPOINT") ||
    "https://udqiowvplrkdrviahylk.supabase.co/functions/v1/kb-extract";

  if (!apiKey) {
    throw new Error("BRANDGUIDE_API_KEY nincs beállítva");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "User-Agent": "Mozilla/5.0",
      },
      body: JSON.stringify({
        query,
        image_description: imageDescription,
        output: { schema, mode },
        options: {
          max_sources: options?.max_sources ?? 5,
          language: options?.language ?? "hu",
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseData = await response.json();

    if (!response.ok) {
      console.error("[KB-EXTRACT] Full error response:", JSON.stringify(responseData));

      const error = responseData.error as {
        code?: string;
        message?: string;
      } | string | undefined;

      let errorCode = '';
      let errorMessage = '';

      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorCode = error.code || '';
        errorMessage = error.message || '';
      }

      if (!errorMessage && responseData.message) {
        errorMessage = String(responseData.message);
      }
      if (!errorMessage && responseData.detail) {
        errorMessage = String(responseData.detail);
      }

      if (errorCode === "QUOTA_EXCEEDED") {
        throw new Error(
          "A havi kvóta elfogyott. Kérjük próbáld újra a következő hónapban."
        );
      }

      const statusInfo = `HTTP ${response.status}`;
      const detail = errorMessage || JSON.stringify(responseData).slice(0, 200);
      const err = new Error(`brandguideAI hiba (${statusInfo}): ${detail}`);
      // Attach status for retry logic
      (err as any).httpStatus = response.status;
      throw err;
    }

    console.log("[KB-EXTRACT] Tokens used:", responseData.meta?.tokens_used);
    console.log(
      "[KB-EXTRACT] Validation passed:",
      responseData.meta?.validation?.passed
    );

    return responseData;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      const err = new Error(
        "Az elemzés időtúllépés miatt megszakadt. Kérlek próbáld újra."
      );
      (err as any).httpStatus = 408;
      throw err;
    }
    throw error;
  }
}

/**
 * KB-Extract hívás retry logikával.
 * 504 (Gateway Timeout) és 408 (Abort) esetén 1x újrapróbálja.
 */
async function queryKBExtract<T>(
  query: string,
  imageDescription: string,
  schema: object,
  mode: "strict" | "best_effort" = "strict",
  options?: { max_sources?: number; language?: "hu" | "en" }
): Promise<{
  data: T;
  sources: Array<{ source_id: string; title: string; type: string }>;
  meta: { tokens_used?: number; validation?: { passed: boolean; errors: string[] } };
}> {
  const MAX_RETRIES = 1;

  console.log("[KB-EXTRACT] Query length:", query.length);
  console.log("[KB-EXTRACT] Image description length:", imageDescription.length);
  console.log("[KB-EXTRACT] Mode:", mode, "| max_sources:", options?.max_sources ?? 5);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[KB-EXTRACT] RETRY attempt ${attempt}/${MAX_RETRIES} — waiting 3s...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      const result = await queryKBExtractOnce<T>(query, imageDescription, schema, mode, options);
      console.log(`[KB-EXTRACT] Success on attempt ${attempt + 1}`);
      return result;
    } catch (error) {
      const httpStatus = (error as any).httpStatus;
      const isRetryable = httpStatus === 504 || httpStatus === 502 || httpStatus === 408 || httpStatus === 503;

      console.error(`[KB-EXTRACT] Attempt ${attempt + 1} failed (status=${httpStatus}): ${(error as Error).message}`);

      if (isRetryable && attempt < MAX_RETRIES) {
        console.log(`[KB-EXTRACT] Retryable error (${httpStatus}), will retry...`);
        continue;
      }

      // Non-retryable or last attempt — rethrow
      throw error;
    }
  }

  // Shouldn't reach here, but TypeScript needs it
  throw new Error("KB-Extract: összes próbálkozás sikertelen");
}

// ============================================================================
// STEP HANDLERS
// ============================================================================

async function runScoringStep(
  supabase: ReturnType<typeof createClient>,
  analysisId: string,
  visionDescription: string,
  brief: string | null,
  existingVisionDescription: string | null
): Promise<Response> {
  console.log("[SCORING] Starting KB-Extract scoring...");
  console.log("[SCORING] analysisId:", analysisId, "visionDescription length:", visionDescription.length);

  const scoringQuery = appendBrief(buildScoringExtractQuery(), brief);
  const startTime = Date.now();

  const scoringResult = await queryKBExtract<ScoringDataRaw>(
    scoringQuery,
    visionDescription,
    KB_EXTRACT_SCORING_SCHEMA,
    "best_effort",
    { max_sources: 0, language: "hu" }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[SCORING] KB-Extract done in ${elapsed}s`);

  // Validate
  const rawScoring = scoringResult.data.scoring;
  const missingKeys = SZEMPONT_ORDER.filter(
    (key) => !rawScoring.szempontok?.[key]
  );
  if (missingKeys.length > 0) {
    throw new Error(
      `Hiányos elemzés: ${missingKeys.length} szempont hiányzik (${missingKeys.join(", ")}). Kérlek próbáld újra.`
    );
  }

  const szempontok = clampSzempontok(rawScoring.szempontok);
  const calculatedScore = calculateTotalScore(szempontok);
  const minosites = getRatingFromScore(calculatedScore);

  if (Math.abs(rawScoring.osszpontszam - calculatedScore) > 2) {
    console.log(
      `[SCORING] Score mismatch: AI=${rawScoring.osszpontszam}, Calculated=${calculatedScore}`
    );
  }

  console.log(`[SCORING] Score: ${calculatedScore}/100 (${minosites})`);

  // Build partial result
  const partialResult: Record<string, unknown> = {
    osszpontszam: calculatedScore,
    minosites,
    szempontok,
    hiresLogo: rawScoring.hiresLogo,
    logoTipus: rawScoring.logotipus,
    testLevel: "detailed",
    createdAt: new Date().toISOString(),
    _timing: { scoring: elapsed },
  };

  if (scoringResult.sources && scoringResult.sources.length > 0) {
    partialResult.sources = scoringResult.sources;
  }

  // Save partial result to DB
  const updatePayload: Record<string, unknown> = {
    result: partialResult,
    status: "processing",
    test_level: "detailed",
  };

  if (!existingVisionDescription) {
    updatePayload.vision_description = visionDescription;
  }

  const { error: dbError } = await supabase
    .from("analyses")
    .update(updatePayload)
    .eq("id", analysisId);

  if (dbError) {
    console.error("[SCORING] DB error:", JSON.stringify(dbError));
    throw new Error("Nem sikerült menteni az elemzést");
  }

  console.log("[SCORING] Partial result saved");

  return new Response(
    JSON.stringify({
      success: true,
      step: "scoring",
      score: calculatedScore,
      elapsed: `${elapsed}s`,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Helper: scoring context kinyerése az existing result-ból
 */
function extractScoringContext(existingResult: Record<string, unknown>): Record<string, unknown> {
  const scoringContext: Record<string, unknown> = {
    osszpontszam: existingResult.osszpontszam,
    minosites: existingResult.minosites,
    logoTipus: existingResult.logoTipus,
    hiresLogo: existingResult.hiresLogo,
  };

  if (existingResult.szempontok && typeof existingResult.szempontok === "object") {
    const szempontokForContext: Record<string, unknown> = {};
    for (const key of SZEMPONT_ORDER) {
      const item = (existingResult.szempontok as Record<string, SzempontItem>)[key];
      if (item) {
        szempontokForContext[key] = {
          pont: item.pont,
          maxPont: item.maxPont,
          indoklas: item.indoklas,
        };
      }
    }
    scoringContext.szempontok = szempontokForContext;
  }

  return scoringContext;
}

/**
 * Helper: existing result lekérése DB-ből
 */
async function fetchExistingResult(analysisId: string, stepName: string): Promise<Record<string, unknown>> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from("analyses")
    .select("result")
    .eq("id", analysisId)
    .single();

  if (error) {
    console.error(`[${stepName}] Failed to fetch existing result:`, error);
    throw new Error("Nem sikerült lekérni az elemzést");
  }

  return (data?.result as Record<string, unknown>) || {};
}

/**
 * Step 2: Summary — CSAK összefoglaló (osszegzes, erossegek, fejlesztendo)
 * Könnyű KB-Extract hívás, max_sources=0.
 * Status marad 'processing' — a details lépés fogja completed-re állítani.
 */
async function runSummaryStep(
  analysisId: string,
  visionDescription: string,
  brief: string | null
): Promise<Response> {
  console.log("[SUMMARY] Starting KB-Extract summary...");

  const existingResult = await fetchExistingResult(analysisId, "SUMMARY");
  console.log("[SUMMARY] Existing result keys:", Object.keys(existingResult).length);

  const scoringContext = extractScoringContext(existingResult);
  console.log("[SUMMARY] Scoring context keys:", Object.keys(scoringContext).length);

  const summaryQuery = appendBrief(buildSummaryExtractQuery(scoringContext), brief);
  const startTime = Date.now();

  const summaryResult = await queryKBExtract<{ summary: { osszegzes: string; erossegek: string[]; fejlesztendo: string[] } }>(
    summaryQuery,
    visionDescription,
    KB_EXTRACT_SUMMARY_SCHEMA,
    "best_effort",
    { max_sources: 0, language: "hu" }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[SUMMARY] KB-Extract done in ${elapsed}s`);

  const rawSummary = summaryResult.data.summary;

  // Merge summary into existing result (status marad processing)
  const mergedResult: Record<string, unknown> = {
    ...existingResult,
    osszegzes: rawSummary?.osszegzes || "",
    erossegek: Array.isArray(rawSummary?.erossegek)
      ? rawSummary.erossegek.filter(isValidTextItem)
      : [],
    fejlesztendo: Array.isArray(rawSummary?.fejlesztendo)
      ? rawSummary.fejlesztendo.filter(isValidTextItem)
      : [],
  };

  const existingTiming = (existingResult._timing as Record<string, string>) || {};
  mergedResult._timing = { ...existingTiming, summary: elapsed };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { error: dbError } = await supabase
    .from("analyses")
    .update({ result: mergedResult, status: "processing" })
    .eq("id", analysisId);

  if (dbError) {
    console.error("[SUMMARY] DB error:", JSON.stringify(dbError));
    throw new Error("Nem sikerült menteni az elemzést");
  }

  console.log("[SUMMARY] Summary saved (status=processing, details next)");

  return new Response(
    JSON.stringify({ success: true, step: "summary", elapsed: `${elapsed}s` }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Step 3: Details — részletes elemzés (szinek, tipografia, vizualisNyelv)
 * Könnyű KB-Extract hívás, max_sources=0.
 * Ez állítja completed-re a status-t és küldi az email notificationt.
 */
async function runDetailsStep(
  analysisId: string,
  visionDescription: string,
  brief: string | null
): Promise<Response> {
  console.log("[DETAILS] Starting KB-Extract details...");

  const existingResult = await fetchExistingResult(analysisId, "DETAILS");
  console.log("[DETAILS] Existing result keys:", Object.keys(existingResult).length);

  // Karcsúsított scoring context — csak pontszámok, indoklás nélkül
  const slimScoringContext: Record<string, unknown> = {
    osszpontszam: existingResult.osszpontszam,
    minosites: existingResult.minosites,
    logoTipus: existingResult.logoTipus,
  };

  if (existingResult.szempontok && typeof existingResult.szempontok === "object") {
    const slimSzempontok: Record<string, unknown> = {};
    for (const key of SZEMPONT_ORDER) {
      const item = (existingResult.szempontok as Record<string, SzempontItem>)[key];
      if (item) {
        slimSzempontok[key] = { pont: item.pont, maxPont: item.maxPont };
      }
    }
    slimScoringContext.szempontok = slimSzempontok;
  }

  const detailsQuery = appendBrief(buildDetailsExtractQuery(slimScoringContext), brief);
  const startTime = Date.now();

  const detailsResult = await queryKBExtract<{ details: SummaryDetailsDataRaw["details"] }>(
    detailsQuery,
    visionDescription,
    KB_EXTRACT_DETAILS_SCHEMA,
    "best_effort",
    { max_sources: 0, language: "hu" }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[DETAILS] KB-Extract done in ${elapsed}s`);

  const rawDetails = detailsResult.data.details;

  // Merge details into existing result (javaslatok nélkül — suggestions stepben jönnek)
  const mergedResult: Record<string, unknown> = {
    ...existingResult,
    szinek: {
      harmonia: rawDetails?.szinek?.harmonia || "",
      pszichologia: rawDetails?.szinek?.pszichologia || "",
      technikai: rawDetails?.szinek?.technikai || "",
      javaslatok: [],
    },
    tipografia: {
      karakter: rawDetails?.tipografia?.karakter || "",
      olvashatosag: rawDetails?.tipografia?.olvashatosag || "",
      javaslatok: [],
    },
    vizualisNyelv: {
      formak: rawDetails?.vizualisNyelv?.formak || "",
      elemek: rawDetails?.vizualisNyelv?.elemek || "",
      stilusEgyseg: rawDetails?.vizualisNyelv?.stilusEgyseg || "",
      javaslatok: [],
    },
  };

  // Add timing
  const existingTiming = (existingResult._timing as Record<string, string>) || {};
  mergedResult._timing = { ...existingTiming, details: elapsed };

  // Add sources
  if (detailsResult.sources && detailsResult.sources.length > 0) {
    const existingSources = Array.isArray(existingResult.sources)
      ? existingResult.sources
      : [];
    mergedResult.sources = [...existingSources, ...detailsResult.sources];
  }

  // Save — status marad processing, completed csak az utolsó step (detail-suggestions) után
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { error: dbError } = await supabase
    .from("analyses")
    .update({
      result: mergedResult,
      status: "processing",
    })
    .eq("id", analysisId);

  if (dbError) {
    console.error("[DETAILS] DB error:", JSON.stringify(dbError));
    throw new Error("Nem sikerült menteni az elemzést");
  }

  console.log("[DETAILS] Result saved (processing, suggestions next)");

  return new Response(
    JSON.stringify({ success: true, step: "details", elapsed: `${elapsed}s` }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Step 5a: Suggestions-A — javaslatok az első 4 szemponthoz (generate-only, NINCS DB write).
 * Párhuzamosan fut suggestions-b és detail-suggestions-szel.
 */
async function runSuggestionsAStep(
  analysisId: string,
  visionDescription: string
): Promise<Response> {
  console.log("[SUGGESTIONS-A] Starting KB-Extract suggestions-a (4 szempont)...");

  const existingResult = await fetchExistingResult(analysisId, "SUGGESTIONS-A");

  // Build scoring context
  const scoringContext: Record<string, unknown> = {
    osszpontszam: existingResult.osszpontszam,
    minosites: existingResult.minosites,
  };

  if (existingResult.szempontok && typeof existingResult.szempontok === "object") {
    const szempontokForContext: Record<string, unknown> = {};
    for (const key of SZEMPONT_ORDER) {
      const item = (existingResult.szempontok as Record<string, SzempontItem>)[key];
      if (item) {
        szempontokForContext[key] = {
          pont: item.pont,
          maxPont: item.maxPont,
          indoklas: item.indoklas,
        };
      }
    }
    scoringContext.szempontok = szempontokForContext;
  }

  const query = buildSuggestionsAExtractQuery(scoringContext);
  const startTime = Date.now();

  const result = await queryKBExtract<{ javaslatok: Record<string, string[]> }>(
    query,
    visionDescription,
    KB_EXTRACT_SUGGESTIONS_A_SCHEMA,
    "best_effort",
    { max_sources: 0, language: "hu" }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[SUGGESTIONS-A] KB-Extract done in ${elapsed}s`);

  // Generate-only: visszaadjuk az adatot, NEM írunk DB-be
  return new Response(
    JSON.stringify({
      success: true,
      step: "suggestions-a",
      data: { javaslatok: result.data.javaslatok },
      elapsed: `${elapsed}s`,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Step 5b: Suggestions-B — javaslatok az utolsó 3 szemponthoz (generate-only, NINCS DB write).
 * Párhuzamosan fut suggestions-a és detail-suggestions-szel.
 */
async function runSuggestionsBStep(
  analysisId: string,
  visionDescription: string
): Promise<Response> {
  console.log("[SUGGESTIONS-B] Starting KB-Extract suggestions-b (3 szempont)...");

  const existingResult = await fetchExistingResult(analysisId, "SUGGESTIONS-B");

  // Build scoring context
  const scoringContext: Record<string, unknown> = {
    osszpontszam: existingResult.osszpontszam,
    minosites: existingResult.minosites,
  };

  if (existingResult.szempontok && typeof existingResult.szempontok === "object") {
    const szempontokForContext: Record<string, unknown> = {};
    for (const key of SZEMPONT_ORDER) {
      const item = (existingResult.szempontok as Record<string, SzempontItem>)[key];
      if (item) {
        szempontokForContext[key] = {
          pont: item.pont,
          maxPont: item.maxPont,
          indoklas: item.indoklas,
        };
      }
    }
    scoringContext.szempontok = szempontokForContext;
  }

  const query = buildSuggestionsBExtractQuery(scoringContext);
  const startTime = Date.now();

  const result = await queryKBExtract<{ javaslatok: Record<string, string[]> }>(
    query,
    visionDescription,
    KB_EXTRACT_SUGGESTIONS_B_SCHEMA,
    "best_effort",
    { max_sources: 0, language: "hu" }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[SUGGESTIONS-B] KB-Extract done in ${elapsed}s`);

  // Generate-only: visszaadjuk az adatot, NEM írunk DB-be
  return new Response(
    JSON.stringify({
      success: true,
      step: "suggestions-b",
      data: { javaslatok: result.data.javaslatok },
      elapsed: `${elapsed}s`,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Step 5c: Detail-suggestions — részletes javaslatok (szinek, tipografia, vizualisNyelv).
 * Generate-only: NINCS DB write, NINCS email. A finalize step menti el.
 * Párhuzamosan fut suggestions-a és suggestions-b-vel.
 */
async function runDetailSuggestionsStep(
  analysisId: string,
  visionDescription: string
): Promise<Response> {
  console.log("[DETAIL-SUGGESTIONS] Starting KB-Extract detail-suggestions...");

  const existingResult = await fetchExistingResult(analysisId, "DETAIL-SUGGESTIONS");

  // Slim scoring context
  const slimContext: Record<string, unknown> = {
    osszpontszam: existingResult.osszpontszam,
    minosites: existingResult.minosites,
    logoTipus: existingResult.logoTipus,
  };

  const query = buildDetailSuggestionsExtractQuery(slimContext);
  const startTime = Date.now();

  const result = await queryKBExtract<{
    szinek: string[];
    tipografia: string[];
    vizualisNyelv: string[];
  }>(
    query,
    visionDescription,
    KB_EXTRACT_DETAIL_SUGGESTIONS_SCHEMA,
    "best_effort",
    { max_sources: 0, language: "hu" }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[DETAIL-SUGGESTIONS] KB-Extract done in ${elapsed}s`);

  // Generate-only: visszaadjuk az adatot, NEM írunk DB-be
  return new Response(
    JSON.stringify({
      success: true,
      step: "detail-suggestions",
      data: {
        szinek: result.data.szinek,
        tipografia: result.data.tipografia,
        vizualisNyelv: result.data.vizualisNyelv,
      },
      elapsed: `${elapsed}s`,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Step 6: Finalize — merge all suggestions + DB write + completed + email.
 * A kliens küldi be az összegyűjtött javaslat-adatokat.
 * Egyetlen DB write, nincs race condition.
 */
async function runFinalizeStep(
  analysisId: string,
  suggestionsAData: Record<string, string[]> | null,
  suggestionsBData: Record<string, string[]> | null,
  detailSuggestionsData: { szinek?: string[]; tipografia?: string[]; vizualisNyelv?: string[] } | null
): Promise<Response> {
  console.log("[FINALIZE] Starting finalize — merging all suggestions...");

  const existingResult = await fetchExistingResult(analysisId, "FINALIZE");

  // Merge szempontonkénti javaslatok (A: 4 szempont + B: 3 szempont)
  if (existingResult.szempontok && typeof existingResult.szempontok === "object") {
    const szempontok = existingResult.szempontok as Record<string, SzempontItem>;
    const allSuggestions = { ...suggestionsAData, ...suggestionsBData };

    for (const key of SZEMPONT_ORDER) {
      if (szempontok[key] && Array.isArray(allSuggestions?.[key])) {
        szempontok[key].javaslatok = allSuggestions[key];
      }
    }
    existingResult.szempontok = szempontok;
    console.log("[FINALIZE] Merged szempontonkénti javaslatok (A+B)");
  }

  // Merge detail javaslatok (szinek/tipografia/vizualisNyelv)
  if (detailSuggestionsData) {
    const mergeInto = (sectionKey: string, javaslatok: string[] | undefined) => {
      if (Array.isArray(javaslatok) && javaslatok.length > 0) {
        const section = existingResult[sectionKey] as Record<string, unknown> | undefined;
        if (section && typeof section === "object") {
          section.javaslatok = javaslatok;
          existingResult[sectionKey] = section;
        }
      }
    };

    mergeInto("szinek", detailSuggestionsData.szinek);
    mergeInto("tipografia", detailSuggestionsData.tipografia);
    mergeInto("vizualisNyelv", detailSuggestionsData.vizualisNyelv);
    console.log("[FINALIZE] Merged detail javaslatok");
  }

  // Add timing
  const existingTiming = (existingResult._timing as Record<string, string>) || {};
  existingResult._timing = { ...existingTiming, finalize: new Date().toISOString() };

  // Single DB update: result + status='completed' + completed_at
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { error: dbError } = await supabase
    .from("analyses")
    .update({
      result: existingResult,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", analysisId);

  if (dbError) {
    console.error("[FINALIZE] DB error:", JSON.stringify(dbError));
    throw new Error("Nem sikerült menteni a végleges eredményt");
  }

  console.log("[FINALIZE] Result saved (completed!)");

  // Email notification callback (non-blocking)
  try {
    const appUrl = Deno.env.get("APP_URL") || "https://logolab.hu";
    const edgeFunctionSecret = Deno.env.get("EDGE_FUNCTION_SECRET");
    if (edgeFunctionSecret) {
      await fetch(`${appUrl}/api/email/analysis-notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${edgeFunctionSecret}`,
        },
        body: JSON.stringify({ analysisId, status: "completed" }),
      });
      console.log("[NOTIFY] Email callback sent (completed)");
    }
  } catch (notifyError) {
    console.error("[NOTIFY] Email callback failed:", notifyError);
  }

  return new Response(
    JSON.stringify({ success: true, step: "finalize" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let parsedAnalysisId: string | undefined;
  let parsedStep: string | undefined;

  try {
    const body = await req.json();
    const { analysisId, visionDescription, step, brief, suggestionsAData, suggestionsBData, detailSuggestionsData } = body as {
      analysisId?: string;
      visionDescription?: string;
      step?: "scoring" | "summary" | "details" | "suggestions-a" | "suggestions-b" | "detail-suggestions" | "finalize";
      brief?: string;
      suggestionsAData?: Record<string, string[]>;
      suggestionsBData?: Record<string, string[]>;
      detailSuggestionsData?: { szinek?: string[]; tipografia?: string[]; vizualisNyelv?: string[] };
    };
    parsedAnalysisId = analysisId;
    parsedStep = step;

    // Validate input
    if (!analysisId || !step) {
      return new Response(
        JSON.stringify({
          error: "analysisId és step kötelező",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (step === "scoring" && !visionDescription) {
      return new Response(
        JSON.stringify({
          error: "visionDescription kötelező a scoring lépéshez",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const validSteps = ["scoring", "summary", "details", "suggestions-a", "suggestions-b", "detail-suggestions", "finalize"];
    if (!validSteps.includes(step)) {
      return new Response(
        JSON.stringify({
          error: `step értéke: ${validSteps.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role key (bypass RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify analysis exists
    const { data: analysisData, error: fetchError } = await supabase
      .from("analyses")
      .select("brief, tier, vision_description")
      .eq("id", analysisId)
      .single();

    if (fetchError || !analysisData) {
      console.error("[PIPELINE] Analysis not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Elemzés nem található" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const effectiveBrief = brief || analysisData.brief || null;

    // visionDescription: paraméterből VAGY DB-ből (summary/suggestions resume esetén)
    const effectiveVisionDescription = visionDescription || analysisData.vision_description;

    if (!effectiveVisionDescription) {
      return new Response(
        JSON.stringify({
          error: "visionDescription nem található (sem paraméterben, sem DB-ben)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[PIPELINE] Step: ${step}, analysisId: ${analysisId}, visionDesc source: ${visionDescription ? 'param' : 'DB'}`);

    if (step === "scoring") {
      return await runScoringStep(
        supabase,
        analysisId,
        effectiveVisionDescription,
        effectiveBrief,
        analysisData.vision_description
      );
    } else if (step === "summary") {
      return await runSummaryStep(
        analysisId,
        effectiveVisionDescription,
        effectiveBrief
      );
    } else if (step === "details") {
      return await runDetailsStep(
        analysisId,
        effectiveVisionDescription,
        effectiveBrief
      );
    } else if (step === "suggestions-a") {
      return await runSuggestionsAStep(
        analysisId,
        effectiveVisionDescription
      );
    } else if (step === "suggestions-b") {
      return await runSuggestionsBStep(
        analysisId,
        effectiveVisionDescription
      );
    } else if (step === "detail-suggestions") {
      return await runDetailSuggestionsStep(
        analysisId,
        effectiveVisionDescription
      );
    } else {
      // finalize
      return await runFinalizeStep(
        analysisId,
        suggestionsAData || null,
        suggestionsBData || null,
        detailSuggestionsData || null
      );
    }
  } catch (error) {
    console.error("[PIPELINE] Error:", error);

    // Send failure notification — minden step critical
    if (parsedAnalysisId) {
      try {
        const appUrl = Deno.env.get("APP_URL") || "https://logolab.hu";
        const edgeFunctionSecret = Deno.env.get("EDGE_FUNCTION_SECRET");
        if (edgeFunctionSecret) {
          await fetch(`${appUrl}/api/email/analysis-notify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${edgeFunctionSecret}`,
            },
            body: JSON.stringify({
              analysisId: parsedAnalysisId,
              status: "failed",
              errorMessage: `[${parsedStep || 'unknown'}] ${error instanceof Error ? error.message : "Ismeretlen hiba"}`,
            }),
          });
          console.log(`[NOTIFY] Email callback sent (failed, step=${parsedStep})`);
        }
      } catch (notifyError) {
        console.error("[NOTIFY] Failure callback error:", notifyError);
      }
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Ismeretlen hiba",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Supabase Edge Function: analyze-pipeline
 *
 * KB-Extract scoring/summary pipeline — nincs Netlify 60s limit!
 * Supabase Edge Function timeout: Pro 150s, Team 400s.
 *
 * Lépések:
 *   step='scoring':  Scoring KB-Extract → partial result DB-be (status='processing')
 *   step='summary':  Summary KB-Extract → merge + status='completed'
 *
 * A kliens szekvenciálisan hívja: vision (Next.js) → scoring → summary → redirect
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

const szempontItemSchema = {
  type: "object",
  properties: {
    pont: { type: "integer" },
    maxPont: { type: "integer" },
    indoklas: { type: "string" },
    javaslatok: { type: "array", items: { type: "string" } },
  },
  required: ["pont", "maxPont", "indoklas", "javaslatok"],
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
            megkulonboztethetoseg: szempontItemSchema,
            egyszeruseg: szempontItemSchema,
            alkalmazhatosag: szempontItemSchema,
            emlekezetesseg: szempontItemSchema,
            idotallosag: szempontItemSchema,
            univerzalitas: szempontItemSchema,
            lathatosag: szempontItemSchema,
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

const KB_EXTRACT_SUMMARY_DETAILS_SCHEMA = {
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
    details: {
      type: "object",
      properties: {
        szinek: {
          type: "object",
          properties: {
            harmonia: { type: "string" },
            pszichologia: { type: "string" },
            technikai: { type: "string" },
            javaslatok: { type: "array", items: { type: "string" } },
          },
          required: ["harmonia", "pszichologia", "technikai", "javaslatok"],
        },
        tipografia: {
          type: "object",
          properties: {
            karakter: { type: "string" },
            olvashatosag: { type: "string" },
            javaslatok: { type: "array", items: { type: "string" } },
          },
          required: ["karakter", "olvashatosag", "javaslatok"],
        },
        vizualisNyelv: {
          type: "object",
          properties: {
            formak: { type: "string" },
            elemek: { type: "string" },
            stilusEgyseg: { type: "string" },
            javaslatok: { type: "array", items: { type: "string" } },
          },
          required: ["formak", "elemek", "stilusEgyseg", "javaslatok"],
        },
      },
      required: ["szinek", "tipografia", "vizualisNyelv"],
    },
  },
  required: ["summary", "details"],
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

KRITIKUS: A szempontok tömbben MIND A 7 szempont KÖTELEZŐ! Ne hagyd ki egyiket sem: megkulonboztethetoseg, egyszeruseg, alkalmazhatosag, emlekezetesseg, idotallosag, univerzalitas, lathatosag.`;
}

function buildSummaryDetailsExtractQuery(): string {
  return `${PETI_STYLE_BLOCK}

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

## RÉSZLETES ELEMZÉS

### SZÍNPALETTA
- Harmónia: A színek hogyan működnek együtt?
- Pszichológia: Milyen érzéseket közvetítenek?
- Technikai: RGB/CMYK kompatibilitás
- Javaslatok: 2 konkrét javaslat

### TIPOGRÁFIA
- Karakter: A betűtípus személyisége
- Olvashatóság: Különböző méretekben hogyan működik?
- Javaslatok: 2 konkrét javaslat

### VIZUÁLIS NYELV
- Formák: Milyen formavilágot használ?
- Elemek: Az ikon/szimbólum erőssége
- Stílusegység: Az elemek összhangja
- Javaslatok: 2 konkrét javaslat

---

[Feladat]
A logó leírása az image_description mezőben található. Készítsd el az összefoglalót (osszegzes, erossegek, fejlesztendo) és a részletes elemzést (szinek, tipografia, vizualisNyelv)!

FONTOS: Az összefoglaló (osszegzes) legyen Peti mentori stílusú – közvetlen, őszinte, barátságos hangú, mintha személyesen mondaná el a véleményét.`;
}

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
  const apiKey = Deno.env.get("BRANDGUIDE_API_KEY");
  const endpoint =
    Deno.env.get("BRANDGUIDE_ENDPOINT") ||
    "https://udqiowvplrkdrviahylk.supabase.co/functions/v1/kb-extract";

  if (!apiKey) {
    throw new Error("BRANDGUIDE_API_KEY nincs beállítva");
  }

  console.log("[KB-EXTRACT] Query length:", query.length);
  console.log("[KB-EXTRACT] Image description length:", imageDescription.length);
  console.log("[KB-EXTRACT] Mode:", mode);

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

    console.log("[KB-EXTRACT] Response status:", response.status);

    if (!response.ok) {
      const error = responseData.error as {
        code?: string;
        message?: string;
      };
      console.error("[KB-EXTRACT] Error:", JSON.stringify(error));

      if (error?.code === "QUOTA_EXCEEDED") {
        throw new Error(
          "A havi kvóta elfogyott. Kérjük próbáld újra a következő hónapban."
        );
      }
      throw new Error(error?.message || "brandguideAI hiba");
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
      throw new Error(
        "Az elemzés időtúllépés miatt megszakadt. Kérlek próbáld újra."
      );
    }
    throw error;
  }
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
    { max_sources: 5, language: "hu" }
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

async function runSummaryStep(
  analysisId: string,
  visionDescription: string,
  brief: string | null
): Promise<Response> {
  console.log("[SUMMARY] Starting KB-Extract summary+details...");

  // Fetch existing scoring result FIRST (while connection is fresh, before long KB-Extract)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabasePre = createClient(supabaseUrl, supabaseServiceKey);
  const { data: preData, error: preFetchError } = await supabasePre
    .from("analyses")
    .select("result")
    .eq("id", analysisId)
    .single();

  if (preFetchError) {
    console.error("[SUMMARY] Failed to pre-fetch existing result:", preFetchError);
    throw new Error("Nem sikerült lekérni az elemzést");
  }

  const existingResult = (preData?.result as Record<string, unknown>) || {};
  console.log("[SUMMARY] Pre-fetched existing result keys:", Object.keys(existingResult).length);

  // Now run KB-Extract (long call, ~48s)
  const summaryQuery = appendBrief(buildSummaryDetailsExtractQuery(), brief);
  const startTime = Date.now();

  const summaryResult = await queryKBExtract<SummaryDetailsDataRaw>(
    summaryQuery,
    visionDescription,
    KB_EXTRACT_SUMMARY_DETAILS_SCHEMA,
    "best_effort",
    { max_sources: 5, language: "hu" }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[SUMMARY] KB-Extract done in ${elapsed}s`);

  const rawSummary = summaryResult.data.summary;
  const rawDetails = summaryResult.data.details;

  // Merge summary+details into existing scoring result
  const mergedResult: Record<string, unknown> = {
    ...existingResult,
    osszegzes: rawSummary?.osszegzes || "",
    erossegek: Array.isArray(rawSummary?.erossegek)
      ? rawSummary.erossegek.filter(isValidTextItem)
      : [],
    fejlesztendo: Array.isArray(rawSummary?.fejlesztendo)
      ? rawSummary.fejlesztendo.filter(isValidTextItem)
      : [],
    szinek: {
      harmonia: rawDetails?.szinek?.harmonia || "",
      pszichologia: rawDetails?.szinek?.pszichologia || "",
      technikai: rawDetails?.szinek?.technikai || "",
      javaslatok: Array.isArray(rawDetails?.szinek?.javaslatok)
        ? rawDetails.szinek.javaslatok
        : [],
    },
    tipografia: {
      karakter: rawDetails?.tipografia?.karakter || "",
      olvashatosag: rawDetails?.tipografia?.olvashatosag || "",
      javaslatok: Array.isArray(rawDetails?.tipografia?.javaslatok)
        ? rawDetails.tipografia.javaslatok
        : [],
    },
    vizualisNyelv: {
      formak: rawDetails?.vizualisNyelv?.formak || "",
      elemek: rawDetails?.vizualisNyelv?.elemek || "",
      stilusEgyseg: rawDetails?.vizualisNyelv?.stilusEgyseg || "",
      javaslatok: Array.isArray(rawDetails?.vizualisNyelv?.javaslatok)
        ? rawDetails.vizualisNyelv.javaslatok
        : [],
    },
  };

  // Add summary sources
  if (summaryResult.sources && summaryResult.sources.length > 0) {
    const existingSources = Array.isArray(existingResult.sources)
      ? existingResult.sources
      : [];
    mergedResult.sources = [...existingSources, ...summaryResult.sources];
  }

  // Save final result to DB (fresh client after long KB-Extract)
  const supabasePost = createClient(supabaseUrl, supabaseServiceKey);
  const { error: dbError } = await supabasePost
    .from("analyses")
    .update({
      result: mergedResult,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", analysisId);

  if (dbError) {
    console.error("[SUMMARY] DB error:", JSON.stringify(dbError));
    throw new Error("Nem sikerült menteni az elemzést");
  }

  console.log("[SUMMARY] Final result saved");

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
    // Non-critical — don't fail the analysis because of email
  }

  return new Response(
    JSON.stringify({
      success: true,
      step: "summary",
      elapsed: `${elapsed}s`,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
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

  try {
    const body = await req.json();
    const { analysisId, visionDescription, step, brief } = body as {
      analysisId?: string;
      visionDescription?: string;
      step?: "scoring" | "summary";
      brief?: string;
    };
    parsedAnalysisId = analysisId;

    // Validate input
    if (!analysisId || !visionDescription || !step) {
      return new Response(
        JSON.stringify({
          error: "analysisId, visionDescription és step kötelező",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (step !== "scoring" && step !== "summary") {
      return new Response(
        JSON.stringify({
          error: 'step értéke "scoring" vagy "summary" lehet',
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

    console.log(`[PIPELINE] Step: ${step}, analysisId: ${analysisId}`);

    if (step === "scoring") {
      return await runScoringStep(
        supabase,
        analysisId,
        visionDescription,
        effectiveBrief,
        analysisData.vision_description
      );
    } else {
      return await runSummaryStep(
        analysisId,
        visionDescription,
        effectiveBrief
      );
    }
  } catch (error) {
    console.error("[PIPELINE] Error:", error);

    // Send failure notification (non-blocking)
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
              errorMessage: error instanceof Error ? error.message : "Ismeretlen hiba",
            }),
          });
          console.log("[NOTIFY] Email callback sent (failed)");
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

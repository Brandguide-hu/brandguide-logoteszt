/**
 * Netlify Background Function - Logo Analysis (Scoring + Summary + Save)
 *
 * Background function = 15 perc limit (vs 60s szinkron).
 * A "-background" suffix a fájlnévben teszi background function-né.
 *
 * Flow:
 * 1. Next.js /api/analyze/trigger POST-olja ide a visionDescription + logo + analysisId-t
 * 2. Ez a function futtatja a scoring + summary KB-Extract hívásokat
 * 3. Eredmény mentése Supabase-be
 * 4. A kliens pollozza a DB-t
 */

import type { Context } from "@netlify/functions";

// ============================================================================
// CONFIG
// ============================================================================

const BRANDGUIDE_ENDPOINT = process.env.BRANDGUIDE_ENDPOINT || 'https://udqiowvplrkdrviahylk.supabase.co/functions/v1/kb-extract';
const BRANDGUIDE_API_KEY = process.env.BRANDGUIDE_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ============================================================================
// TYPES
// ============================================================================

interface SzempontItem {
  pont: number;
  maxPont: number;
  indoklas: string;
  javaslatok: string[];
}

interface ScoringRaw {
  osszpontszam: number;
  logotipus: string;
  hiresLogo: {
    ismert: boolean;
    marka: string;
    tervezo: string;
    kontextus: string;
  };
  megkulonboztethetoseg: SzempontItem;
  egyszeruseg: SzempontItem;
  alkalmazhatosag: SzempontItem;
  emlekezetesseg: SzempontItem;
  idotallosag: SzempontItem;
  univerzalitas: SzempontItem;
  lathatosag: SzempontItem;
}

interface KBExtractSource {
  source_id: string;
  title: string;
  type: string;
  page?: number;
  snippet?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const SZEMPONT_KEYS = [
  'megkulonboztethetoseg', 'egyszeruseg', 'alkalmazhatosag',
  'emlekezetesseg', 'idotallosag', 'univerzalitas', 'lathatosag'
] as const;

const MAX_VALUES: Record<string, number> = {
  megkulonboztethetoseg: 20,
  egyszeruseg: 18,
  alkalmazhatosag: 15,
  emlekezetesseg: 15,
  idotallosag: 12,
  univerzalitas: 10,
  lathatosag: 10,
};

function getRatingFromScore(score: number): string {
  if (score >= 90) return 'Kiváló';
  if (score >= 75) return 'Jó';
  if (score >= 55) return 'Közepes';
  if (score >= 35) return 'Gyenge';
  return 'Kritikus';
}

async function kbExtract(query: string, imageDescription: string, schema: object, options?: { max_sources?: number }) {
  const response = await fetch(BRANDGUIDE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BRANDGUIDE_API_KEY,
      'User-Agent': 'Mozilla/5.0',
    },
    body: JSON.stringify({
      query,
      image_description: imageDescription,
      output: { schema, mode: 'best_effort' },
      options: { max_sources: options?.max_sources ?? 5, language: 'hu' },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`KB-Extract hiba: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

async function supabaseUpdate(analysisId: string, result: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/analyses?id=eq.${analysisId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      result,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Supabase update hiba: ${response.status} - ${errorText}`);
  }
}

async function supabaseInsert(result: Record<string, unknown>, logo: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/analyses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      result,
      logo_base64: logo,
      test_level: 'detailed',
      visibility: 'public',
      status: 'completed',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Supabase insert hiba: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data[0]?.id;
}

// ============================================================================
// SCORING SCHEMA (inline — nem importálhatjuk a Next.js lib-ből)
// ============================================================================

const KB_EXTRACT_SCORING_SCHEMA = {
  type: "object",
  properties: {
    scoring: {
      type: "object",
      properties: {
        osszpontszam: { type: "number" },
        logotipus: { type: "string", enum: ["klasszikus_logo", "kampany_badge", "illusztracio_jellegu"] },
        hiresLogo: {
          type: "object",
          properties: {
            ismert: { type: "boolean" },
            marka: { type: "string" },
            tervezo: { type: "string" },
            kontextus: { type: "string" }
          },
          required: ["ismert", "marka", "tervezo", "kontextus"]
        },
        megkulonboztethetoseg: { type: "object", properties: { pont: { type: "number" }, maxPont: { type: "number" }, indoklas: { type: "string" }, javaslatok: { type: "array", items: { type: "string" } } }, required: ["pont", "maxPont", "indoklas", "javaslatok"] },
        egyszeruseg: { type: "object", properties: { pont: { type: "number" }, maxPont: { type: "number" }, indoklas: { type: "string" }, javaslatok: { type: "array", items: { type: "string" } } }, required: ["pont", "maxPont", "indoklas", "javaslatok"] },
        alkalmazhatosag: { type: "object", properties: { pont: { type: "number" }, maxPont: { type: "number" }, indoklas: { type: "string" }, javaslatok: { type: "array", items: { type: "string" } } }, required: ["pont", "maxPont", "indoklas", "javaslatok"] },
        emlekezetesseg: { type: "object", properties: { pont: { type: "number" }, maxPont: { type: "number" }, indoklas: { type: "string" }, javaslatok: { type: "array", items: { type: "string" } } }, required: ["pont", "maxPont", "indoklas", "javaslatok"] },
        idotallosag: { type: "object", properties: { pont: { type: "number" }, maxPont: { type: "number" }, indoklas: { type: "string" }, javaslatok: { type: "array", items: { type: "string" } } }, required: ["pont", "maxPont", "indoklas", "javaslatok"] },
        univerzalitas: { type: "object", properties: { pont: { type: "number" }, maxPont: { type: "number" }, indoklas: { type: "string" }, javaslatok: { type: "array", items: { type: "string" } } }, required: ["pont", "maxPont", "indoklas", "javaslatok"] },
        lathatosag: { type: "object", properties: { pont: { type: "number" }, maxPont: { type: "number" }, indoklas: { type: "string" }, javaslatok: { type: "array", items: { type: "string" } } }, required: ["pont", "maxPont", "indoklas", "javaslatok"] }
      },
      required: ["osszpontszam", "logotipus", "hiresLogo", "megkulonboztethetoseg", "egyszeruseg", "alkalmazhatosag", "emlekezetesseg", "idotallosag", "univerzalitas", "lathatosag"]
    }
  },
  required: ["scoring"]
};

const KB_EXTRACT_SUMMARY_DETAILS_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "object",
      properties: {
        osszegzes: { type: "string" },
        erossegek: { type: "array", items: { type: "string" } },
        fejlesztendo: { type: "array", items: { type: "string" } }
      },
      required: ["osszegzes", "erossegek", "fejlesztendo"]
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
            javaslatok: { type: "array", items: { type: "string" } }
          },
          required: ["harmonia", "pszichologia", "technikai", "javaslatok"]
        },
        tipografia: {
          type: "object",
          properties: {
            karakter: { type: "string" },
            olvashatosag: { type: "string" },
            javaslatok: { type: "array", items: { type: "string" } }
          },
          required: ["karakter", "olvashatosag", "javaslatok"]
        },
        vizualisNyelv: {
          type: "object",
          properties: {
            formak: { type: "string" },
            elemek: { type: "string" },
            stilusEgyseg: { type: "string" },
            javaslatok: { type: "array", items: { type: "string" } }
          },
          required: ["formak", "elemek", "stilusEgyseg", "javaslatok"]
        }
      },
      required: ["szinek", "tipografia", "vizualisNyelv"]
    }
  },
  required: ["summary", "details"]
};

// ============================================================================
// QUERIES (inline — a prompts-v2.ts-ből)
// ============================================================================

function buildScoringQuery(): string {
  return `Értékeld a logót az alábbi 7 szempont szerint. Minden szemponthoz adj pontszámot, indoklást és javaslatokat.

SZEMPONTOK (zárójelben a maximális pont):
1. Megkülönböztethetőség (max 20 pont) – Mennyire egyedi és felismerhető?
2. Egyszerűség (max 18 pont) – Mennyire letisztult, könnyen megérthető?
3. Alkalmazhatóság (max 15 pont) – Működik-e különböző méretekben és háttéren?
4. Emlékezetesség (max 15 pont) – Mennyire marad meg a fejben?
5. Időtállóság (max 12 pont) – Mennyire időtálló a dizájn?
6. Univerzalitás (max 10 pont) – Működik-e különböző kultúrákban és kontextusokban?
7. Láthatóság (max 10 pont) – Mennyire olvasható és látható különböző körülmények között?

Azonosítsd a logó típusát: klasszikus_logo, kampany_badge, vagy illusztracio_jellegu.
Ha híres/ismert logóról van szó, add meg a márkát, tervezőt és kontextust.

FONTOS: Az összpontszám a 7 szempont pontjainak összege legyen (max 100).`;
}

function buildSummaryQuery(): string {
  return `Készíts részletes elemzést a logóról az alábbi szempontok alapján:

1. ÖSSZEGZÉS: Írj egy átfogó, 3-5 mondatos értékelést a logóról.
2. ERŐSSÉGEK: Sorold fel a logó 3-5 legfontosabb erősségét.
3. FEJLESZTENDŐ: Sorold fel a 3-5 legfontosabb fejlesztési javaslatot.

4. SZÍNEK:
   - Harmónia: A színek összhangja és egyensúlya
   - Pszichológia: A színek által keltett érzelmek és asszociációk
   - Technikai: Színkontraszt, nyomtathatóság, digitális megjelenés
   - Javaslatok: Színekkel kapcsolatos konkrét javaslatok

5. TIPOGRÁFIA:
   - Karakter: A betűtípus jellege és illeszkedése a márkához
   - Olvashatóság: Különböző méretekben és kontextusokban
   - Javaslatok: Tipográfiával kapcsolatos konkrét javaslatok

6. VIZUÁLIS NYELV:
   - Formák: Geometriai elemek, vonalvezetés
   - Elemek: Ikonok, szimbólumok, grafikai elemek
   - Stílusegység: Az elemek koherenciája
   - Javaslatok: Vizuális nyelvvel kapcsolatos konkrét javaslatok`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async (request: Request, context: Context) => {
  console.log('[BG-ANALYZE] Background function started');

  try {
    const body = await request.json();
    const { visionDescription, logo, analysisId } = body as {
      visionDescription: string;
      logo: string;
      analysisId?: string;
    };

    if (!visionDescription) {
      console.error('[BG-ANALYZE] Missing visionDescription');
      return;
    }

    console.log('[BG-ANALYZE] visionDescription length:', visionDescription.length);
    console.log('[BG-ANALYZE] analysisId:', analysisId || 'NEW');

    // Státusz frissítése processing-re
    if (analysisId) {
      await fetch(`${SUPABASE_URL}/rest/v1/analyses?id=eq.${analysisId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ status: 'processing' }),
      });
      console.log('[BG-ANALYZE] Status set to processing');
    }

    // Párhuzamos KB-Extract hívások: scoring + summary
    console.log('[BG-ANALYZE] Starting parallel KB-Extract calls...');
    const startTime = Date.now();

    const [scoringResult, summaryResult] = await Promise.all([
      kbExtract(buildScoringQuery(), visionDescription, KB_EXTRACT_SCORING_SCHEMA, { max_sources: 5 }),
      kbExtract(buildSummaryQuery(), visionDescription, KB_EXTRACT_SUMMARY_DETAILS_SCHEMA, { max_sources: 5 }),
    ]);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[BG-ANALYZE] KB-Extract calls done in ${elapsed}s`);

    const rawScoring: ScoringRaw = scoringResult.data.scoring;
    const rawSummary = summaryResult.data.summary;
    const rawDetails = summaryResult.data.details;
    const sources: KBExtractSource[] = [
      ...(scoringResult.sources || []),
      ...(summaryResult.sources || []),
    ];

    // Scoring feldolgozás
    const szempontok: Record<string, any> = {};
    for (const key of SZEMPONT_KEYS) {
      const item = rawScoring[key];
      if (item) {
        const maxPont = MAX_VALUES[key] || 10;
        szempontok[key] = {
          pont: Math.min(Math.max(0, item.pont), maxPont),
          maxPont,
          indoklas: item.indoklas || '',
          javaslatok: Array.isArray(item.javaslatok) ? item.javaslatok : [],
        };
      }
    }

    const missingKeys = SZEMPONT_KEYS.filter(key => !szempontok[key]);
    if (missingKeys.length > 0) {
      throw new Error(`Hiányos elemzés: ${missingKeys.join(', ')} hiányzik`);
    }

    const osszpontszam = SZEMPONT_KEYS.reduce((sum, key) => sum + (szempontok[key]?.pont || 0), 0);
    const minosites = getRatingFromScore(osszpontszam);

    console.log(`[BG-ANALYZE] Score: ${osszpontszam}/100 (${minosites})`);

    // Result összeállítása
    const result: Record<string, unknown> = {
      id: analysisId || '',
      osszpontszam,
      minosites,
      szempontok,
      osszegzes: rawSummary?.osszegzes || '',
      erossegek: Array.isArray(rawSummary?.erossegek) ? rawSummary.erossegek.filter((e: string) => e?.length > 0) : [],
      fejlesztendo: Array.isArray(rawSummary?.fejlesztendo) ? rawSummary.fejlesztendo.filter((f: string) => f?.length > 0) : [],
      szinek: {
        harmonia: rawDetails?.szinek?.harmonia || '',
        pszichologia: rawDetails?.szinek?.pszichologia || '',
        technikai: rawDetails?.szinek?.technikai || '',
        javaslatok: Array.isArray(rawDetails?.szinek?.javaslatok) ? rawDetails.szinek.javaslatok : [],
      },
      tipografia: {
        karakter: rawDetails?.tipografia?.karakter || '',
        olvashatosag: rawDetails?.tipografia?.olvashatosag || '',
        javaslatok: Array.isArray(rawDetails?.tipografia?.javaslatok) ? rawDetails.tipografia.javaslatok : [],
      },
      vizualisNyelv: {
        formak: rawDetails?.vizualisNyelv?.formak || '',
        elemek: rawDetails?.vizualisNyelv?.elemek || '',
        stilusEgyseg: rawDetails?.vizualisNyelv?.stilusEgyseg || '',
        javaslatok: Array.isArray(rawDetails?.vizualisNyelv?.javaslatok) ? rawDetails.vizualisNyelv.javaslatok : [],
      },
      createdAt: new Date().toISOString(),
      testLevel: 'detailed',
      hiresLogo: rawScoring.hiresLogo,
      logoTipus: rawScoring.logotipus,
    };

    if (sources.length > 0) {
      result.sources = sources;
    }

    // DB mentés
    if (analysisId) {
      await supabaseUpdate(analysisId, result);
      console.log(`[BG-ANALYZE] Updated analysis ${analysisId}`);
    } else {
      const newId = await supabaseInsert(result, logo);
      console.log(`[BG-ANALYZE] Inserted new analysis ${newId}`);
    }

    console.log('[BG-ANALYZE] Done!');
  } catch (error) {
    console.error('[BG-ANALYZE] Fatal error:', error);

    // Ha van analysisId, mentjük a hibát
    try {
      const body = await request.clone().json().catch(() => ({}));
      const analysisId = (body as any)?.analysisId;
      if (analysisId) {
        await fetch(`${SUPABASE_URL}/rest/v1/analyses?id=eq.${analysisId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Ismeretlen hiba',
          }),
        });
      }
    } catch { /* ignore cleanup errors */ }
  }
};

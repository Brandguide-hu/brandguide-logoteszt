/**
 * Logo Analyzer - Step 2: KB-Extract + Save
 *
 * kb-extract API hívás structured output-tal (scoring + summary + details),
 * majd Supabase mentés. Plain JSON response (nem SSE).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { AnalysisResult, ColorAnalysis, TypographyAnalysis, VisualLanguageAnalysis, CriteriaScore } from '@/types';
import {
  queryKBExtract,
  BrandguideAPIError,
  KBExtractSource,
  ERROR_MESSAGES,
} from '@/lib/brandguide-api';
import { buildFullAnalysisQuery, KB_EXTRACT_FULL_SCHEMA, getRatingFromScore } from '@/lib/prompts-v2';

// ============================================================================
// TYPES
// ============================================================================

interface KBExtractSzempontItem {
  nev: string;
  pont: number;
  maxPont: number;
  indoklas: string;
  javaslatok: string[];
}

interface KBExtractAnalysisDataRaw {
  scoring: {
    osszpontszam: number;
    logotipus: 'klasszikus_logo' | 'kampany_badge' | 'illusztracio_jellegu';
    hiresLogo: {
      ismert: boolean;
      marka: string;
      tervezo: string;
      kontextus: string;
    };
    szempontok: KBExtractSzempontItem[];
  };
  summary: {
    osszegzes: string;
    erossegek: string[];
    fejlesztendo: string[];
  };
  details: {
    szinek: ColorAnalysis;
    tipografia: TypographyAnalysis;
    vizualisNyelv: VisualLanguageAnalysis;
  };
}

interface SzempontokMap {
  megkulonboztethetoseg: CriteriaScore;
  egyszeruseg: CriteriaScore;
  alkalmazhatosag: CriteriaScore;
  emlekezetesseg: CriteriaScore;
  idotallosag: CriteriaScore;
  univerzalitas: CriteriaScore;
  lathatosag: CriteriaScore;
}

// ============================================================================
// HELPERS
// ============================================================================

const SZEMPONT_ORDER: (keyof SzempontokMap)[] = [
  'megkulonboztethetoseg', 'egyszeruseg', 'alkalmazhatosag',
  'emlekezetesseg', 'idotallosag', 'univerzalitas', 'lathatosag'
];

const MAX_VALUES: Record<string, number> = {
  megkulonboztethetoseg: 20,
  egyszeruseg: 18,
  alkalmazhatosag: 15,
  emlekezetesseg: 15,
  idotallosag: 12,
  univerzalitas: 10,
  lathatosag: 10,
};

function normalizeSzempontName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

const SZEMPONT_ALIASES: Record<string, keyof SzempontokMap> = {};
for (const key of SZEMPONT_ORDER) {
  SZEMPONT_ALIASES[key] = key;
  SZEMPONT_ALIASES[key.slice(0, 6)] = key;
}
SZEMPONT_ALIASES['idotallo'] = 'idotallosag';

function resolveKey(nev: string): keyof SzempontokMap | null {
  const normalized = normalizeSzempontName(nev);
  if (SZEMPONT_ALIASES[normalized]) return SZEMPONT_ALIASES[normalized];
  const prefix = normalized.slice(0, 6);
  if (SZEMPONT_ALIASES[prefix]) return SZEMPONT_ALIASES[prefix];
  for (const key of SZEMPONT_ORDER) {
    if (normalized.startsWith(key.slice(0, 5))) return key;
  }
  return null;
}

function szempontokArrayToMap(items: KBExtractSzempontItem[]): SzempontokMap {
  const map = {} as SzempontokMap;

  for (const item of items) {
    const key = resolveKey(item.nev);
    if (key && !map[key]) {
      map[key] = {
        pont: item.pont,
        maxPont: item.maxPont,
        indoklas: item.indoklas,
        javaslatok: Array.isArray(item.javaslatok) ? item.javaslatok : [],
      };
    } else if (!key) {
      console.warn(`[VALIDATE] Unknown szempont: "${item.nev}" (${normalizeSzempontName(item.nev)})`);
    }
  }

  for (let i = 0; i < SZEMPONT_ORDER.length; i++) {
    const key = SZEMPONT_ORDER[i];
    if (!map[key] && items[i]) {
      console.log(`[VALIDATE] Positional fallback for ${key} (got: "${items[i].nev}")`);
      map[key] = {
        pont: items[i].pont,
        maxPont: items[i].maxPont,
        indoklas: items[i].indoklas,
        javaslatok: Array.isArray(items[i].javaslatok) ? items[i].javaslatok : [],
      };
    }
  }

  return map;
}

function calculateTotalScore(szempontok: SzempontokMap): number {
  return SZEMPONT_ORDER.reduce((sum, key) => sum + (szempontok[key]?.pont || 0), 0);
}

function clampSzempontok(szempontok: SzempontokMap): SzempontokMap {
  const clamped = { ...szempontok };
  for (const [key, maxPont] of Object.entries(MAX_VALUES)) {
    const k = key as keyof SzempontokMap;
    if (clamped[k]) {
      const originalPont = clamped[k].pont;
      clamped[k] = {
        ...clamped[k],
        pont: Math.min(Math.max(0, clamped[k].pont), maxPont),
        maxPont,
        javaslatok: Array.isArray(clamped[k].javaslatok) ? clamped[k].javaslatok : [],
      };
      if (originalPont !== clamped[k].pont) {
        console.log(`[VALIDATE] Clamped ${key}: ${originalPont} -> ${clamped[k].pont}`);
      }
    }
  }
  return clamped;
}

// ============================================================================
// MAIN HANDLER - Plain JSON (no SSE streaming)
// ============================================================================

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { visionDescription, logo } = body as {
    visionDescription: string;
    logo: string;
  };

  if (!visionDescription) {
    return NextResponse.json({ error: 'Vision leírás megadása kötelező' }, { status: 400 });
  }

  if (!logo) {
    return NextResponse.json({ error: 'Logó megadása kötelező' }, { status: 400 });
  }

  try {
    // ========================================
    // KB-EXTRACT: Scoring + Summary + Details
    // ========================================
    const analysisQuery = buildFullAnalysisQuery();
    console.log('[EXTRACT] Query length:', analysisQuery.length);

    const kbResponse = await queryKBExtract<KBExtractAnalysisDataRaw>(
      analysisQuery,
      visionDescription,
      KB_EXTRACT_FULL_SCHEMA,
      'best_effort',
      { max_sources: 5, language: 'hu' }
    );

    const rawData = kbResponse.data;
    const sources = kbResponse.sources || [];
    const szempontokMap = szempontokArrayToMap(rawData.scoring.szempontok);

    console.log('[EXTRACT] Tokens:', kbResponse.meta?.tokens_used);
    console.log('[EXTRACT] Szempontok:', rawData.scoring.szempontok?.length);

    // Check for missing szempontok
    const missingKeys = SZEMPONT_ORDER.filter(key => !szempontokMap[key]);
    if (missingKeys.length > 0) {
      console.error(`[EXTRACT] Missing: ${missingKeys.join(', ')}`);
      console.error(`[EXTRACT] Raw names: ${rawData.scoring.szempontok?.map(s => s.nev).join(', ')}`);
      return NextResponse.json(
        { error: `Hiányos elemzés: ${missingKeys.join(', ')} hiányzik. Kérlek próbáld újra.` },
        { status: 500 }
      );
    }

    // ========================================
    // VALIDATION + BUILD RESULT
    // ========================================
    const clampedSzempontok = clampSzempontok(szempontokMap);
    const osszpontszam = calculateTotalScore(clampedSzempontok);
    const minosites = getRatingFromScore(osszpontszam);

    const result: AnalysisResult & {
      sources?: KBExtractSource[];
      hiresLogo?: KBExtractAnalysisDataRaw['scoring']['hiresLogo'];
      logoTipus?: string;
    } = {
      id: '',
      osszpontszam,
      minosites,
      szempontok: clampedSzempontok,
      osszegzes: rawData.summary.osszegzes || '',
      erossegek: Array.isArray(rawData.summary.erossegek) ? rawData.summary.erossegek.filter(e => e && e.length > 0) : [],
      fejlesztendo: Array.isArray(rawData.summary.fejlesztendo) ? rawData.summary.fejlesztendo.filter(f => f && f.length > 0) : [],
      szinek: {
        harmonia: rawData.details.szinek?.harmonia || '',
        pszichologia: rawData.details.szinek?.pszichologia || '',
        technikai: rawData.details.szinek?.technikai || '',
        javaslatok: Array.isArray(rawData.details.szinek?.javaslatok) ? rawData.details.szinek.javaslatok : [],
      },
      tipografia: {
        karakter: rawData.details.tipografia?.karakter || '',
        olvashatosag: rawData.details.tipografia?.olvashatosag || '',
        javaslatok: Array.isArray(rawData.details.tipografia?.javaslatok) ? rawData.details.tipografia.javaslatok : [],
      },
      vizualisNyelv: {
        formak: rawData.details.vizualisNyelv?.formak || '',
        elemek: rawData.details.vizualisNyelv?.elemek || '',
        stilusEgyseg: rawData.details.vizualisNyelv?.stilusEgyseg || '',
        javaslatok: Array.isArray(rawData.details.vizualisNyelv?.javaslatok) ? rawData.details.vizualisNyelv.javaslatok : [],
      },
      createdAt: new Date().toISOString(),
      testLevel: 'detailed',
      hiresLogo: rawData.scoring.hiresLogo,
      logoTipus: rawData.scoring.logotipus,
    };

    if (sources.length > 0) {
      result.sources = sources;
    }

    // ========================================
    // SAVE TO SUPABASE
    // ========================================
    const { data: insertedData, error: dbError } = await getSupabaseAdmin()
      .from('analyses')
      .insert({
        result: result as unknown as Record<string, unknown>,
        logo_base64: logo,
        test_level: 'detailed',
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('[EXTRACT] DB error:', JSON.stringify(dbError));
      return NextResponse.json({ error: ERROR_MESSAGES.DB_SAVE_ERROR }, { status: 500 });
    }

    result.id = insertedData.id;
    console.log('[EXTRACT] Saved:', insertedData.id);

    return NextResponse.json({ id: insertedData.id, result });

  } catch (error) {
    console.error('[EXTRACT] Error:', error);
    const message = error instanceof BrandguideAPIError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Ismeretlen hiba';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

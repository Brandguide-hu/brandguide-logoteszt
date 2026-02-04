/**
 * Logo Analyzer - Step 2: KB-Extract + Save
 *
 * kb-extract API hívás structured output-tal (scoring + summary + details),
 * majd Supabase mentés. Külön route a Netlify function timeout miatt.
 */

import { NextRequest } from 'next/server';
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

function szempontokArrayToMap(items: KBExtractSzempontItem[]): SzempontokMap {
  const map = {} as SzempontokMap;

  for (const item of items) {
    const key = item.nev as keyof SzempontokMap;
    if (SZEMPONT_ORDER.includes(key)) {
      map[key] = {
        pont: item.pont,
        maxPont: item.maxPont,
        indoklas: item.indoklas,
        javaslatok: Array.isArray(item.javaslatok) ? item.javaslatok : [],
      };
    }
  }

  // Fallback: positional mapping
  for (let i = 0; i < SZEMPONT_ORDER.length; i++) {
    const key = SZEMPONT_ORDER[i];
    if (!map[key] && items[i]) {
      console.log(`[VALIDATE] Positional fallback for ${key} (got nev: "${items[i].nev}")`);
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
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { visionDescription, logo } = body as {
    visionDescription: string;
    logo: string;
  };

  if (!visionDescription) {
    return new Response(
      JSON.stringify({ error: 'Vision leírás megadása kötelező' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!logo) {
    return new Response(
      JSON.stringify({ error: 'Logó megadása kötelező' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (event: string, data: unknown) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };

  // Heartbeat
  const heartbeatInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode(': heartbeat\n\n'));
    } catch { /* stream closed */ }
  }, 3000);

  const responsePromise = (async () => {
    try {
      await sendEvent('status', { message: 'Elemzés folyamatban...', phase: 'analysis' });

      // ========================================
      // KB-EXTRACT: Scoring + Summary + Details
      // ========================================
      let rawData: KBExtractAnalysisDataRaw;
      let szempontokMap: SzempontokMap;
      let sources: KBExtractSource[] = [];

      const analysisQuery = buildFullAnalysisQuery();
      console.log('[EXTRACT] Query length:', analysisQuery.length);

      const kbResponse = await queryKBExtract<KBExtractAnalysisDataRaw>(
        analysisQuery,
        visionDescription,
        KB_EXTRACT_FULL_SCHEMA,
        'best_effort',
        { max_sources: 5, language: 'hu' }
      );

      rawData = kbResponse.data;
      sources = kbResponse.sources || [];
      szempontokMap = szempontokArrayToMap(rawData.scoring.szempontok);

      console.log('[EXTRACT] Tokens used:', kbResponse.meta?.tokens_used);
      console.log('[EXTRACT] Szempontok count:', rawData.scoring.szempontok?.length);

      // Fill in any missing szempontok with defaults (no retry - too slow for Netlify)
      const missingKeys = SZEMPONT_ORDER.filter(key => !szempontokMap[key]);
      if (missingKeys.length > 0) {
        console.warn(`[EXTRACT] Missing ${missingKeys.length} szempontok: ${missingKeys.join(', ')} - filling defaults`);
        for (const key of missingKeys) {
          szempontokMap[key] = {
            pont: 0,
            maxPont: MAX_VALUES[key],
            indoklas: 'Nem sikerült értékelni ezt a szempontot.',
            javaslatok: [],
          };
        }
      }

      // ========================================
      // VALIDATION + BUILD RESULT
      // ========================================
      await sendEvent('status', { message: 'Eredmények feldolgozása...', phase: 'processing' });

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
      await sendEvent('status', { message: 'Mentés adatbázisba...', phase: 'saving' });

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
        throw new Error(ERROR_MESSAGES.DB_SAVE_ERROR);
      }

      result.id = insertedData.id;
      console.log('[EXTRACT] Saved with ID:', insertedData.id);

      clearInterval(heartbeatInterval);
      await sendEvent('complete', { id: insertedData.id, result });
      await writer.close();

    } catch (error) {
      clearInterval(heartbeatInterval);
      console.error('[EXTRACT] Error:', error);
      await sendEvent('error', {
        message: error instanceof Error ? error.message : 'Ismeretlen hiba'
      });
      await writer.close();
    }
  })();

  responsePromise.catch(console.error);

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

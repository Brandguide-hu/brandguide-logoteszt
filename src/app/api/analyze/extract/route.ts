/**
 * Logo Analyzer - Step 2: KB-Extract + Save
 *
 * kb-extract API hívás structured output-tal (scoring + summary + details),
 * majd Supabase mentés. SSE stream data event heartbeat-tel.
 *
 * FONTOS: Netlify gateway SSE comment-eket (: heartbeat) NEM tekinti
 * adatforgalomnak → idle timeout. Ezért data event-eket használunk.
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
import {
  buildScoringExtractQuery,
  buildSummaryDetailsExtractQuery,
  KB_EXTRACT_SCORING_SCHEMA,
  KB_EXTRACT_SUMMARY_DETAILS_SCHEMA,
  getRatingFromScore,
} from '@/lib/prompts-v2';

// ============================================================================
// TYPES
// ============================================================================

interface SzempontItem {
  pont: number;
  maxPont: number;
  indoklas: string;
  javaslatok: string[];
}

interface KBExtractScoringRaw {
  osszpontszam: number;
  logotipus: 'klasszikus_logo' | 'kampany_badge' | 'illusztracio_jellegu';
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

interface KBExtractScoringData {
  scoring: KBExtractScoringRaw;
}

interface KBExtractSummaryDetailsData {
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

const SZEMPONT_KEYS: (keyof SzempontokMap)[] = [
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

/**
 * Named scoring response-ból SzempontokMap készítése.
 * A schema required mezőkkel kikényszeríti mind a 7-et.
 */
function scoringToSzempontokMap(scoring: KBExtractScoringRaw): SzempontokMap {
  const map = {} as SzempontokMap;
  for (const key of SZEMPONT_KEYS) {
    const item = scoring[key];
    if (item) {
      map[key] = {
        pont: item.pont,
        maxPont: item.maxPont,
        indoklas: item.indoklas || '',
        javaslatok: Array.isArray(item.javaslatok) ? item.javaslatok : [],
      };
    }
  }
  return map;
}

function calculateTotalScore(szempontok: SzempontokMap): number {
  return SZEMPONT_KEYS.reduce((sum, key) => sum + (szempontok[key]?.pont || 0), 0);
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
// MAIN HANDLER - SSE with data event heartbeats
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
    try {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch (e) {
      console.error('[EXTRACT] sendEvent failed:', e);
    }
  };

  // Heartbeat using DATA events (not SSE comments) to keep Netlify gateway alive
  let heartbeatRunning = true;
  let heartbeatResolve: (() => void) | null = null;
  const heartbeatStopped = new Promise<void>(r => { heartbeatResolve = r; });
  const heartbeatLoop = async () => {
    while (heartbeatRunning) {
      try {
        await writer.write(encoder.encode(`event: heartbeat\ndata: {"ts":${Date.now()}}\n\n`));
      } catch {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    heartbeatResolve?.();
  };
  heartbeatLoop();

  const responsePromise = (async () => {
    try {
      await sendEvent('status', { message: 'Elemzés folyamatban...', phase: 'analysis' });

      const scoringQuery = buildScoringExtractQuery();
      const summaryDetailsQuery = buildSummaryDetailsExtractQuery();
      console.log('[EXTRACT] Scoring query length:', scoringQuery.length);
      console.log('[EXTRACT] Summary+Details query length:', summaryDetailsQuery.length);

      // Két párhuzamos kb-extract hívás: scoring (named objects) + summary+details
      const [scoringResponse, summaryDetailsResponse] = await Promise.all([
        queryKBExtract<KBExtractScoringData>(
          scoringQuery,
          visionDescription,
          KB_EXTRACT_SCORING_SCHEMA,
          'best_effort',
          { max_sources: 5, language: 'hu' }
        ),
        queryKBExtract<KBExtractSummaryDetailsData>(
          summaryDetailsQuery,
          visionDescription,
          KB_EXTRACT_SUMMARY_DETAILS_SCHEMA,
          'best_effort',
          { max_sources: 5, language: 'hu' }
        ),
      ]);

      const rawScoring = scoringResponse.data.scoring;
      const rawSummary = summaryDetailsResponse.data.summary;
      const rawDetails = summaryDetailsResponse.data.details;
      const sources = [
        ...(scoringResponse.sources || []),
        ...(summaryDetailsResponse.sources || []),
      ];
      const szempontokMap = scoringToSzempontokMap(rawScoring);

      console.log('[EXTRACT] Scoring tokens:', scoringResponse.meta?.tokens_used);
      console.log('[EXTRACT] Summary+Details tokens:', summaryDetailsResponse.meta?.tokens_used);

      const missingKeys = SZEMPONT_KEYS.filter(key => !szempontokMap[key]);
      if (missingKeys.length > 0) {
        console.error(`[EXTRACT] Missing szempontok: ${missingKeys.join(', ')}`);
        throw new Error(`Hiányos elemzés: ${missingKeys.join(', ')} hiányzik. Kérlek próbáld újra.`);
      }
      console.log('[EXTRACT] All 7 szempontok OK');

      await sendEvent('status', { message: 'Eredmények feldolgozása...', phase: 'processing' });

      const clampedSzempontok = clampSzempontok(szempontokMap);
      const osszpontszam = calculateTotalScore(clampedSzempontok);
      const minosites = getRatingFromScore(osszpontszam);

      const result: AnalysisResult & {
        sources?: KBExtractSource[];
        hiresLogo?: KBExtractScoringRaw['hiresLogo'];
        logoTipus?: string;
      } = {
        id: '',
        osszpontszam,
        minosites,
        szempontok: clampedSzempontok,
        osszegzes: rawSummary.osszegzes || '',
        erossegek: Array.isArray(rawSummary.erossegek) ? rawSummary.erossegek.filter(e => e && e.length > 0) : [],
        fejlesztendo: Array.isArray(rawSummary.fejlesztendo) ? rawSummary.fejlesztendo.filter(f => f && f.length > 0) : [],
        szinek: {
          harmonia: rawDetails.szinek?.harmonia || '',
          pszichologia: rawDetails.szinek?.pszichologia || '',
          technikai: rawDetails.szinek?.technikai || '',
          javaslatok: Array.isArray(rawDetails.szinek?.javaslatok) ? rawDetails.szinek.javaslatok : [],
        },
        tipografia: {
          karakter: rawDetails.tipografia?.karakter || '',
          olvashatosag: rawDetails.tipografia?.olvashatosag || '',
          javaslatok: Array.isArray(rawDetails.tipografia?.javaslatok) ? rawDetails.tipografia.javaslatok : [],
        },
        vizualisNyelv: {
          formak: rawDetails.vizualisNyelv?.formak || '',
          elemek: rawDetails.vizualisNyelv?.elemek || '',
          stilusEgyseg: rawDetails.vizualisNyelv?.stilusEgyseg || '',
          javaslatok: Array.isArray(rawDetails.vizualisNyelv?.javaslatok) ? rawDetails.vizualisNyelv.javaslatok : [],
        },
        createdAt: new Date().toISOString(),
        testLevel: 'detailed',
        hiresLogo: rawScoring.hiresLogo,
        logoTipus: rawScoring.logotipus,
      };

      if (sources.length > 0) {
        result.sources = sources;
      }

      await sendEvent('status', { message: 'Mentés adatbázisba...', phase: 'saving' });

      console.log('[EXTRACT] Saving to DB... result size:', JSON.stringify(result).length, 'logo size:', logo?.length || 0);

      const { data: insertedData, error: dbError } = await getSupabaseAdmin()
        .from('analyses')
        .insert({
          result: result as unknown as Record<string, unknown>,
          logo_base64: logo,
          test_level: 'detailed',
          visibility: 'public',
          status: 'completed',
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('[EXTRACT] DB error:', JSON.stringify(dbError));
        console.error('[EXTRACT] DB error details:', dbError.message, dbError.code, dbError.hint);
        throw new Error(ERROR_MESSAGES.DB_SAVE_ERROR);
      }

      result.id = insertedData.id;
      console.log('[EXTRACT] Saved:', insertedData.id);

      heartbeatRunning = false;
      await heartbeatStopped;
      // Csak az id-t küldjük — a frontend redirect-el az eredmény oldalra
      await sendEvent('complete', { id: insertedData.id });
      console.log('[EXTRACT] Complete event sent');
      await writer.close();

    } catch (error) {
      heartbeatRunning = false;
      await heartbeatStopped;
      console.error('[EXTRACT] Error:', error);
      await sendEvent('error', {
        message: error instanceof Error ? error.message : 'Ismeretlen hiba'
      });
      try { await writer.close(); } catch { /* ignore */ }
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

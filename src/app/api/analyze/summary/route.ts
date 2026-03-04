/**
 * Logo Analyzer - Summary + Details + Save step
 *
 * Summary KB-Extract hívás (~9s) + scoring adatokkal összefűzés + DB mentés.
 * A kliens a Scoring után hívja, megkapja a scoring adatokat + visionDescription-t.
 *
 * Netlify function limit: 60s — a summary ~9s + DB save, bőven belefér.
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { AnalysisResult, ColorAnalysis, TypographyAnalysis, VisualLanguageAnalysis, CriteriaScore } from '@/types';
import {
  queryKBExtract,
  KBExtractSource,
  ERROR_MESSAGES,
} from '@/lib/brandguide-api';
import {
  buildSummaryDetailsExtractQuery,
  KB_EXTRACT_SUMMARY_DETAILS_SCHEMA,
  getRatingFromScore,
  isValidTextItem,
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

interface ScoringRaw {
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

function scoringToSzempontokMap(scoring: ScoringRaw): SzempontokMap {
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
        console.log(`[SUMMARY] Clamped ${key}: ${originalPont} -> ${clamped[k].pont}`);
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
  const { visionDescription, logo, analysisId, scoringData, scoringSources } = body as {
    visionDescription: string;
    logo: string;
    analysisId?: string;
    scoringData: ScoringRaw;
    scoringSources: KBExtractSource[];
  };

  if (!visionDescription || !scoringData) {
    return new Response(
      JSON.stringify({ error: 'visionDescription és scoringData kötelező' }),
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
      console.error('[SUMMARY] sendEvent failed:', e);
    }
  };

  // Heartbeat data event-tel
  let heartbeatRunning = true;
  let hbResolve: (() => void) | null = null;
  const heartbeatStopped = new Promise<void>(resolve => { hbResolve = resolve; });
  const heartbeatLoop = async () => {
    while (heartbeatRunning) {
      try {
        await writer.write(encoder.encode(`event: heartbeat\ndata: {"ts":${Date.now()}}\n\n`));
      } catch { break; }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    if (hbResolve) hbResolve();
  };
  heartbeatLoop();

  const responsePromise = (async () => {
    try {
      await sendEvent('status', { message: 'Részletes elemzés...', phase: 'processing' });

      // 1. Summary KB-Extract hívás (~9s)
      const summaryDetailsQuery = buildSummaryDetailsExtractQuery();
      console.log('[SUMMARY] Query length:', summaryDetailsQuery.length);

      const summaryDetailsResponse = await queryKBExtract<KBExtractSummaryDetailsData>(
        summaryDetailsQuery,
        visionDescription,
        KB_EXTRACT_SUMMARY_DETAILS_SCHEMA,
        'best_effort',
        { max_sources: 5, language: 'hu' }
      );

      console.log('[SUMMARY] Tokens used:', summaryDetailsResponse.meta?.tokens_used);

      // 2. Scoring adatok feldolgozása (kliens-től kapott)
      const szempontokMap = scoringToSzempontokMap(scoringData);
      const missingKeys = SZEMPONT_KEYS.filter(key => !szempontokMap[key]);
      if (missingKeys.length > 0) {
        throw new Error(`Hiányos elemzés: ${missingKeys.join(', ')} hiányzik.`);
      }

      const clampedSzempontok = clampSzempontok(szempontokMap);
      const osszpontszam = calculateTotalScore(clampedSzempontok);
      const minosites = getRatingFromScore(osszpontszam);

      const rawSummary = summaryDetailsResponse.data.summary;
      const rawDetails = summaryDetailsResponse.data.details;
      const sources = [
        ...(scoringSources || []),
        ...(summaryDetailsResponse.sources || []),
      ];

      const result: AnalysisResult & {
        sources?: KBExtractSource[];
        hiresLogo?: ScoringRaw['hiresLogo'];
        logoTipus?: string;
      } = {
        id: '',
        osszpontszam,
        minosites,
        szempontok: clampedSzempontok,
        osszegzes: rawSummary.osszegzes || '',
        erossegek: Array.isArray(rawSummary.erossegek) ? rawSummary.erossegek.filter(isValidTextItem) : [],
        fejlesztendo: Array.isArray(rawSummary.fejlesztendo) ? rawSummary.fejlesztendo.filter(isValidTextItem) : [],
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
        hiresLogo: scoringData.hiresLogo,
        logoTipus: scoringData.logotipus,
      };

      if (sources.length > 0) {
        result.sources = sources;
      }

      // 3. DB mentés
      await sendEvent('status', { message: 'Mentés adatbázisba...', phase: 'saving' });

      let savedId: string;

      if (analysisId) {
        const { error: dbError } = await (getSupabaseAdmin()
          .from('analyses') as any)
          .update({
            result: result as unknown as Record<string, unknown>,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', analysisId);

        if (dbError) {
          console.error('[SUMMARY] DB update error:', JSON.stringify(dbError));
          throw new Error(ERROR_MESSAGES.DB_SAVE_ERROR);
        }
        savedId = analysisId;
        console.log('[SUMMARY] Updated:', analysisId);
      } else {
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
          console.error('[SUMMARY] DB error:', JSON.stringify(dbError));
          throw new Error(ERROR_MESSAGES.DB_SAVE_ERROR);
        }
        savedId = insertedData.id;
        console.log('[SUMMARY] Inserted:', insertedData.id);
      }

      result.id = savedId;

      heartbeatRunning = false;
      await heartbeatStopped;
      await sendEvent('complete', { id: savedId });
      console.log('[SUMMARY] Complete event sent');
      await writer.close();

    } catch (error) {
      heartbeatRunning = false;
      await heartbeatStopped;
      console.error('[SUMMARY] Error:', error);
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

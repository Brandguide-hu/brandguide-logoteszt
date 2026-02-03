/**
 * Logo Analyzer API V4
 *
 * Architektúra:
 * 1. Claude Vision - "Vakvezető Designer" leírás (~3500 kar)
 * 2. kb-extract API - Egyetlen hívás structured output-tal (scoring + summary + details)
 *
 * Összesen: 2 API hívás (korábban 4)
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { AnalysisResult, ColorAnalysis, TypographyAnalysis, VisualLanguageAnalysis, CriteriaScore } from '@/types';
import {
  analyzeImageWithVision,
  queryKBExtract,
  BrandguideAPIError,
  KBExtractSource,
  ERROR_MESSAGES,
} from '@/lib/brandguide-api';
import { buildFullAnalysisQuery, KB_EXTRACT_FULL_SCHEMA, getRatingFromScore } from '@/lib/prompts-v2';

// ============================================================================
// TYPES - kb-extract structured output
// ============================================================================

// Raw API response type - szempontok as array (to keep schema grammar small)
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

// Normalized type - szempontok as named object (used by the rest of the app)
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

/**
 * Convert szempontok array from kb-extract to named object format
 */
function szempontokArrayToMap(items: KBExtractSzempontItem[]): SzempontokMap {
  const map = {} as SzempontokMap;

  // First try to match by nev field
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

  // Fallback: if some are missing, try positional mapping
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

/**
 * Calculate total score from criteria (always recalculate, don't trust AI sum)
 */
function calculateTotalScore(szempontok: SzempontokMap): number {
  return SZEMPONT_ORDER.reduce((sum, key) => sum + (szempontok[key]?.pont || 0), 0);
}

/**
 * Clamp criteria scores to their max values (safety net)
 */
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
  const { logo, mediaType, colors, fontName } = body as {
    logo: string;
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    colors?: string[];
    fontName?: string;
  };

  if (!logo) {
    return new Response(
      JSON.stringify({ error: 'Logó megadása kötelező' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create a TransformStream for streaming
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper to send SSE events
  const sendEvent = async (event: string, data: unknown) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };

  // Start the streaming response
  const responsePromise = (async () => {
    try {
      await sendEvent('status', { message: 'Elemzés indítása...', phase: 'start' });

      let visionDescription: string;

      // ========================================
      // STEP 1: Claude Vision - "Vakvezető Designer"
      // ========================================
      console.log('[ANALYZE V4] Step 1: Claude Vision (Vakvezető Designer)...');
      await sendEvent('status', { message: 'Kép feldolgozása...', phase: 'vision' });

      try {
        visionDescription = await analyzeImageWithVision(logo, mediaType, colors, fontName);
        console.log('[ANALYZE V4] Vision description length:', visionDescription.length);
        await sendEvent('debug', { message: `[VISION] Leírás kész: ${visionDescription.length} kar` });
      } catch (visionError: unknown) {
        const errorMessage = visionError instanceof Error ? visionError.message : String(visionError);
        console.error('[ANALYZE V4] Vision error:', errorMessage);
        throw new Error(`Claude Vision hiba: ${errorMessage}`);
      }

      // ========================================
      // STEP 2: kb-extract - Pontozás + Összefoglaló + Részletek (1 hívás)
      // ========================================
      console.log('[ANALYZE V4] Step 2: kb-extract - Teljes elemzés...');
      await sendEvent('status', { message: 'Elemzés folyamatban...', phase: 'analysis' });

      let rawData: KBExtractAnalysisDataRaw;
      let szempontokMap: SzempontokMap;
      let sources: KBExtractSource[] = [];

      try {
        const analysisQuery = buildFullAnalysisQuery();
        console.log('[ANALYZE V4] Analysis query length:', analysisQuery.length);
        await sendEvent('debug', { message: `[KB-EXTRACT] Query küldése: ${analysisQuery.length} kar` });

        const kbResponse = await queryKBExtract<KBExtractAnalysisDataRaw>(
          analysisQuery,
          visionDescription,
          KB_EXTRACT_FULL_SCHEMA,
          'best_effort',
          { max_sources: 5, language: 'hu' }
        );

        rawData = kbResponse.data;
        sources = kbResponse.sources || [];

        // Convert szempontok array to named object
        szempontokMap = szempontokArrayToMap(rawData.scoring.szempontok);

        console.log('[ANALYZE V4] KB-Extract response received');
        console.log('[ANALYZE V4] Tokens used:', kbResponse.meta?.tokens_used);
        console.log('[ANALYZE V4] AI osszpontszam:', rawData.scoring.osszpontszam);
        console.log('[ANALYZE V4] Logo type:', rawData.scoring.logotipus);
        console.log('[ANALYZE V4] Szempontok array length:', rawData.scoring.szempontok?.length);

        // Validate all 7 szempontok are present
        const missingKeys = SZEMPONT_ORDER.filter(key => !szempontokMap[key]);
        if (missingKeys.length > 0) {
          console.warn(`[ANALYZE V4] Missing szempontok: ${missingKeys.join(', ')} (got ${rawData.scoring.szempontok?.length || 0}/7)`);
          await sendEvent('debug', { message: `[KB-EXTRACT] Hiányzó szempontok: ${missingKeys.join(', ')} - újrapróbálás...` });

          // Retry once - the API sometimes returns partial results in best_effort mode
          const retryResponse = await queryKBExtract<KBExtractAnalysisDataRaw>(
            analysisQuery,
            visionDescription,
            KB_EXTRACT_FULL_SCHEMA,
            'best_effort',
            { max_sources: 5, language: 'hu' }
          );

          rawData = retryResponse.data;
          sources = retryResponse.sources || [];
          szempontokMap = szempontokArrayToMap(rawData.scoring.szempontok);

          console.log('[ANALYZE V4] Retry szempontok array length:', rawData.scoring.szempontok?.length);

          const stillMissing = SZEMPONT_ORDER.filter(key => !szempontokMap[key]);
          if (stillMissing.length > 0) {
            console.error(`[ANALYZE V4] Still missing after retry: ${stillMissing.join(', ')}`);
            throw new Error(`Hiányos elemzés: ${stillMissing.length} szempont hiányzik (${stillMissing.join(', ')}). Kérlek próbáld újra.`);
          }
        }

        await sendEvent('debug', { message: `[KB-EXTRACT] Válasz OK, tokens: ${kbResponse.meta?.tokens_used}` });
        await sendEvent('debug', { message: `[KB-EXTRACT] Trace: ${kbResponse.meta?.trace_id}` });

        if (rawData.scoring.hiresLogo?.ismert) {
          console.log('[ANALYZE V4] Famous logo detected:', rawData.scoring.hiresLogo.marka);
          await sendEvent('debug', { message: `[KB-EXTRACT] Híres logó: ${rawData.scoring.hiresLogo.marka}` });
        }

        // Log criteria scores
        const criteriaScores = Object.entries(szempontokMap)
          .map(([key, val]) => `${key}:${val.pont}`)
          .join(', ');
        await sendEvent('debug', { message: `[KB-EXTRACT] Pontszámok: ${criteriaScores}` });

      } catch (error) {
        await sendEvent('debug', { message: `[KB-EXTRACT] HIBA: ${error instanceof Error ? error.message : 'ismeretlen'}` });
        if (error instanceof BrandguideAPIError) {
          throw new Error(`brandguideAI hiba: ${error.message}`);
        }
        throw error;
      }

      // ========================================
      // STEP 3: Validálás + Összefűzés
      // ========================================
      console.log('[ANALYZE V4] Step 3: Validálás...');
      await sendEvent('status', { message: 'Eredmények feldolgozása...', phase: 'processing' });

      // Clamp criteria scores (safety net)
      const clampedSzempontok = clampSzempontok(szempontokMap);

      // Calculate total score - ALWAYS from criteria, never trust AI sum
      const calculatedScore = calculateTotalScore(clampedSzempontok);
      const aiSuggestedScore = rawData.scoring.osszpontszam;

      if (Math.abs(aiSuggestedScore - calculatedScore) > 2) {
        console.log(`[ANALYZE V4] Score mismatch: AI suggested ${aiSuggestedScore}, calculated ${calculatedScore} - using calculated`);
        await sendEvent('debug', { message: `[VALIDATE] AI: ${aiSuggestedScore}, Számolt: ${calculatedScore} - számoltat használjuk` });
      }

      const osszpontszam = calculatedScore;
      const minosites = getRatingFromScore(osszpontszam);

      // Build the result object
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
        // Extra fields
        hiresLogo: rawData.scoring.hiresLogo,
        logoTipus: rawData.scoring.logotipus,
      };

      // Add sources from kb-extract
      if (sources.length > 0) {
        result.sources = sources;
      }

      // ========================================
      // STEP 4: Supabase mentés
      // ========================================
      console.log('[ANALYZE V4] Step 4: Supabase mentés...');
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
        console.error('[ANALYZE V4] Supabase error:', JSON.stringify(dbError));
        await sendEvent('debug', { message: `[DB] Hiba: ${dbError.message} (${dbError.code}) - ${dbError.details}` });
        throw new Error(ERROR_MESSAGES.DB_SAVE_ERROR);
      }

      result.id = insertedData.id;
      console.log('[ANALYZE V4] Analysis saved with ID:', insertedData.id);

      // Send final result
      await sendEvent('complete', { id: insertedData.id, result });
      await writer.close();

    } catch (error) {
      console.error('[ANALYZE V4] Error:', error);
      await sendEvent('error', {
        message: error instanceof Error ? error.message : 'Ismeretlen hiba'
      });
      await writer.close();
    }
  })();

  // Don't await - let it run in background
  responsePromise.catch(console.error);

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

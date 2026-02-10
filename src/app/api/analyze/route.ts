/**
 * Logo Analyzer API V4
 *
 * Architektúra:
 * 1. Claude Vision - "Vakvezető Designer" leírás (~3500 kar)
 * 2. kb-extract API - 2 párhuzamos hívás (scoring + summary/details)
 *    - Scoring: named object schema (minden szempont külön property)
 *    - Summary+Details: összefoglaló + színek/tipográfia/vizuális nyelv
 *
 * Összesen: 3 API hívás (1 Vision + 2 kb-extract párhuzamosan)
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
import {
  buildScoringExtractQuery,
  buildSummaryDetailsExtractQuery,
  KB_EXTRACT_SCORING_SCHEMA,
  KB_EXTRACT_SUMMARY_DETAILS_SCHEMA,
  getRatingFromScore,
} from '@/lib/prompts-v2';

// ============================================================================
// TYPES - kb-extract structured output (named object schema)
// ============================================================================

// Scoring response - szempontok in nested object (new API structure)
interface KBExtractScoringDataRaw {
  scoring: {
    osszpontszam: number;
    logotipus: 'klasszikus_logo' | 'kampany_badge' | 'illusztracio_jellegu';
    hiresLogo: {
      ismert: boolean;
      marka: string;
      tervezo: string;
      kontextus: string;
    };
    szempontok: {
      megkulonboztethetoseg: CriteriaScore;
      egyszeruseg: CriteriaScore;
      alkalmazhatosag: CriteriaScore;
      emlekezetesseg: CriteriaScore;
      idotallosag: CriteriaScore;
      univerzalitas: CriteriaScore;
      lathatosag: CriteriaScore;
    };
  };
}

// Summary + Details response
interface KBExtractSummaryDetailsDataRaw {
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
  let { logo, mediaType, colors, fontName, analysisId } = body as {
    logo?: string;
    mediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    colors?: string[];
    fontName?: string;
    analysisId?: string;
  };

  // If analysisId provided but no logo, fetch from DB
  if (analysisId && !logo) {
    console.log('[ANALYZE V4] Fetching logo from DB for analysisId:', analysisId);
    const { data: existingAnalysis, error: fetchError } = await getSupabaseAdmin()
      .from('analyses')
      .select('logo_base64')
      .eq('id', analysisId)
      .single();

    if (fetchError || !existingAnalysis?.logo_base64) {
      console.error('[ANALYZE V4] Failed to fetch logo from DB:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Elemzés nem található vagy nincs logó' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logo = existingAnalysis.logo_base64;
    // Default to PNG if no mediaType provided
    if (!mediaType) {
      mediaType = 'image/png';
    }
    console.log('[ANALYZE V4] Logo fetched from DB, length:', logo?.length || 0);
  }

  if (!logo) {
    return new Response(
      JSON.stringify({ error: 'Logó megadása kötelező' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // TypeScript: at this point logo is definitely a string
  const validatedLogo: string = logo;
  const validatedMediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = mediaType || 'image/png';

  // Create a TransformStream for streaming
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper to send SSE events
  const sendEvent = async (event: string, data: unknown) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };

  // Heartbeat to keep Netlify function alive during long API calls
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  const startHeartbeat = () => {
    heartbeatInterval = setInterval(async () => {
      try {
        await writer.write(encoder.encode(': heartbeat\n\n'));
      } catch { /* stream closed */ }
    }, 3000);
  };
  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  // Start the streaming response
  const responsePromise = (async () => {
    try {
      startHeartbeat();
      await sendEvent('status', { message: 'Elemzés indítása...', phase: 'start' });

      let visionDescription: string;

      // ========================================
      // STEP 1: Claude Vision - "Vakvezető Designer"
      // ========================================
      console.log('[ANALYZE V4] Step 1: Claude Vision (Vakvezető Designer)...');
      await sendEvent('status', { message: 'Kép feldolgozása...', phase: 'vision' });

      try {
        visionDescription = await analyzeImageWithVision(validatedLogo, validatedMediaType, colors, fontName);
        console.log('[ANALYZE V4] Vision description length:', visionDescription.length);
        await sendEvent('debug', { message: `[VISION] Leírás kész: ${visionDescription.length} kar` });
      } catch (visionError: unknown) {
        const errorMessage = visionError instanceof Error ? visionError.message : String(visionError);
        console.error('[ANALYZE V4] Vision error:', errorMessage);
        throw new Error(`Claude Vision hiba: ${errorMessage}`);
      }

      // ========================================
      // STEP 2: kb-extract - 2 párhuzamos hívás (scoring + summary/details)
      // A szempontok NAMED OBJECT formátumban érkeznek, nem tömbben!
      // ========================================
      console.log('[ANALYZE V4] Step 2: kb-extract - 2 párhuzamos hívás...');
      await sendEvent('status', { message: 'Elemzés folyamatban...', phase: 'analysis' });

      let scoringData: KBExtractScoringDataRaw;
      let summaryDetailsData: KBExtractSummaryDetailsDataRaw;
      let szempontokMap: SzempontokMap;
      let sources: KBExtractSource[] = [];

      try {
        const scoringQuery = buildScoringExtractQuery();
        const summaryDetailsQuery = buildSummaryDetailsExtractQuery();
        console.log('[ANALYZE V4] Scoring query length:', scoringQuery.length);
        console.log('[ANALYZE V4] Summary+Details query length:', summaryDetailsQuery.length);
        await sendEvent('debug', { message: `[KB-EXTRACT] 2 párhuzamos hívás indítása...` });

        // Párhuzamos hívások
        const [scoringResponse, summaryDetailsResponse] = await Promise.all([
          queryKBExtract<KBExtractScoringDataRaw>(
            scoringQuery,
            visionDescription,
            KB_EXTRACT_SCORING_SCHEMA,
            'best_effort',
            { max_sources: 5, language: 'hu' }
          ),
          queryKBExtract<KBExtractSummaryDetailsDataRaw>(
            summaryDetailsQuery,
            visionDescription,
            KB_EXTRACT_SUMMARY_DETAILS_SCHEMA,
            'best_effort',
            { max_sources: 3, language: 'hu' }
          ),
        ]);

        scoringData = scoringResponse.data;
        summaryDetailsData = summaryDetailsResponse.data;
        sources = [...(scoringResponse.sources || []), ...(summaryDetailsResponse.sources || [])];

        // A szempontok nested objektumban érkeznek (új API struktúra: scoring.szempontok.X)
        szempontokMap = {
          megkulonboztethetoseg: scoringData.scoring.szempontok.megkulonboztethetoseg,
          egyszeruseg: scoringData.scoring.szempontok.egyszeruseg,
          alkalmazhatosag: scoringData.scoring.szempontok.alkalmazhatosag,
          emlekezetesseg: scoringData.scoring.szempontok.emlekezetesseg,
          idotallosag: scoringData.scoring.szempontok.idotallosag,
          univerzalitas: scoringData.scoring.szempontok.univerzalitas,
          lathatosag: scoringData.scoring.szempontok.lathatosag,
        };

        console.log('[ANALYZE V4] KB-Extract responses received');
        console.log('[ANALYZE V4] Scoring tokens used:', scoringResponse.meta?.tokens_used);
        console.log('[ANALYZE V4] Summary tokens used:', summaryDetailsResponse.meta?.tokens_used);
        console.log('[ANALYZE V4] AI osszpontszam:', scoringData.scoring.osszpontszam);
        console.log('[ANALYZE V4] Logo type:', scoringData.scoring.logotipus);

        // Check for missing szempontok
        const missingKeys = SZEMPONT_ORDER.filter(key => !szempontokMap[key]);
        if (missingKeys.length > 0) {
          console.error(`[ANALYZE V4] Missing ${missingKeys.length} szempontok: ${missingKeys.join(', ')}`);
          throw new Error(`Hiányos elemzés: ${missingKeys.length} szempont hiányzik (${missingKeys.join(', ')}). Kérlek próbáld újra.`);
        }

        await sendEvent('debug', { message: `[KB-EXTRACT] Scoring OK, tokens: ${scoringResponse.meta?.tokens_used}` });
        await sendEvent('debug', { message: `[KB-EXTRACT] Summary OK, tokens: ${summaryDetailsResponse.meta?.tokens_used}` });

        if (scoringData.scoring.hiresLogo?.ismert) {
          console.log('[ANALYZE V4] Famous logo detected:', scoringData.scoring.hiresLogo.marka);
          await sendEvent('debug', { message: `[KB-EXTRACT] Híres logó: ${scoringData.scoring.hiresLogo.marka}` });
        }

        // Log criteria scores
        const criteriaScores = Object.entries(szempontokMap)
          .map(([key, val]) => `${key}:${val?.pont || 0}`)
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
      const aiSuggestedScore = scoringData.scoring.osszpontszam;

      if (Math.abs(aiSuggestedScore - calculatedScore) > 2) {
        console.log(`[ANALYZE V4] Score mismatch: AI suggested ${aiSuggestedScore}, calculated ${calculatedScore} - using calculated`);
        await sendEvent('debug', { message: `[VALIDATE] AI: ${aiSuggestedScore}, Számolt: ${calculatedScore} - számoltat használjuk` });
      }

      const osszpontszam = calculatedScore;
      const minosites = getRatingFromScore(osszpontszam);

      // Build the result object
      const result: AnalysisResult & {
        sources?: KBExtractSource[];
        hiresLogo?: KBExtractScoringDataRaw['scoring']['hiresLogo'];
        logoTipus?: string;
      } = {
        id: '',
        osszpontszam,
        minosites,
        szempontok: clampedSzempontok,
        osszegzes: summaryDetailsData.summary.osszegzes || '',
        erossegek: Array.isArray(summaryDetailsData.summary.erossegek) ? summaryDetailsData.summary.erossegek.filter(e => e && e.length > 0) : [],
        fejlesztendo: Array.isArray(summaryDetailsData.summary.fejlesztendo) ? summaryDetailsData.summary.fejlesztendo.filter(f => f && f.length > 0) : [],
        szinek: {
          harmonia: summaryDetailsData.details.szinek?.harmonia || '',
          pszichologia: summaryDetailsData.details.szinek?.pszichologia || '',
          technikai: summaryDetailsData.details.szinek?.technikai || '',
          javaslatok: Array.isArray(summaryDetailsData.details.szinek?.javaslatok) ? summaryDetailsData.details.szinek.javaslatok : [],
        },
        tipografia: {
          karakter: summaryDetailsData.details.tipografia?.karakter || '',
          olvashatosag: summaryDetailsData.details.tipografia?.olvashatosag || '',
          javaslatok: Array.isArray(summaryDetailsData.details.tipografia?.javaslatok) ? summaryDetailsData.details.tipografia.javaslatok : [],
        },
        vizualisNyelv: {
          formak: summaryDetailsData.details.vizualisNyelv?.formak || '',
          elemek: summaryDetailsData.details.vizualisNyelv?.elemek || '',
          stilusEgyseg: summaryDetailsData.details.vizualisNyelv?.stilusEgyseg || '',
          javaslatok: Array.isArray(summaryDetailsData.details.vizualisNyelv?.javaslatok) ? summaryDetailsData.details.vizualisNyelv.javaslatok : [],
        },
        createdAt: new Date().toISOString(),
        testLevel: 'detailed',
        // Extra fields
        hiresLogo: scoringData.scoring.hiresLogo,
        logoTipus: scoringData.scoring.logotipus,
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

      let savedId: string;

      if (analysisId) {
        // Webhook flow — UPDATE existing record
        const { error: dbError } = await (getSupabaseAdmin()
          .from('analyses') as any)
          .update({
            result: result as unknown as Record<string, unknown>,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', analysisId);

        if (dbError) {
          console.error('[ANALYZE V4] Supabase update error:', JSON.stringify(dbError));
          await sendEvent('debug', { message: `[DB] Update hiba: ${dbError.message} (${dbError.code}) - ${dbError.details}` });
          throw new Error(ERROR_MESSAGES.DB_SAVE_ERROR);
        }

        savedId = analysisId;
        console.log('[ANALYZE V4] Analysis updated:', analysisId);
      } else {
        // Legacy flow — INSERT new record
        const { data: insertedData, error: dbError } = await getSupabaseAdmin()
          .from('analyses')
          .insert({
            result: result as unknown as Record<string, unknown>,
            logo_base64: validatedLogo,
            test_level: 'detailed',
          })
          .select('id')
          .single();

        if (dbError) {
          console.error('[ANALYZE V4] Supabase error:', JSON.stringify(dbError));
          await sendEvent('debug', { message: `[DB] Hiba: ${dbError.message} (${dbError.code}) - ${dbError.details}` });
          throw new Error(ERROR_MESSAGES.DB_SAVE_ERROR);
        }

        savedId = insertedData.id;
        console.log('[ANALYZE V4] Analysis saved with ID:', insertedData.id);
      }

      result.id = savedId;

      // Send final result
      stopHeartbeat();
      await sendEvent('complete', { id: savedId, result });
      await writer.close();

    } catch (error) {
      stopHeartbeat();
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

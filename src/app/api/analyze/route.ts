/**
 * Logo Analyzer API V2
 *
 * Architektúra:
 * 1. Claude Vision - "Vakvezető Designer" leírás (~3500 kar)
 * 2. brandguideAI Hívás 1 - Pontozás + Összefoglaló
 * 3. brandguideAI Hívás 2 - Szöveges elemzések (színek, tipográfia, vizuális nyelv)
 *
 * Összesen: 3 API hívás (korábban 7)
 */

import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { AnalysisResult, ColorAnalysis, TypographyAnalysis, VisualLanguageAnalysis, Rating } from '@/types';
import {
  analyzeImageWithVision,
  queryBrandguideAI,
  BrandguideAPIError,
  BrandguideResponse,
  parseJSONResponse,
  ERROR_MESSAGES,
} from '@/lib/brandguide-api';
import { buildScoringQuery, buildDetailsQuery, getRatingFromScore } from '@/lib/prompts-v2';

// ============================================================================
// TYPES
// ============================================================================

interface ScoringResponse {
  osszpontszam: number;
  minosites: Rating;
  szempontok: {
    megkulonboztethetoseg: CriteriaScoreResponse;
    egyszeruseg: CriteriaScoreResponse;
    alkalmazhatosag: CriteriaScoreResponse;
    emlekezetesseg: CriteriaScoreResponse;
    idotallosag: CriteriaScoreResponse;
    univerzalitas: CriteriaScoreResponse;
    lathatosag: CriteriaScoreResponse;
  };
  osszegzes: string;
  erossegek: string[];
  fejlesztendo: string[];
}

interface CriteriaScoreResponse {
  pont: number;
  maxPont: number;
  indoklas: string;
  javaslatok: string[];
}

interface DetailsResponse {
  szinek: ColorAnalysis;
  tipografia: TypographyAnalysis;
  vizualisNyelv: VisualLanguageAnalysis;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate total score from criteria
 */
function calculateTotalScore(szempontok: ScoringResponse['szempontok']): number {
  return (
    (szempontok.megkulonboztethetoseg?.pont || 0) +
    (szempontok.egyszeruseg?.pont || 0) +
    (szempontok.alkalmazhatosag?.pont || 0) +
    (szempontok.emlekezetesseg?.pont || 0) +
    (szempontok.idotallosag?.pont || 0) +
    (szempontok.univerzalitas?.pont || 0) +
    (szempontok.lathatosag?.pont || 0)
  );
}

/**
 * Validate and fix scoring data
 */
function validateScoringData(data: Partial<ScoringResponse>): ScoringResponse {
  const defaultCriteria = (maxPont: number): CriteriaScoreResponse => ({
    pont: 0,
    maxPont,
    indoklas: '',
    javaslatok: [],
  });

  const szempontok = {
    megkulonboztethetoseg: { ...defaultCriteria(20), ...data.szempontok?.megkulonboztethetoseg },
    egyszeruseg: { ...defaultCriteria(18), ...data.szempontok?.egyszeruseg },
    alkalmazhatosag: { ...defaultCriteria(15), ...data.szempontok?.alkalmazhatosag },
    emlekezetesseg: { ...defaultCriteria(15), ...data.szempontok?.emlekezetesseg },
    idotallosag: { ...defaultCriteria(12), ...data.szempontok?.idotallosag },
    univerzalitas: { ...defaultCriteria(10), ...data.szempontok?.univerzalitas },
    lathatosag: { ...defaultCriteria(10), ...data.szempontok?.lathatosag },
  };

  // Recalculate total score
  const osszpontszam = calculateTotalScore(szempontok);
  const minosites = getRatingFromScore(osszpontszam) as Rating;

  return {
    osszpontszam,
    minosites,
    szempontok,
    osszegzes: data.osszegzes || '',
    erossegek: Array.isArray(data.erossegek) ? data.erossegek.filter(e => e && e.length > 0) : [],
    fejlesztendo: Array.isArray(data.fejlesztendo) ? data.fejlesztendo.filter(f => f && f.length > 0) : [],
  };
}

/**
 * Validate and fix details data
 */
function validateDetailsData(data: Partial<DetailsResponse>): DetailsResponse {
  return {
    szinek: {
      harmonia: data.szinek?.harmonia || '',
      pszichologia: data.szinek?.pszichologia || '',
      technikai: data.szinek?.technikai || '',
      javaslatok: Array.isArray(data.szinek?.javaslatok) ? data.szinek.javaslatok : [],
    },
    tipografia: {
      karakter: data.tipografia?.karakter || '',
      olvashatosag: data.tipografia?.olvashatosag || '',
      javaslatok: Array.isArray(data.tipografia?.javaslatok) ? data.tipografia.javaslatok : [],
    },
    vizualisNyelv: {
      formak: data.vizualisNyelv?.formak || '',
      elemek: data.vizualisNyelv?.elemek || '',
      stilusEgyseg: data.vizualisNyelv?.stilusEgyseg || '',
      javaslatok: Array.isArray(data.vizualisNyelv?.javaslatok) ? data.vizualisNyelv.javaslatok : [],
    },
  };
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

      let scoringResponse: BrandguideResponse;
      let visionDescription: string;

      // ========================================
      // STEP 1: Claude Vision - "Vakvezető Designer"
      // ========================================
      console.log('[ANALYZE V2] Step 1: Claude Vision (Vakvezető Designer)...');
      await sendEvent('status', { message: 'Kép feldolgozása...', phase: 'vision' });

      try {
        visionDescription = await analyzeImageWithVision(logo, mediaType, colors, fontName);
        console.log('[ANALYZE V2] Vision description length:', visionDescription.length);
      } catch (visionError: unknown) {
        const errorMessage = visionError instanceof Error ? visionError.message : String(visionError);
        console.error('[ANALYZE V2] Vision error:', errorMessage);
        throw new Error(`Claude Vision hiba: ${errorMessage}`);
      }

      // ========================================
      // STEP 2: brandguideAI - Pontozás + Összefoglaló
      // ========================================
      console.log('[ANALYZE V2] Step 2: brandguideAI - Pontozás + Összefoglaló...');
      await sendEvent('status', { message: 'Pontozás és értékelés (1/2)...', phase: 'scoring' });

      let scoringData: ScoringResponse;
      try {
        const scoringQuery = buildScoringQuery(visionDescription);
        console.log('[ANALYZE V2] Scoring query length:', scoringQuery.length);

        scoringResponse = await queryBrandguideAI(scoringQuery);
        console.log('[ANALYZE V2] Scoring response length:', scoringResponse.answer.length);

        const rawScoringData = parseJSONResponse<Partial<ScoringResponse>>(
          scoringResponse.answer,
          ERROR_MESSAGES.PARSE_ERROR_SCORING
        );
        scoringData = validateScoringData(rawScoringData);
        console.log('[ANALYZE V2] Scoring total:', scoringData.osszpontszam);
      } catch (error) {
        if (error instanceof BrandguideAPIError) {
          throw new Error(`brandguideAI hiba: ${error.message}`);
        }
        throw error;
      }

      // ========================================
      // STEP 3: brandguideAI - Szöveges elemzések
      // ========================================
      console.log('[ANALYZE V2] Step 3: brandguideAI - Szöveges elemzések...');
      await sendEvent('status', { message: 'Részletes elemzés (2/2)...', phase: 'details' });

      let detailsData: DetailsResponse;
      try {
        const detailsQuery = buildDetailsQuery(visionDescription);
        console.log('[ANALYZE V2] Details query length:', detailsQuery.length);

        const detailsResponse = await queryBrandguideAI(detailsQuery);
        console.log('[ANALYZE V2] Details response length:', detailsResponse.answer.length);

        const rawDetailsData = parseJSONResponse<Partial<DetailsResponse>>(
          detailsResponse.answer,
          ERROR_MESSAGES.PARSE_ERROR_DETAILS
        );
        detailsData = validateDetailsData(rawDetailsData);
      } catch (error) {
        if (error instanceof BrandguideAPIError) {
          throw new Error(`brandguideAI hiba: ${error.message}`);
        }
        throw error;
      }

      // ========================================
      // STEP 4: Összefűzés + Validálás
      // ========================================
      console.log('[ANALYZE V2] Step 4: Összefűzés és validálás...');
      await sendEvent('status', { message: 'Eredmények feldolgozása...', phase: 'processing' });

      // Build the result object
      const result: AnalysisResult & { sources?: BrandguideResponse['sources'] } = {
        id: '',
        osszpontszam: scoringData.osszpontszam,
        minosites: scoringData.minosites,
        szempontok: scoringData.szempontok,
        osszegzes: scoringData.osszegzes,
        erossegek: scoringData.erossegek.length > 0
          ? scoringData.erossegek
          : ['Az elemzés nem tartalmazott külön erősségeket'],
        fejlesztendo: scoringData.fejlesztendo.length > 0
          ? scoringData.fejlesztendo
          : ['Az elemzés nem tartalmazott külön fejlesztendő területeket'],
        szinek: detailsData.szinek,
        tipografia: detailsData.tipografia,
        vizualisNyelv: detailsData.vizualisNyelv,
        createdAt: new Date().toISOString(),
        testLevel: 'detailed',
      };

      // Add sources from brandguideAI
      if (scoringResponse.sources && scoringResponse.sources.length > 0) {
        result.sources = scoringResponse.sources;
      }

      // ========================================
      // STEP 5: Supabase mentés
      // ========================================
      console.log('[ANALYZE V2] Step 5: Supabase mentés...');
      await sendEvent('status', { message: 'Mentés adatbázisba...', phase: 'saving' });

      const { data: insertedData, error: dbError } = await getSupabase()
        .from('analyses')
        .insert({
          result: result as unknown as Record<string, unknown>,
          logo_base64: logo,
          test_level: 'detailed',
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('[ANALYZE V2] Supabase error:', dbError);
        throw new Error(ERROR_MESSAGES.DB_SAVE_ERROR);
      }

      result.id = insertedData.id;
      console.log('[ANALYZE V2] Analysis saved with ID:', insertedData.id);

      // Send final result
      await sendEvent('complete', { id: insertedData.id, result });
      await writer.close();

    } catch (error) {
      console.error('[ANALYZE V2] Error:', error);
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

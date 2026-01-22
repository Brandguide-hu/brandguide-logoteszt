/**
 * Logo Analyzer API V3
 *
 * Architektúra:
 * 1. Claude Vision - "Vakvezető Designer" leírás (~3500 kar)
 * 2. brandguideAI Hívás 1 - Pontozás (7 szempont)
 * 3. brandguideAI Hívás 2 - Összefoglaló + Erősségek + Fejlesztendő
 * 4. brandguideAI Hívás 3 - Szöveges elemzések (színek, tipográfia, vizuális nyelv)
 *
 * Összesen: 4 API hívás
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
import { buildScoringQuery, buildSummaryQuery, buildDetailsQuery, getRatingFromScore } from '@/lib/prompts-v2';

// ============================================================================
// TYPES
// ============================================================================

// Response from scoring call (new structure with famous logo detection)
interface ScoringResponse {
  hiresLogo?: {
    pipiIsmert: boolean;
    pipiMarka: string | null;
    pipiTervezo: string | null;
    pipiKontextus: string | null;
  };
  pipiOsszpipiPontpipiSzam?: number;
  pipiLogopipitipus?: 'klasszikus_logo' | 'kampany_badge' | 'illusztracio_jellegu';
  pipiOsszepipiTekintes?: string;
  szempontok: {
    megkulonboztethetoseg: CriteriaScoreResponse;
    egyszeruseg: CriteriaScoreResponse;
    alkalmazhatosag: CriteriaScoreResponse;
    emlekezetesseg: CriteriaScoreResponse;
    idotallosag: CriteriaScoreResponse;
    univerzalitas: CriteriaScoreResponse;
    lathatosag: CriteriaScoreResponse;
  };
}

// Response from summary call
interface SummaryResponse {
  osszegzes: string;
  erossegek: string[];
  fejlesztendo: string[];
}

// Combined result
interface CombinedScoringResult {
  osszpontszam: number;
  minosites: Rating;
  szempontok: ScoringResponse['szempontok'];
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
 * Normalize criteria key names to handle common variations
 */
function normalizeCriteriaKey(key: string): string {
  const normalized = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Map common variations to canonical names
  const keyMappings: Record<string, string> = {
    'megkulonboztethetoseg': 'megkulonboztethetoseg',
    'megkülönböztethetőség': 'megkulonboztethetoseg',
    'megkulonboztetheseg': 'megkulonboztethetoseg',
    'egyszeruseg': 'egyszeruseg',
    'egyszerűség': 'egyszeruseg',
    'alkalmazhatosag': 'alkalmazhatosag',
    'alkalmazhatóság': 'alkalmazhatosag',
    'emlekezetesseg': 'emlekezetesseg',
    'emlékezetesség': 'emlekezetesseg',
    'idotallosag': 'idotallosag',
    'időtállóság': 'idotallosag',
    'idotallossag': 'idotallosag', // dupla s
    'univerzalitas': 'univerzalitas',
    'univerzálitás': 'univerzalitas',
    'lathatosag': 'lathatosag',
    'láthatóság': 'lathatosag',
    'lathatasag': 'lathatosag', // typo
  };

  return keyMappings[normalized] || keyMappings[key] || key;
}

/**
 * Clamp and validate a single criteria score
 * Handles variations from brandguideAI:
 * - pont vs pontszam (score key variations)
 * - indoklas (string) vs indoklasok (array)
 */
function clampCriteria(criteria: Record<string, unknown> | undefined, maxPont: number): CriteriaScoreResponse {
  // Handle pont vs pontszam variation - brandguideAI sometimes uses "pontszam" instead of "pont"
  const rawPont = (criteria?.pont as number) ?? (criteria?.pontszam as number) ?? 0;
  const pont = Math.min(Math.max(0, rawPont), maxPont); // Clamp between 0 and maxPont

  // Handle indoklas variations: string or array (indoklasok)
  let indoklas = '';
  if (typeof criteria?.indoklas === 'string') {
    indoklas = criteria.indoklas;
  } else if (Array.isArray(criteria?.indoklasok)) {
    // brandguideAI sometimes returns indoklasok as array - join them
    indoklas = (criteria.indoklasok as string[]).join(' ');
  } else if (Array.isArray(criteria?.indoklas)) {
    // Sometimes indoklas itself is an array
    indoklas = (criteria.indoklas as string[]).join(' ');
  }

  // Handle javaslatok
  const javaslatok = Array.isArray(criteria?.javaslatok) ? criteria.javaslatok as string[] : [];

  return {
    pont,
    maxPont,
    indoklas,
    javaslatok,
  };
}

/**
 * Validate scoring data (full response including new fields)
 * Handles multiple key variations from brandguideAI:
 * - szempontok vs ertekeles
 * - osszpontszam vs osszPontszam vs pipiOsszpipiPontpipiSzam
 * - nested structure like brandguide_ertekeles.szempontok
 */
function validateScoringData(data: Record<string, unknown>): ScoringResponse {
  // Handle nested brandguide_ertekeles structure
  // brandguideAI sometimes wraps everything in brandguide_ertekeles
  let effectiveData = data;
  if (data.brandguide_ertekeles && typeof data.brandguide_ertekeles === 'object') {
    console.log('[VALIDATE] Found nested brandguide_ertekeles structure, unwrapping...');
    effectiveData = data.brandguide_ertekeles as Record<string, unknown>;
  }

  // brandguideAI sometimes uses 'szempontok', sometimes 'ertekeles' - accept both
  const rawSzempontok = (effectiveData.szempontok || effectiveData.ertekeles || {}) as Record<string, unknown>;
  console.log('[VALIDATE] Using szempontok source:', effectiveData.szempontok ? 'szempontok' : effectiveData.ertekeles ? 'ertekeles' : 'empty');

  // Also handle different osszpontszam key variations
  const osszpontszam = (effectiveData.pipiOsszpipiPontpipiSzam || effectiveData.osszpontszam || effectiveData.osszPontszam) as number | undefined;
  console.log('[VALIDATE] Osszpontszam:', osszpontszam);

  // Extract hiresLogo if present (from effectiveData after unwrapping)
  const hiresLogoRaw = effectiveData.hiresLogo as Record<string, unknown> | undefined;

  const normalizedSzempontok: Record<string, Record<string, unknown>> = {};

  for (const [key, value] of Object.entries(rawSzempontok)) {
    const normalizedKey = normalizeCriteriaKey(key);
    if (value && typeof value === 'object') {
      normalizedSzempontok[normalizedKey] = value as Record<string, unknown>;
    }
  }

  // Debug: log which criteria are present/missing
  const expectedKeys = ['megkulonboztethetoseg', 'egyszeruseg', 'alkalmazhatosag', 'emlekezetesseg', 'idotallosag', 'univerzalitas', 'lathatosag'];
  const presentKeys = Object.keys(normalizedSzempontok);
  const missingKeys = expectedKeys.filter(k => !presentKeys.includes(k));

  if (missingKeys.length > 0) {
    console.log('[VALIDATE] Missing criteria after normalization:', missingKeys.join(', '));
    console.log('[VALIDATE] Original keys:', Object.keys(rawSzempontok).join(', '));
    console.log('[VALIDATE] Normalized keys:', presentKeys.join(', '));
    console.log('[VALIDATE] Raw szempontok:', JSON.stringify(rawSzempontok).slice(0, 800));
  }

  // Build validated szempontok with clamped scores
  const szempontok = {
    megkulonboztethetoseg: clampCriteria(normalizedSzempontok.megkulonboztethetoseg, 20),
    egyszeruseg: clampCriteria(normalizedSzempontok.egyszeruseg, 18),
    alkalmazhatosag: clampCriteria(normalizedSzempontok.alkalmazhatosag, 15),
    emlekezetesseg: clampCriteria(normalizedSzempontok.emlekezetesseg, 15),
    idotallosag: clampCriteria(normalizedSzempontok.idotallosag, 12),
    univerzalitas: clampCriteria(normalizedSzempontok.univerzalitas, 10),
    lathatosag: clampCriteria(normalizedSzempontok.lathatosag, 10),
  };

  // Log if any scores were clamped
  const clampedScores: string[] = [];
  if (normalizedSzempontok.lathatosag?.pont && normalizedSzempontok.lathatosag.pont > 10) {
    clampedScores.push(`lathatosag: ${normalizedSzempontok.lathatosag.pont} -> 10`);
  }
  if (normalizedSzempontok.idotallosag?.pont && normalizedSzempontok.idotallosag.pont > 12) {
    clampedScores.push(`idotallosag: ${normalizedSzempontok.idotallosag.pont} -> 12`);
  }
  if (clampedScores.length > 0) {
    console.log('[VALIDATE] Clamped scores:', clampedScores.join(', '));
  }

  return {
    hiresLogo: hiresLogoRaw ? {
      pipiIsmert: (hiresLogoRaw.pipiIsmert as boolean) ?? false,
      pipiMarka: (hiresLogoRaw.pipiMarka as string) ?? null,
      pipiTervezo: (hiresLogoRaw.pipiTervezo as string) ?? null,
      pipiKontextus: (hiresLogoRaw.pipiKontextus as string) ?? null,
    } : undefined,
    // Use normalized osszpontszam that handles multiple key variations
    pipiOsszpipiPontpipiSzam: osszpontszam,
    pipiLogopipitipus: (effectiveData.pipiLogopipitipus || effectiveData.logotipus) as ScoringResponse['pipiLogopipitipus'],
    pipiOsszepipiTekintes: effectiveData.pipiOsszepipiTekintes as string | undefined,
    szempontok,
  };
}

/**
 * Validate summary data
 */
function validateSummaryData(data: Partial<SummaryResponse>): SummaryResponse {
  return {
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
      // STEP 2: brandguideAI - Pontozás (szempontok)
      // ========================================
      console.log('[ANALYZE V3] Step 2: brandguideAI - Pontozás...');
      await sendEvent('status', { message: 'Pontozás (1/3)...', phase: 'scoring' });

      let scoringData: ScoringResponse;
      try {
        const scoringQuery = buildScoringQuery(visionDescription);
        console.log('[ANALYZE V3] Scoring query length:', scoringQuery.length);
        await sendEvent('debug', { message: `[SCORING] Query küldése: ${scoringQuery.length} kar` });

        scoringResponse = await queryBrandguideAI(scoringQuery);
        console.log('[ANALYZE V3] Scoring response length:', scoringResponse.answer.length);
        console.log('[ANALYZE V3] Scoring raw answer first 1000:', scoringResponse.answer.slice(0, 1000));
        await sendEvent('debug', { message: `[SCORING] Válasz: ${scoringResponse.answer.length} kar` });
        await sendEvent('debug', { message: `[SCORING] Első 300: ${scoringResponse.answer.slice(0, 300).replace(/\n/g, ' ')}` });
        await sendEvent('debug', { message: `[SCORING] Utolsó 200: ${scoringResponse.answer.slice(-200).replace(/\n/g, ' ')}` });

        // Parse as Record to capture all keys including variations like 'ertekeles'
        const rawScoringData = parseJSONResponse<Record<string, unknown>>(
          scoringResponse.answer,
          ERROR_MESSAGES.PARSE_ERROR_SCORING
        );
        // Log raw data before validation
        console.log('[ANALYZE V3] Raw scoring data keys:', Object.keys(rawScoringData));
        const szempontokOrErtekeles = rawScoringData.szempontok || rawScoringData.ertekeles;
        console.log('[ANALYZE V3] Raw szempontok/ertekeles:', JSON.stringify(szempontokOrErtekeles || {}).slice(0, 500));
        await sendEvent('debug', { message: `[SCORING] Raw keys: ${Object.keys(rawScoringData).join(', ')}` });
        await sendEvent('debug', { message: `[SCORING] Has ertekeles: ${!!rawScoringData.ertekeles}, Has szempontok: ${!!rawScoringData.szempontok}` });

        scoringData = validateScoringData(rawScoringData);

        // Log each criterion score after validation
        const criteriaScores = Object.entries(scoringData.szempontok).map(([key, val]) => `${key}:${val.pont}`).join(', ');
        await sendEvent('debug', { message: `[SCORING] Validated scores: ${criteriaScores}` });
        await sendEvent('debug', { message: `[SCORING] JSON parsed OK` });

        const osszpontszam = calculateTotalScore(scoringData.szempontok);
        console.log('[ANALYZE V3] Scoring total:', osszpontszam);
        await sendEvent('debug', { message: `[SCORING] Összpontszám: ${osszpontszam}` });
        if (scoringData.pipiOsszpipiPontpipiSzam) {
          console.log('[ANALYZE V3] AI suggested total:', scoringData.pipiOsszpipiPontpipiSzam);
        }
        if (scoringData.hiresLogo?.pipiIsmert) {
          console.log('[ANALYZE V3] Famous logo detected:', scoringData.hiresLogo.pipiMarka);
        }
      } catch (error) {
        await sendEvent('debug', { message: `[SCORING] HIBA: ${error instanceof Error ? error.message : 'ismeretlen'}` });
        if (error instanceof BrandguideAPIError) {
          throw new Error(`brandguideAI hiba: ${error.message}`);
        }
        throw error;
      }

      // ========================================
      // STEP 3: brandguideAI - Összefoglaló + Erősségek + Fejlesztendő
      // ========================================
      console.log('[ANALYZE V3] Step 3: brandguideAI - Összefoglaló...');
      await sendEvent('status', { message: 'Összefoglaló (2/3)...', phase: 'summary' });

      let summaryData: SummaryResponse;
      try {
        // Pass calculated scoring result to summary for consistency
        // Always use calculated score, not AI suggested (which can be inconsistent)
        const calculatedOsszpontszam = calculateTotalScore(scoringData.szempontok);
        const summaryQuery = buildSummaryQuery(visionDescription, {
          osszpontszam: calculatedOsszpontszam,
          logoTipus: scoringData.pipiLogopipitipus || 'klasszikus_logo'
        });
        console.log('[ANALYZE V3] Summary query length:', summaryQuery.length);
        await sendEvent('debug', { message: `[SUMMARY] Query küldése: ${summaryQuery.length} kar` });

        const summaryResponse = await queryBrandguideAI(summaryQuery);
        console.log('[ANALYZE V3] Summary response length:', summaryResponse.answer.length);
        await sendEvent('debug', { message: `[SUMMARY] Válasz: ${summaryResponse.answer.length} kar` });

        const rawSummaryData = parseJSONResponse<Partial<SummaryResponse>>(
          summaryResponse.answer,
          'Nem sikerült feldolgozni az összefoglaló válaszát'
        );
        summaryData = validateSummaryData(rawSummaryData);
        await sendEvent('debug', { message: `[SUMMARY] JSON parsed OK` });
      } catch (error) {
        await sendEvent('debug', { message: `[SUMMARY] HIBA: ${error instanceof Error ? error.message : 'ismeretlen'}` });
        if (error instanceof BrandguideAPIError) {
          throw new Error(`brandguideAI hiba: ${error.message}`);
        }
        throw error;
      }

      // ========================================
      // STEP 4: brandguideAI - Szöveges elemzések
      // ========================================
      console.log('[ANALYZE V3] Step 4: brandguideAI - Szöveges elemzések...');
      await sendEvent('status', { message: 'Részletes elemzés (3/3)...', phase: 'details' });

      let detailsData: DetailsResponse;
      try {
        const detailsQuery = buildDetailsQuery(visionDescription);
        console.log('[ANALYZE V3] Details query length:', detailsQuery.length);
        await sendEvent('debug', { message: `[DETAILS] Query küldése: ${detailsQuery.length} kar` });

        const detailsResponse = await queryBrandguideAI(detailsQuery);
        console.log('[ANALYZE V3] Details response length:', detailsResponse.answer.length);
        await sendEvent('debug', { message: `[DETAILS] Válasz: ${detailsResponse.answer.length} kar` });

        const rawDetailsData = parseJSONResponse<Partial<DetailsResponse>>(
          detailsResponse.answer,
          ERROR_MESSAGES.PARSE_ERROR_DETAILS
        );
        detailsData = validateDetailsData(rawDetailsData);
        await sendEvent('debug', { message: `[DETAILS] JSON parsed OK` });
      } catch (error) {
        await sendEvent('debug', { message: `[DETAILS] HIBA: ${error instanceof Error ? error.message : 'ismeretlen'}` });
        if (error instanceof BrandguideAPIError) {
          throw new Error(`brandguideAI hiba: ${error.message}`);
        }
        throw error;
      }

      // ========================================
      // STEP 5: Összefűzés + Validálás
      // ========================================
      console.log('[ANALYZE V3] Step 5: Összefűzés és validálás...');
      await sendEvent('status', { message: 'Eredmények feldolgozása...', phase: 'processing' });

      // Calculate total score - ALWAYS calculate from criteria for consistency
      // brandguideAI sometimes returns inconsistent osszpontszam (e.g., says 92 but criteria sum to 100)
      const calculatedScore = calculateTotalScore(scoringData.szempontok);
      const aiSuggestedScore = scoringData.pipiOsszpipiPontpipiSzam;

      // Log if there's a mismatch between AI suggested and calculated
      if (aiSuggestedScore && Math.abs(aiSuggestedScore - calculatedScore) > 2) {
        console.log(`[ANALYZE V3] Score mismatch: AI suggested ${aiSuggestedScore}, calculated ${calculatedScore} - using calculated`);
        await sendEvent('debug', { message: `[SCORING] AI: ${aiSuggestedScore}, Számolt: ${calculatedScore} - számoltat használjuk` });
      }

      const osszpontszam = calculatedScore;
      const minosites = getRatingFromScore(osszpontszam);

      // Build the result object with new fields
      const result: AnalysisResult & {
        sources?: BrandguideResponse['sources'];
        hiresLogo?: ScoringResponse['hiresLogo'];
        logoTipus?: ScoringResponse['pipiLogopipitipus'];
        aiOsszpipiTekintes?: string;
      } = {
        id: '',
        osszpontszam,
        minosites,
        szempontok: scoringData.szempontok,
        osszegzes: scoringData.pipiOsszepipiTekintes || summaryData.osszegzes,
        erossegek: summaryData.erossegek,
        fejlesztendo: summaryData.fejlesztendo,
        szinek: detailsData.szinek,
        tipografia: detailsData.tipografia,
        vizualisNyelv: detailsData.vizualisNyelv,
        createdAt: new Date().toISOString(),
        testLevel: 'detailed',
        // New fields
        hiresLogo: scoringData.hiresLogo,
        logoTipus: scoringData.pipiLogopipitipus,
        aiOsszpipiTekintes: scoringData.pipiOsszepipiTekintes,
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

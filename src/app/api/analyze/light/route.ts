/**
 * Logo Analyzer Light API
 *
 * Ingyenes Light tier elemzés — 2 AI hívás (Vision + 1× KB-Extract)
 *
 * Flow:
 * 1. Logo lekérése DB-ből az analysisId alapján
 * 2. Claude Vision → visionDescription
 * 3. Egyetlen KB-Extract hívás (Light séma: pont/maxPont + összefoglaló)
 * 4. DB UPDATE: result, vision_description, status='completed'
 * 5. SSE complete event
 */

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120; // 120s (Vision + KB-Extract + buffer)

import { getSupabaseAdmin } from '@/lib/supabase';
import {
  analyzeImageWithVision,
  queryKBExtract,
  BrandguideAPIError,
  ERROR_MESSAGES,
} from '@/lib/brandguide-api';
import {
  buildLightScoringQuery,
  KB_EXTRACT_LIGHT_SCHEMA,
  getRatingFromScore,
  isValidTextItem,
} from '@/lib/prompts-v2';

// ============================================================================
// TYPES
// ============================================================================

interface LightSzempontItem {
  pont: number;
  maxPont: number;
}

interface KBExtractLightDataRaw {
  scoring: {
    osszpontszam: number;
    logotipus: 'klasszikus_logo' | 'kampany_badge' | 'illusztracio_jellegu';
    szempontok: {
      megkulonboztethetoseg: LightSzempontItem;
      egyszeruseg: LightSzempontItem;
      alkalmazhatosag: LightSzempontItem;
      emlekezetesseg: LightSzempontItem;
      idotallosag: LightSzempontItem;
      univerzalitas: LightSzempontItem;
      lathatosag: LightSzempontItem;
    };
  };
  summary: {
    osszegzes: string;
    erossegek: string[];
    fejlesztendo: string[];
    minosites: string;
  };
}

type SzempontKey = keyof KBExtractLightDataRaw['scoring']['szempontok'];

// ============================================================================
// HELPERS
// ============================================================================

const SZEMPONT_ORDER: SzempontKey[] = [
  'megkulonboztethetoseg', 'egyszeruseg', 'alkalmazhatosag',
  'emlekezetesseg', 'idotallosag', 'univerzalitas', 'lathatosag'
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

function calculateTotalScore(szempontok: KBExtractLightDataRaw['scoring']['szempontok']): number {
  return SZEMPONT_ORDER.reduce((sum, key) => sum + (szempontok[key]?.pont || 0), 0);
}

function clampSzempontok(szempontok: KBExtractLightDataRaw['scoring']['szempontok']): KBExtractLightDataRaw['scoring']['szempontok'] {
  const clamped = { ...szempontok };
  for (const key of SZEMPONT_ORDER) {
    const maxPont = MAX_VALUES[key];
    clamped[key] = {
      pont: Math.min(Math.max(0, clamped[key]?.pont || 0), maxPont),
      maxPont,
    };
  }
  return clamped;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { analysisId } = body as { analysisId?: string };

  if (!analysisId) {
    return new Response(
      JSON.stringify({ error: 'analysisId megadása kötelező' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Fetch logo from DB
  const { data: existingAnalysis, error: fetchError } = await (getSupabaseAdmin()
    .from('analyses') as any)
    .select('logo_base64, logo_original_path, vision_description')
    .eq('id', analysisId)
    .single();

  if (fetchError || !existingAnalysis?.logo_base64) {
    console.error('[LIGHT] Failed to fetch logo from DB:', fetchError);
    return new Response(
      JSON.stringify({ error: 'Elemzés nem található vagy nincs logó' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const logo: string = existingAnalysis.logo_base64;

  // Determine media type from original path
  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/png';
  if (existingAnalysis.logo_original_path) {
    const ext = existingAnalysis.logo_original_path.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') mediaType = 'image/jpeg';
    else if (ext === 'webp') mediaType = 'image/webp';
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (event: string, data: unknown) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };

  // Heartbeat using DATA events (not SSE comments) to keep Netlify gateway alive
  let heartbeatRunning = true;
  let heartbeatResolve: (() => void) | null = null;
  const heartbeatStopped = new Promise<void>(r => { heartbeatResolve = r; });
  const startHeartbeat = () => {
    (async () => {
      while (heartbeatRunning) {
        try {
          await writer.write(encoder.encode(`event: heartbeat\ndata: {"ts":${Date.now()}}\n\n`));
        } catch {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      heartbeatResolve?.();
    })();
  };
  const stopHeartbeat = async () => {
    heartbeatRunning = false;
    await heartbeatStopped;
  };

  const responsePromise = (async () => {
    try {
      startHeartbeat();
      await sendEvent('status', { message: 'Light elemzés indítása...', phase: 'start' });

      // ========================================
      // STEP 1: Claude Vision
      // ========================================
      console.log('[LIGHT] Step 1: Claude Vision...');
      await sendEvent('status', { message: 'Kép feldolgozása...', phase: 'vision' });

      let visionDescription: string;

      // Ha már van cache-elt vision_description, azt használjuk
      if (existingAnalysis.vision_description) {
        visionDescription = existingAnalysis.vision_description;
        console.log('[LIGHT] Vision description from cache:', visionDescription.length, 'chars');
        await sendEvent('debug', { message: `[VISION] Cache-ből: ${visionDescription.length} kar` });
      } else {
        try {
          visionDescription = await analyzeImageWithVision(logo, mediaType);
          console.log('[LIGHT] Vision description length:', visionDescription.length);
          await sendEvent('debug', { message: `[VISION] Leírás kész: ${visionDescription.length} kar` });
        } catch (visionError: unknown) {
          const errorMessage = visionError instanceof Error ? visionError.message : String(visionError);
          console.error('[LIGHT] Vision error:', errorMessage);
          throw new Error(`Claude Vision hiba: ${errorMessage}`);
        }
      }

      // ========================================
      // STEP 2: KB-Extract (egyetlen Light hívás)
      // ========================================
      console.log('[LIGHT] Step 2: KB-Extract Light...');
      await sendEvent('status', { message: 'Elemzés folyamatban...', phase: 'analysis' });

      let lightData: KBExtractLightDataRaw;

      try {
        const lightQuery = buildLightScoringQuery();
        console.log('[LIGHT] Query length:', lightQuery.length);
        await sendEvent('debug', { message: '[KB-EXTRACT] Light hívás indítása...' });

        const lightResponse = await queryKBExtract<KBExtractLightDataRaw>(
          lightQuery,
          visionDescription,
          KB_EXTRACT_LIGHT_SCHEMA,
          'best_effort',
          { max_sources: 3, language: 'hu' }
        );

        lightData = lightResponse.data;
        console.log('[LIGHT] KB-Extract OK, tokens:', lightResponse.meta?.tokens_used);
        await sendEvent('debug', { message: `[KB-EXTRACT] OK, tokens: ${lightResponse.meta?.tokens_used}` });

        // Check for missing szempontok
        const missingKeys = SZEMPONT_ORDER.filter(key => !lightData.scoring.szempontok[key]);
        if (missingKeys.length > 0) {
          console.error(`[LIGHT] Missing ${missingKeys.length} szempontok: ${missingKeys.join(', ')}`);
          throw new Error(`Hiányos elemzés: ${missingKeys.length} szempont hiányzik (${missingKeys.join(', ')}). Kérlek próbáld újra.`);
        }

      } catch (error) {
        await sendEvent('debug', { message: `[KB-EXTRACT] HIBA: ${error instanceof Error ? error.message : 'ismeretlen'}` });
        if (error instanceof BrandguideAPIError) {
          throw new Error(`brandguideAI hiba: ${error.message}`);
        }
        throw error;
      }

      // ========================================
      // STEP 3: Validálás
      // ========================================
      console.log('[LIGHT] Step 3: Validálás...');
      await sendEvent('status', { message: 'Eredmények feldolgozása...', phase: 'processing' });

      const clampedSzempontok = clampSzempontok(lightData.scoring.szempontok);
      const calculatedScore = calculateTotalScore(clampedSzempontok);
      const aiSuggestedScore = lightData.scoring.osszpontszam;

      if (Math.abs(aiSuggestedScore - calculatedScore) > 2) {
        console.log(`[LIGHT] Score mismatch: AI=${aiSuggestedScore}, Calculated=${calculatedScore} - using calculated`);
        await sendEvent('debug', { message: `[VALIDATE] AI: ${aiSuggestedScore}, Számolt: ${calculatedScore}` });
      }

      const osszpontszam = calculatedScore;
      const minosites = lightData.summary.minosites || getRatingFromScore(osszpontszam);

      // Build Light result (nincs szinek/tipografia/vizualisNyelv)
      const result = {
        osszpontszam,
        minosites,
        osszegzes: lightData.summary.osszegzes || '',
        erossegek: Array.isArray(lightData.summary.erossegek) ? lightData.summary.erossegek.filter(isValidTextItem) : [],
        fejlesztendo: Array.isArray(lightData.summary.fejlesztendo) ? lightData.summary.fejlesztendo.filter(isValidTextItem) : [],
        szempontok: clampedSzempontok,
        logoTipus: lightData.scoring.logotipus,
        testLevel: 'basic',
      };

      // ========================================
      // STEP 4: Supabase mentés
      // ========================================
      console.log('[LIGHT] Step 4: Supabase mentés...');
      await sendEvent('status', { message: 'Mentés adatbázisba...', phase: 'saving' });

      const updatePayload: Record<string, unknown> = {
        result: result as unknown as Record<string, unknown>,
        status: 'completed',
        completed_at: new Date().toISOString(),
        test_level: 'basic',
      };

      // vision_description cache mentése (ha nem volt még)
      if (!existingAnalysis.vision_description) {
        updatePayload.vision_description = visionDescription;
      }

      const { error: dbError } = await (getSupabaseAdmin()
        .from('analyses') as any)
        .update(updatePayload)
        .eq('id', analysisId);

      if (dbError) {
        console.error('[LIGHT] Supabase update error:', JSON.stringify(dbError));
        await sendEvent('debug', { message: `[DB] Update hiba: ${dbError.message}` });
        throw new Error(ERROR_MESSAGES.DB_SAVE_ERROR);
      }

      console.log('[LIGHT] Analysis saved:', analysisId);

      // Email notification (fire-and-forget, de stream-ben maradunk)
      const emailNotifyPromise = (async () => {
        try {
          const secret = process.env.EDGE_FUNCTION_SECRET;
          if (!secret) {
            console.warn('[LIGHT] EDGE_FUNCTION_SECRET not set, skipping email notification');
            return;
          }
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://logolab.hu';
          const res = await fetch(`${appUrl}/api/email/analysis-notify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${secret}`,
            },
            body: JSON.stringify({ analysisId, status: 'completed' }),
          });
          console.log('[LIGHT] Email notification response:', res.status);
        } catch (err) {
          console.error('[LIGHT] Email notification error:', err);
        }
      })();

      await stopHeartbeat();
      await sendEvent('complete', { id: analysisId, result });
      // Megvárjuk az email küldést mielőtt lezárnánk a stream-et (serverless életben marad)
      await emailNotifyPromise;
      await writer.close();

    } catch (error) {
      await stopHeartbeat();
      console.error('[LIGHT] Error:', error);
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

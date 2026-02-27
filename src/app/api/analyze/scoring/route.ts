/**
 * Logo Analyzer - Scoring step
 *
 * Csak a scoring KB-Extract hívás. SSE heartbeat-tel tartja életben a kapcsolatot.
 * A kliens a Vision után hívja, és a válaszból kapja a scoring adatokat.
 *
 * Netlify function limit: 60s — a scoring ~55s, épp belefér.
 */

import { NextRequest } from 'next/server';
import {
  queryKBExtract,
  KBExtractSource,
} from '@/lib/brandguide-api';
import {
  buildScoringExtractQuery,
  KB_EXTRACT_SCORING_SCHEMA,
} from '@/lib/prompts-v2';

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

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { visionDescription } = body as { visionDescription: string };

  if (!visionDescription) {
    return new Response(
      JSON.stringify({ error: 'Vision leírás megadása kötelező' }),
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
      console.error('[SCORING] sendEvent failed:', e);
    }
  };

  // Heartbeat data event-tel (Netlify gateway)
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
      await sendEvent('status', { message: 'Pontozás folyamatban...', phase: 'scoring' });

      const scoringQuery = buildScoringExtractQuery();
      console.log('[SCORING] Query length:', scoringQuery.length);

      const scoringResponse = await queryKBExtract<KBExtractScoringData>(
        scoringQuery,
        visionDescription,
        KB_EXTRACT_SCORING_SCHEMA,
        'best_effort',
        { max_sources: 5, language: 'hu' }
      );

      console.log('[SCORING] Tokens used:', scoringResponse.meta?.tokens_used);

      heartbeatRunning = false;
      await heartbeatStopped;
      await sendEvent('complete', {
        scoring: scoringResponse.data.scoring,
        sources: scoringResponse.sources || [],
        tokens: scoringResponse.meta?.tokens_used,
      });
      await writer.close();

    } catch (error) {
      heartbeatRunning = false;
      await heartbeatStopped;
      console.error('[SCORING] Error:', error);
      await sendEvent('error', {
        message: error instanceof Error ? error.message : 'Scoring hiba'
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

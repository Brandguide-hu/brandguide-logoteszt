/**
 * Logo Analyzer - Step 1: Vision
 *
 * Claude Vision "Vakvezető Designer" leírás generálása.
 * Külön route, hogy ne lépje túl a Netlify function timeout-ot.
 */

import { NextRequest } from 'next/server';
import { analyzeImageWithVision } from '@/lib/brandguide-api';

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

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (event: string, data: unknown) => {
    try {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch (e) {
      console.error('[VISION] sendEvent failed:', e);
    }
  };

  // Active heartbeat loop
  let heartbeatRunning = true;
  const heartbeatLoop = async () => {
    while (heartbeatRunning) {
      try {
        await writer.write(encoder.encode(': heartbeat\n\n'));
      } catch {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };
  const heartbeatPromise = heartbeatLoop();

  const responsePromise = (async () => {
    try {
      await sendEvent('status', { message: 'Kép feldolgozása...', phase: 'vision' });

      console.log('[VISION] Starting Claude Vision analysis...');
      const visionDescription = await analyzeImageWithVision(logo, mediaType, colors, fontName);
      console.log('[VISION] Description length:', visionDescription.length);

      heartbeatRunning = false;
      await sendEvent('complete', { visionDescription });
      await writer.close();
    } catch (error) {
      heartbeatRunning = false;
      console.error('[VISION] Error:', error);
      await sendEvent('error', {
        message: error instanceof Error ? error.message : 'Vision hiba'
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

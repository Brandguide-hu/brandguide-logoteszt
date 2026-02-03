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
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };

  // Heartbeat to keep connection alive
  const heartbeatInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode(': heartbeat\n\n'));
    } catch { /* stream closed */ }
  }, 3000);

  const responsePromise = (async () => {
    try {
      await sendEvent('status', { message: 'Kép feldolgozása...', phase: 'vision' });

      console.log('[VISION] Starting Claude Vision analysis...');
      const visionDescription = await analyzeImageWithVision(logo, mediaType, colors, fontName);
      console.log('[VISION] Description length:', visionDescription.length);

      clearInterval(heartbeatInterval);
      await sendEvent('complete', { visionDescription });
      await writer.close();
    } catch (error) {
      clearInterval(heartbeatInterval);
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

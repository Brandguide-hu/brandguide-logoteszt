/**
 * Debug route - SSE timeout tester
 * Sends heartbeats until the function dies, to measure exact Netlify timeout
 */

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const start = Date.now();

  const responsePromise = (async () => {
    try {
      let count = 0;
      while (true) {
        count++;
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        await writer.write(encoder.encode(`data: {"count":${count},"elapsed":"${elapsed}s"}\n\n`));
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[DEBUG] Stream ended after ${elapsed}s: ${error}`);
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

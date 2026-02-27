/**
 * Trigger endpoint - indítja a background function-t és azonnal 202-t ad
 *
 * A kliens a Vision SSE után hívja ezt az endpointot.
 * Ez meghívja a Netlify background function-t (15 perc limit),
 * ami elvégzi a scoring + summary + DB save-et.
 * A kliens ezután pollolja a DB-t.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { visionDescription, logo, analysisId } = body as {
    visionDescription: string;
    logo: string;
    analysisId?: string;
  };

  if (!visionDescription) {
    return NextResponse.json({ error: 'visionDescription kötelező' }, { status: 400 });
  }

  // Background function URL — Netlify-on a /.netlify/functions/ prefix-szel érhető el
  const bgFunctionUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://logolab.hu'}/.netlify/functions/analyze-background`;

  console.log('[TRIGGER] Calling background function:', bgFunctionUrl);
  console.log('[TRIGGER] analysisId:', analysisId, 'visionDescription length:', visionDescription.length);

  // Fire-and-forget: meghívjuk a background function-t, de NEM várjuk meg
  // A Netlify automatikusan 202-t ad a background function-nek
  fetch(bgFunctionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visionDescription, logo, analysisId }),
  }).catch(err => {
    console.error('[TRIGGER] Background function call failed:', err);
  });

  return NextResponse.json(
    { success: true, message: 'Analysis started in background' },
    { status: 202 }
  );
}

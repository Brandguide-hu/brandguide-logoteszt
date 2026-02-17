import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 perc max

/**
 * POST /api/analysis/[id]/start
 * Elemzés indítása — a dashboard-ról hívható pending státuszú elemzéseknél.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: analysisId } = await params;

  // Auth ellenőrzés
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  // Elemzés lekérése és ellenőrzése
  const { data: analysis, error: fetchError } = await (admin
    .from('analyses') as any)
    .select('id, user_id, status, tier, logo_base64, logo_original_path')
    .eq('id', analysisId)
    .single();

  if (fetchError || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  if (analysis.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (analysis.status !== 'pending') {
    return NextResponse.json({ error: 'Analysis is not in pending state' }, { status: 400 });
  }

  // Logó base64 kinyerése
  let base64 = analysis.logo_base64;
  let mediaType = 'image/png';

  if (!base64 && analysis.logo_original_path) {
    // Storage-ból letöltés
    const { data: fileData } = await admin.storage
      .from('logos')
      .download(analysis.logo_original_path);

    if (fileData) {
      const buffer = Buffer.from(await fileData.arrayBuffer());
      base64 = buffer.toString('base64');
      mediaType = fileData.type || 'image/png';
    }
  }

  if (!base64) {
    return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
  }

  // Státusz frissítése processing-re
  await (admin.from('analyses') as any)
    .update({ status: 'processing' })
    .eq('id', analysisId);

  // Elemzés indítás háttérben
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://logolab.hu';

  fetch(`${appUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      logo: base64,
      mediaType,
      testLevel: 'detailed',
      analysisId,
    }),
  }).catch(err => {
    console.error('[START] Analysis trigger error:', err);
  });

  return NextResponse.json({ success: true, status: 'processing' });
}

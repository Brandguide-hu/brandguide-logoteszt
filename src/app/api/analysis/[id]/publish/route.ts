import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

/**
 * POST /api/analysis/[id]/publish
 * Publikálja az elemzést a galériába (visibility: 'pending_approval').
 * Csak a tulajdonos és csak fizetett (paid/consultation) elemzéseknél.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: analysisId } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nem vagy bejelentkezve' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  // Elemzés lekérése + ownership check
  const { data: analysis, error } = await (admin
    .from('analyses') as any)
    .select('id, user_id, tier, status, visibility')
    .eq('id', analysisId)
    .single();

  if (error || !analysis) {
    return NextResponse.json({ error: 'Elemzés nem található' }, { status: 404 });
  }

  if (analysis.user_id !== user.id) {
    return NextResponse.json({ error: 'Nincs jogosultságod' }, { status: 403 });
  }

  if (analysis.tier !== 'paid' && analysis.tier !== 'consultation') {
    return NextResponse.json({ error: 'Csak fizetett elemzés publikálható' }, { status: 400 });
  }

  if (analysis.status !== 'completed') {
    return NextResponse.json({ error: 'Csak kész elemzés publikálható' }, { status: 400 });
  }

  if (analysis.visibility !== 'private') {
    return NextResponse.json({ error: 'Az elemzés már publikálásra került' }, { status: 400 });
  }

  // Visibility átállítás pending_approval-ra
  const { error: updateError } = await (admin
    .from('analyses') as any)
    .update({ visibility: 'pending_approval' })
    .eq('id', analysisId);

  if (updateError) {
    console.error('[PUBLISH] Update error:', updateError);
    return NextResponse.json({ error: 'Hiba a publikálás során' }, { status: 500 });
  }

  return NextResponse.json({ success: true, visibility: 'pending_approval' });
}

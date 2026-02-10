import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * POST /api/analysis/[id]/share
 * Share hash generálása paid/consultation tier elemzésekhez.
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

  // Elemzés lekérése
  const { data: analysis, error: fetchError } = await (admin
    .from('analyses') as any)
    .select('id, user_id, tier, share_hash')
    .eq('id', analysisId)
    .single();

  if (fetchError || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  if (analysis.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Ha már van share_hash, visszaadjuk
  if (analysis.share_hash) {
    return NextResponse.json({ shareHash: analysis.share_hash });
  }

  // Csak paid/consultation tier-nél engedélyezett
  if (analysis.tier === 'free') {
    return NextResponse.json({ error: 'Share hash not available for free tier' }, { status: 403 });
  }

  // Új share hash generálása
  const shareHash = crypto.randomBytes(16).toString('hex');

  const { error: updateError } = await (admin.from('analyses') as any)
    .update({ share_hash: shareHash })
    .eq('id', analysisId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to generate share hash' }, { status: 500 });
  }

  return NextResponse.json({ shareHash });
}

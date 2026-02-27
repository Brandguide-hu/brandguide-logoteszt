import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

/**
 * PATCH /api/analysis/[id]/metadata
 * Frissíti a logó nevét, alkotóját és kategóriáját.
 * - Saját elemzésnél: bejelentkezett user
 * - Admin: bárki is_admin=true
 */
export async function PATCH(
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

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { logo_name, creator_name, category } = body as {
    logo_name?: string;
    creator_name?: string;
    category?: string;
  };

  // Legalább egy mezőt meg kell adni
  if (logo_name === undefined && creator_name === undefined && category === undefined) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Lekérjük az elemzést: user_id + is_admin check
  const { data: analysis, error: fetchError } = await (admin
    .from('analyses') as any)
    .select('id, user_id')
    .eq('id', analysisId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  // Jogosultság: saját elemzés VAGY admin
  const isOwner = analysis.user_id === user.id;
  if (!isOwner) {
    // Admin check
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Update
  const updates: Record<string, string> = {};
  if (logo_name !== undefined) updates.logo_name = logo_name.trim();
  if (creator_name !== undefined) updates.creator_name = creator_name.trim();
  if (category !== undefined) updates.category = category;

  const { error: updateError } = await (admin
    .from('analyses') as any)
    .update(updates)
    .eq('id', analysisId);

  if (updateError) {
    console.error('[METADATA] Update error:', updateError);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: updates });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Verify admin status
async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.split(' ')[1];
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;

  const adminSupabase = getAdminSupabase();
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return null;
  return user;
}

// GET: Stats + pending approvals + all analyses
export async function GET(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  const action = req.nextUrl.searchParams.get('action') || 'dashboard';

  if (action === 'dashboard') {
    // Stats
    const [
      { count: totalAnalyses },
      { count: pendingApprovals },
      { count: publicAnalyses },
      { count: totalUsers },
      { count: paidAnalyses },
    ] = await Promise.all([
      supabase.from('analyses').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('analyses').select('*', { count: 'exact', head: true }).eq('visibility', 'pending_approval').is('deleted_at', null),
      supabase.from('analyses').select('*', { count: 'exact', head: true }).eq('visibility', 'public').is('deleted_at', null),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('analyses').select('*', { count: 'exact', head: true }).neq('tier', 'free').is('deleted_at', null),
    ]);

    return NextResponse.json({
      stats: {
        totalAnalyses: totalAnalyses || 0,
        pendingApprovals: pendingApprovals || 0,
        publicAnalyses: publicAnalyses || 0,
        totalUsers: totalUsers || 0,
        paidAnalyses: paidAnalyses || 0,
      },
    });
  }

  if (action === 'pending') {
    const { data } = await supabase
      .from('analyses')
      .select('id, logo_name, creator_name, category, tier, logo_base64, result, created_at, user_id')
      .eq('visibility', 'pending_approval')
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    return NextResponse.json({ analyses: data || [] });
  }

  if (action === 'all') {
    const { data } = await supabase
      .from('analyses')
      .select('id, logo_name, creator_name, category, tier, status, visibility, is_weekly_winner, result, created_at, user_id')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    return NextResponse.json({ analyses: data || [] });
  }

  if (action === 'users') {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, email, is_admin, is_email_verified, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    // Felhasználónkénti elemzés számok
    const { data: analyses } = await supabase
      .from('analyses')
      .select('user_id, tier')
      .is('deleted_at', null);

    const userStats: Record<string, { total: number; paid: number }> = {};
    for (const a of analyses || []) {
      if (!userStats[a.user_id]) userStats[a.user_id] = { total: 0, paid: 0 };
      userStats[a.user_id].total++;
      if (a.tier !== 'free') userStats[a.user_id].paid++;
    }

    const users = (data || []).map(u => ({
      ...u,
      analysisCount: userStats[u.id]?.total || 0,
      paidCount: userStats[u.id]?.paid || 0,
    }));

    return NextResponse.json({ users });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// POST: Admin actions (approve, reject, set weekly winner)
export async function POST(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { action, analysisId, reason } = body;
  const supabase = getAdminSupabase();

  if (action === 'approve') {
    const { error } = await supabase
      .from('analyses')
      .update({ visibility: 'public' })
      .eq('id', analysisId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'reject') {
    const { error } = await supabase
      .from('analyses')
      .update({ visibility: 'rejected', rejection_reason: reason || null })
      .eq('id', analysisId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'set_weekly_winner') {
    // Clear existing winner
    await supabase
      .from('analyses')
      .update({ is_weekly_winner: false, weekly_winner_date: null })
      .eq('is_weekly_winner', true);

    // Set new winner
    const { error } = await supabase
      .from('analyses')
      .update({
        is_weekly_winner: true,
        weekly_winner_date: new Date().toISOString(),
      })
      .eq('id', analysisId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

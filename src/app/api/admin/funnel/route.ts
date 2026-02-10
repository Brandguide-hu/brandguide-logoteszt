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

/**
 * GET /api/admin/funnel?days=7
 * Feltöltési funnel statisztikák
 */
export async function GET(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const days = parseInt(req.nextUrl.searchParams.get('days') || '7', 10);
  const supabase = getAdminSupabase();

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Funnel lépések számolása
  const eventTypes = [
    'page_view',
    'tier_selected',
    'logo_selected',
    'form_filled',
    'submit_clicked',
    'auth_started',
    'stripe_redirect',
    'completed',
    'abandoned',
  ];

  const counts: Record<string, number> = {};

  for (const eventType of eventTypes) {
    const { count } = await supabase
      .from('upload_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', eventType)
      .gte('created_at', since.toISOString());

    counts[eventType] = count || 0;
  }

  // Unique sessions
  const { data: sessions } = await supabase
    .from('upload_events')
    .select('session_id')
    .gte('created_at', since.toISOString());

  const uniqueSessions = new Set((sessions || []).map(s => s.session_id)).size;

  // Konverziós ráták
  const funnel = eventTypes
    .filter(t => t !== 'abandoned')
    .map((eventType, index, arr) => {
      const count = counts[eventType] || 0;
      const prevCount = index > 0 ? counts[arr[index - 1]] || 0 : count;
      const rate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
      return {
        step: eventType,
        count,
        conversionRate: index > 0 ? rate : 100,
      };
    });

  return NextResponse.json({
    days,
    uniqueSessions,
    abandoned: counts['abandoned'] || 0,
    funnel,
  });
}

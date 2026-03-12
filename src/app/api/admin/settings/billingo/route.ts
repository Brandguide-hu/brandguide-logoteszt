import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

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

export async function GET(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'billingo_draft_mode')
    .single();

  return NextResponse.json({
    draft_mode: data?.value !== 'false', // default: true (draft)
  });
}

export async function POST(req: NextRequest) {
  const user = await verifyAdmin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { draft_mode } = await req.json();

  const supabase = getAdminSupabase();

  // Upsert: ha nincs még a sor, létrehozzuk
  const { error } = await supabase
    .from('site_settings')
    .upsert({
      key: 'billingo_draft_mode',
      value: draft_mode ? 'true' : 'false',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, draft_mode });
}

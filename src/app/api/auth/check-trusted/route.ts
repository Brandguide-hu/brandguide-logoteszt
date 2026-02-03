import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// POST: Trusted browser token ellenőrzés
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { trustedToken } = await req.json();
  if (!trustedToken) {
    return NextResponse.json({ trusted: false });
  }

  const adminSupabase = getAdminSupabase();
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('is_admin, trusted_browsers')
    .eq('id', user.id)
    .single() as any;

  if (!profile?.is_admin) {
    return NextResponse.json({ trusted: false });
  }

  const browsers = Array.isArray(profile.trusted_browsers) ? profile.trusted_browsers : [];
  const match = browsers.find(
    (b: any) => b.token === trustedToken && new Date(b.expires_at) > new Date()
  );

  return NextResponse.json({ trusted: !!match });
}

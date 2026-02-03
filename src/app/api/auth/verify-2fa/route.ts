import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// POST: 2FA kód ellenőrzés
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

  const { code, trustBrowser } = await req.json();
  if (!code) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  }

  const adminSupabase = getAdminSupabase();
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('is_admin, admin_2fa_code, admin_2fa_expires_at, trusted_browsers')
    .eq('id', user.id)
    .single() as any;

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Not an admin' }, { status: 403 });
  }

  // Kód ellenőrzés
  if (!profile.admin_2fa_code || profile.admin_2fa_code !== code) {
    return NextResponse.json({ error: 'Hibás kód' }, { status: 400 });
  }

  // Lejárat ellenőrzés
  if (new Date(profile.admin_2fa_expires_at) < new Date()) {
    return NextResponse.json({ error: 'A kód lejárt' }, { status: 400 });
  }

  // Kód törlése (egyszeri felhasználás)
  await adminSupabase
    .from('profiles')
    .update({
      admin_2fa_code: null,
      admin_2fa_expires_at: null,
    } as any)
    .eq('id', user.id);

  // Trusted browser token generálás (opcionális)
  let trustedToken: string | null = null;
  if (trustBrowser) {
    trustedToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 nap

    const trustedBrowsers = Array.isArray(profile.trusted_browsers) ? profile.trusted_browsers : [];
    trustedBrowsers.push({
      token: trustedToken,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

    // Max 5 trusted browser, régieket töröljük
    const validBrowsers = trustedBrowsers
      .filter((b: any) => new Date(b.expires_at) > new Date())
      .slice(-5);

    await adminSupabase
      .from('profiles')
      .update({ trusted_browsers: validBrowsers } as any)
      .eq('id', user.id);
  }

  return NextResponse.json({
    success: true,
    trustedToken,
  });
}

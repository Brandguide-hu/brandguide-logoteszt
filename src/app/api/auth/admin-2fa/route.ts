import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// POST: 2FA kód generálás és küldés
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

  const adminSupabase = getAdminSupabase();
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('is_admin, display_name')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Not an admin' }, { status: 403 });
  }

  // 6 jegyű kód generálás
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 perc

  // Kód mentése a profiles táblába
  await adminSupabase
    .from('profiles')
    .update({
      admin_2fa_code: code,
      admin_2fa_expires_at: expiresAt,
    } as any)
    .eq('id', user.id);

  // Email küldése
  const subject = 'Bejelentkezési kód – LogoLab Admin';
  const html = `
<!DOCTYPE html>
<html lang="hu">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="margin-bottom:24px;">
        <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://logolab.hu'}/logolab-logo-new.png" alt="LogoLab" style="height:36px;" />
      </div>
      <p>Szia!</p>
      <p>A bejelentkezési kódod:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:20px;background:#f9f9f9;border-radius:8px;margin:16px 0;">
        ${code}
      </div>
      <p>A kód 10 percig érvényes.</p>
      <p style="color:#999;font-size:13px;">Ha nem te kérted, azonnal változtasd meg a jelszavad!</p>
      <p>Üdvözlettel,<br>A LogoLab csapata</p>
    </div>
  </div>
</body>
</html>`.trim();

  await sendEmail({
    to: user.email!,
    subject,
    html,
  });

  return NextResponse.json({ success: true, message: 'A 2FA kód elküldve' });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email és név megadása kötelező' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Érvénytelen email cím' },
        { status: 400 }
      );
    }

    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'A név legalább 2 karakter legyen' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email.toLowerCase());

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ez az email cím már regisztrálva van. Jelentkezz be!' },
        { status: 409 }
      );
    }

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: false,
      user_metadata: { name: name.trim() },
    });

    if (error) {
      console.error('[AUTH] Registration error:', error);
      return NextResponse.json(
        { error: 'Hiba történt a regisztráció során' },
        { status: 500 }
      );
    }

    // Create profile row
    if (data.user) {
      const { error: profileError } = await (supabase
        .from('profiles') as any)
        .upsert({
          id: data.user.id,
          email: email.toLowerCase(),
          name: name.trim(),
          is_admin: false,
          is_email_verified: false,
        }, { onConflict: 'id' } as any);

      if (profileError) {
        console.error('[AUTH] Profile creation error:', profileError);
      }
    }

    // Generate magic link for email verification
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${appUrl}/auth/confirm`,
      },
    });

    if (linkError || !linkData.properties?.action_link) {
      console.error('[AUTH] Magic link generation error:', linkError);
      // User was created but magic link failed - still return success
      return NextResponse.json({
        success: true,
        message: 'Regisztráció sikeres! Próbálj bejelentkezni az email címeddel.',
        userId: data.user?.id,
      });
    }

    const magicLink = linkData.properties.action_link;

    // Send email via Resend
    const { success, error: emailError } = await sendEmail({
      to: email.toLowerCase(),
      subject: 'Regisztráció megerősítése - LogoLab',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="${appUrl}/logolab-logo-new.png" alt="LogoLab" style="height: 40px;" />
          </div>
          <h2 style="font-size: 20px; color: #111827; margin-bottom: 8px;">Üdvözlünk, ${name.trim()}!</h2>
          <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Köszönjük a regisztrációt! Kattints az alábbi gombra a fiókod megerősítéséhez és a bejelentkezéshez. A link 15 percig érvényes.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${magicLink}" style="display: inline-block; background: #FFF012; color: #111827; font-weight: 600; font-size: 14px; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
              Fiók megerősítése
            </a>
          </div>
          <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
            Ha nem te regisztráltál, nyugodtan hagyd figyelmen kívül ezt az emailt.
          </p>
        </div>
      `,
    });

    if (!success) {
      console.error('[AUTH] Email send error:', emailError);
      // User created but email failed
    }

    return NextResponse.json({
      success: true,
      message: 'Regisztráció sikeres! Ellenőrizd az email fiókodat.',
      userId: data.user?.id,
    });
  } catch (error) {
    console.error('[AUTH] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Váratlan hiba történt' },
      { status: 500 }
    );
  }
}

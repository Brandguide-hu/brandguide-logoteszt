import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email cím megadása kötelező' },
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

    const supabase = getSupabaseAdmin();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Generate magic link using admin API
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${appUrl}/auth/confirm`,
      },
    });

    if (error) {
      console.error('[AUTH] Login generateLink error:', error);

      if (error.message?.includes('User not found') || error.message?.includes('Unable to find')) {
        return NextResponse.json(
          { error: 'Ez az email cím nincs regisztrálva. Regisztrálj először!' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Hiba történt a bejelentkezési link küldése során' },
        { status: 500 }
      );
    }

    // Extract the hashed token from the generated link
    const magicLink = data.properties?.action_link;
    if (!magicLink) {
      console.error('[AUTH] No magic link generated');
      return NextResponse.json(
        { error: 'Hiba történt a bejelentkezési link generálása során' },
        { status: 500 }
      );
    }

    // Send email via Resend
    const { success, error: emailError } = await sendEmail({
      to: email.toLowerCase(),
      subject: 'Bejelentkezés - LogoLab',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="${appUrl}/logolab-logo-new.png" alt="LogoLab" style="height: 40px;" />
          </div>
          <h2 style="font-size: 20px; color: #111827; margin-bottom: 8px;">Bejelentkezés</h2>
          <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Kattints az alábbi gombra a bejelentkezéshez. A link 15 percig érvényes.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${magicLink}" style="display: inline-block; background: #FFF012; color: #111827; font-weight: 600; font-size: 14px; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
              Bejelentkezés
            </a>
          </div>
          <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
            Ha nem te kérted ezt az emailt, nyugodtan hagyd figyelmen kívül.
          </p>
        </div>
      `,
    });

    if (!success) {
      console.error('[AUTH] Email send error:', emailError);
      return NextResponse.json(
        { error: 'Hiba történt az email küldése során' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bejelentkezési link elküldve! Ellenőrizd az email fiókodat.',
    });
  } catch (error) {
    console.error('[AUTH] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Váratlan hiba történt' },
      { status: 500 }
    );
  }
}

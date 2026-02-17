import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { loginMagicLinkEmail } from '@/lib/email/templates';

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://logolab.hu';

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

    // Send email via Resend using template
    const { subject, html } = loginMagicLinkEmail({ magicLink });
    const { success, error: emailError } = await sendEmail({
      to: email.toLowerCase(),
      subject,
      html,
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

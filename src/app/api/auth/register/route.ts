import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { registrationConfirmEmail } from '@/lib/email/templates';

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

    // Send email via Resend using template
    const { subject, html } = registrationConfirmEmail({ name: name.trim(), magicLink });
    const { success, error: emailError } = await sendEmail({
      to: email.toLowerCase(),
      subject,
      html,
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

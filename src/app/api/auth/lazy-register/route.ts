import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { loginMagicLinkEmail } from '@/lib/email/templates';

export const runtime = 'nodejs';

/**
 * POST /api/auth/lazy-register
 * Lazy auth: ha a user létezik → magic link. Ha nem → regisztráció + magic link.
 * A feltöltő oldalról hívjuk (ingyenes flow, nem bejelentkezett user).
 */
export async function POST(request: NextRequest) {
  try {
    const { email, pendingAnalysisId } = await request.json();

    if (!email || !pendingAnalysisId) {
      return NextResponse.json({ error: 'Email és pendingAnalysisId szükséges' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Érvénytelen email cím' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Check if user exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    let isNewUser = false;

    if (!existingUser) {
      // New user: create account
      isNewUser = true;

      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true, // Auto-confirm since we're sending magic link
      });

      if (createError) {
        console.error('[LAZY-REGISTER] Create user error:', createError);
        return NextResponse.json({ error: 'Hiba a regisztráció során' }, { status: 500 });
      }

      // Create profile
      if (newUser?.user) {
        await (admin.from('profiles') as any).upsert({
          id: newUser.user.id,
          email,
          name: null,
          is_admin: false,
          is_email_verified: true,
          created_via: 'direct',
        }, { onConflict: 'id' });

        // Link pending analysis to new user
        await (admin
          .from('pending_analyses') as any)
          .update({ user_id: newUser.user.id })
          .eq('id', pendingAnalysisId);
      }
    } else {
      // Existing user: link pending analysis
      await (admin
        .from('pending_analyses') as any)
        .update({ user_id: existingUser.id })
        .eq('id', pendingAnalysisId);
    }

    // Generate magic link
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${appUrl}/auth/confirm?pending=${pendingAnalysisId}`,
      },
    });

    if (linkError || !linkData) {
      console.error('[LAZY-REGISTER] Magic link error:', linkError);
      return NextResponse.json({ error: 'Hiba a bejelentkezési link küldésekor' }, { status: 500 });
    }

    // Send magic link email using template
    const magicLink = linkData.properties?.action_link;

    if (magicLink) {
      const { subject, html } = loginMagicLinkEmail({ magicLink });
      await sendEmail({
        to: email,
        subject,
        html,
      });
    }

    return NextResponse.json({
      success: true,
      isNewUser,
    });
  } catch (err) {
    console.error('[LAZY-REGISTER] Unexpected error:', err);
    return NextResponse.json({ error: 'Váratlan szerverhiba' }, { status: 500 });
  }
}

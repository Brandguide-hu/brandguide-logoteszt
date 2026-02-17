import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * POST /api/auth/resend-magic-link
 * Magic link újraküldése
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://logolab.hu';

    // Generate magic link
    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase().trim(),
      options: {
        redirectTo: `${appUrl}/auth/confirm`,
      },
    });

    if (error) {
      console.error('[RESEND-MAGIC-LINK] Generate link error:', error);
      // Ne adjunk vissza specifikus hibát biztonsági okokból
      return NextResponse.json({ success: true });
    }

    // Send email using template
    const magicLink = linkData?.properties?.action_link;
    if (magicLink) {
      const { sendEmail } = await import('@/lib/email/send');
      const { loginMagicLinkEmail } = await import('@/lib/email/templates');
      const { subject, html } = loginMagicLinkEmail({ magicLink });
      await sendEmail({
        to: email.toLowerCase().trim(),
        subject,
        html,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // Ne adjunk vissza hibát
  }
}

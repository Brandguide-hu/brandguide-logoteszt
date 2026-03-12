import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * GET /api/checkout/session-info?session_id=cs_xxx
 * Stripe Checkout Session email kinyerése + auto-login token generálás
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email = session.customer_details?.email || null;
    const pendingAnalysisId = session.metadata?.pending_analysis_id || null;

    // Generate magic link token for auto-login (if email available)
    let magicLinkToken: string | null = null;
    if (email && session.payment_status === 'paid') {
      try {
        const admin = getSupabaseAdmin();
        const { data } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
        });
        if (data?.properties?.hashed_token) {
          magicLinkToken = data.properties.hashed_token;
        }
      } catch (err) {
        console.warn('[SESSION-INFO] Failed to generate magic link token:', err);
      }
    }

    return NextResponse.json({
      email,
      status: session.payment_status,
      pendingAnalysisId,
      magicLinkToken,
      tier: session.metadata?.tier || null,
      amountTotal: session.amount_total || null,
      currency: session.currency || 'huf',
    });
  } catch {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
}

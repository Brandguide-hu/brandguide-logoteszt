import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * GET /api/checkout/session-info?session_id=cs_xxx
 * Stripe Checkout Session email kinyerése (sikeres oldal számára)
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      email: session.customer_details?.email || null,
      status: session.payment_status,
      pendingAnalysisId: session.metadata?.pending_analysis_id || null,
    });
  } catch {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
}

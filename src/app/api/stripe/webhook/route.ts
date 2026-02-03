import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[STRIPE WEBHOOK] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { analysisId, userId, tier } = session.metadata || {};

    if (!analysisId || !userId) {
      console.error('[STRIPE WEBHOOK] Missing metadata');
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Generate share hash
    const shareHash = crypto.randomBytes(16).toString('hex');

    // Update analysis with payment info
    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        status: 'processing',
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_amount: session.amount_total,
        share_hash: shareHash,
      })
      .eq('id', analysisId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('[STRIPE WEBHOOK] Update error:', updateError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // Fetch analysis data to trigger AI analysis
    const { data: analysis } = await supabase
      .from('analyses')
      .select('logo_base64, category')
      .eq('id', analysisId)
      .single();

    if (analysis?.logo_base64) {
      // Trigger analysis asynchronously
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetch(`${appUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo: analysis.logo_base64,
          mediaType: 'image/png',
          testLevel: 'detailed',
          analysisId,
        }),
      }).catch(err => {
        console.error('[STRIPE WEBHOOK] Analysis trigger error:', err);
      });
    }

    console.log(`[STRIPE WEBHOOK] Payment completed for analysis ${analysisId}`);
  }

  return NextResponse.json({ received: true });
}

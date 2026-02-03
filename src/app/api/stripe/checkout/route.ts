import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { Tier, TIER_INFO } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { analysisId, tier, userId } = body as {
      analysisId: string;
      tier: Tier;
      userId: string;
    };

    if (!analysisId || !tier || !userId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (tier === 'free') {
      return NextResponse.json({ error: 'Free tier does not require payment' }, { status: 400 });
    }

    const tierInfo = TIER_INFO[tier];
    if (!tierInfo) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Verify analysis exists and belongs to user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: analysis, error: fetchError } = await supabase
      .from('analyses')
      .select('id, user_id, tier, status')
      .eq('id', analysisId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Create Stripe checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      currency: 'huf',
      line_items: [
        {
          price_data: {
            currency: 'huf',
            product_data: {
              name: `LogoLab - ${tierInfo.label}`,
              description: tierInfo.features.join(', '),
            },
            unit_amount: tierInfo.priceBrutto, // Stripe uses smallest unit (HUF = Ft)
          },
          quantity: 1,
        },
      ],
      metadata: {
        analysisId,
        userId,
        tier,
      },
      success_url: `${appUrl}/dashboard/fizetes/sikeres?session_id={CHECKOUT_SESSION_ID}&analysis_id=${analysisId}`,
      cancel_url: `${appUrl}/dashboard/fizetes/megszakitva?analysis_id=${analysisId}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[STRIPE CHECKOUT] Error:', error);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}

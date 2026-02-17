import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { Tier, TIER_INFO } from '@/types';

export const runtime = 'nodejs';

/**
 * POST /api/checkout/create-session
 * v0.91: Stripe Checkout Session létrehozása pending_analysis alapján.
 * Nem kell userId vagy analysisId — a webhook fogja kezelni az account/analysis létrehozást.
 */
export async function POST(req: NextRequest) {
  try {
    const { pendingAnalysisId, tier, email } = await req.json() as {
      pendingAnalysisId: string;
      tier: Tier;
      email: string;
    };

    if (!pendingAnalysisId || !tier || !email) {
      return NextResponse.json({ error: 'Hiányzó mezők' }, { status: 400 });
    }

    if (tier === 'free') {
      return NextResponse.json({ error: 'Az ingyenes csomag nem igényel fizetést' }, { status: 400 });
    }

    const tierInfo = TIER_INFO[tier];
    if (!tierInfo) {
      return NextResponse.json({ error: 'Érvénytelen csomag' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://logolab.hu';

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      locale: 'hu',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'huf',
            product_data: {
              name: tier === 'paid'
                ? 'LogoLab Max csomag'
                : 'LogoLab Ultra csomag',
              description: tier === 'paid'
                ? 'Részletes logó elemzés privát eredménnyel'
                : 'Részletes logó elemzés + 20 perces szakértői konzultáció',
            },
            unit_amount: tierInfo.priceBrutto * 100, // HUF fillérben (Stripe 2022+ óta a HUF two-decimal)
          },
          quantity: 1,
        },
      ],
      metadata: {
        pending_analysis_id: pendingAnalysisId,
        tier,
      },
      success_url: `${appUrl}/elemzes/sikeres?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/elemzes/uj?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[CHECKOUT] Error:', error);
    return NextResponse.json({ error: 'Hiba a fizetés indításakor' }, { status: 500 });
  }
}

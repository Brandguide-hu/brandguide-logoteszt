import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getHungarianVatRateId } from '@/lib/stripe';
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

    // 27%-os ÁFA tax rate lekérése/létrehozása — a Checkout megjeleníti a nettó/ÁFA/bruttó bontást
    const vatRateId = await getHungarianVatRateId();

    const session = await getStripe().checkout.sessions.create({
      // payment_method_types nincs megadva — Stripe Dashboard beállítások alapján
      // automatikusan megjelenik: kártya, Apple Pay, Google Pay, stb.
      mode: 'payment',
      locale: 'hu',
      customer_email: email,
      allow_promotion_codes: true,                    // Kupon/promóciós kód mező megjelenítése
      billing_address_collection: 'required',       // Számlázási cím bekérése
      custom_fields: [
        {
          key: 'tax_id',
          label: { type: 'custom', custom: 'Adószám (opcionális, cégek számára)' },
          type: 'text',
          optional: true,
        },
        {
          key: 'company_name',
          label: { type: 'custom', custom: 'Cégnév (opcionális)' },
          type: 'text',
          optional: true,
        },
      ],
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
            tax_behavior: 'inclusive' as const,      // Az ár tartalmazza az ÁFÁ-t (bruttó) — Stripe megjeleníti a bontást
          },
          quantity: 1,
          tax_rates: [vatRateId],                    // 27% magyar ÁFA — nettó/adó/bruttó bontás megjelenítése
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

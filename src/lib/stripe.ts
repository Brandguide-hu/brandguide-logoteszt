import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/**
 * 27%-os magyar ÁFA tax rate keresése vagy létrehozása.
 * Inclusive = az ár már tartalmazza az adót (bruttó ár), Stripe megjeleníti a bontást.
 * Cachelve van memóriában, hogy ne keressük minden session-nél.
 */
let _vatRateId: string | null = null;

export async function getHungarianVatRateId(): Promise<string> {
  if (_vatRateId) return _vatRateId;

  const stripe = getStripe();

  // Keresés meglévő aktív 27%-os inclusive ÁFA rate-re
  const rates = await stripe.taxRates.list({ limit: 100, active: true });
  const existing = rates.data.find(
    (r) => r.display_name === 'ÁFA' && r.percentage === 27 && r.inclusive && r.active
  );

  if (existing) {
    _vatRateId = existing.id;
    return _vatRateId;
  }

  // Ha nincs, létrehozzuk
  const rate = await stripe.taxRates.create({
    display_name: 'ÁFA',
    percentage: 27,
    inclusive: true,
    country: 'HU',
    description: 'Magyar általános forgalmi adó (27%)',
  });

  _vatRateId = rate.id;
  console.log(`[STRIPE] Created HU VAT tax rate: ${rate.id}`);
  return _vatRateId;
}

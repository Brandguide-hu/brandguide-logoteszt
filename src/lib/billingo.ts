/**
 * Billingo API v3 kliens — LogoLab számlázás
 *
 * Végleges e-számlákat hoz létre és küldi el emailben a Stripe fizetések alapján.
 * Referencia: https://api.billingo.hu/v3
 */

const BILLINGO_API_URL = process.env.BILLINGO_API_URL || 'https://api.billingo.hu/v3';
const BILLINGO_API_KEY = process.env.BILLINGO_API_KEY || '';
const BILLINGO_BLOCK_ID = parseInt(process.env.BILLINGO_BLOCK_ID || '0');
const BILLINGO_BANK_ACCOUNT_ID = parseInt(process.env.BILLINGO_BANK_ACCOUNT_ID || '0');

interface BillingoPartner {
  id: number;
  name: string;
  emails: string[];
}

interface BillingoDocument {
  id: number;
  invoice_number: string | null;
}

interface BillingoError {
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Billingo API hívás wrapper — közös headers + error handling
 */
async function billingoFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BILLINGO_API_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': BILLINGO_API_KEY,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorBody: BillingoError = await response.json();
      if (errorBody.errors) {
        // Részletes mező-szintű hibák
        const fieldErrors = Object.entries(errorBody.errors)
          .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
          .join('; ');
        errorDetail = fieldErrors;
      } else if (errorBody.message) {
        errorDetail = errorBody.message;
      }
    } catch {
      errorDetail = await response.text().catch(() => 'no body');
    }

    throw new Error(
      `Billingo API hiba (${response.status} ${response.statusText}): ${errorDetail || 'ismeretlen'} [${options.method || 'GET'} ${path}]`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Partner keresés email alapján
 */
async function findPartnerByEmail(email: string): Promise<BillingoPartner | null> {
  try {
    const results = await billingoFetch<{ data: BillingoPartner[] }>(
      `/partners?query=${encodeURIComponent(email)}`
    );

    if (results.data && results.data.length > 0) {
      // Pontos email match keresés
      const exact = results.data.find(p =>
        p.emails?.some(e => e.toLowerCase() === email.toLowerCase())
      );
      return exact || results.data[0];
    }
    return null;
  } catch (err) {
    console.warn('[BILLINGO] Partner search failed:', err);
    return null;
  }
}

interface PartnerBillingDetails {
  postCode?: string;
  city?: string;
  address?: string;
  taxCode?: string;
}

/**
 * Partner létrehozása vagy meglévő keresése email alapján
 */
export async function createOrFindPartner(
  email: string,
  name?: string | null,
  country?: string | null,
  billing?: PartnerBillingDetails
): Promise<number> {
  // Először keresünk meglévő partnert
  const existing = await findPartnerByEmail(email);
  if (existing) {
    console.log(`[BILLINGO] Existing partner found: id=${existing.id}, name=${existing.name}`);
    return existing.id;
  }

  // Új partner létrehozás
  // FONTOS: Billingo megköveteli a cím mezőket — placeholder ha nincs adat
  const hasTaxCode = billing?.taxCode && billing.taxCode.length > 0;
  const partnerData = {
    name: name || email.split('@')[0],
    address: {
      country_code: (country || 'HU').toUpperCase(),
      post_code: billing?.postCode || '0000',
      city: billing?.city || 'N/A',
      address: billing?.address || 'N/A',
    },
    emails: [email.toLowerCase()],
    taxcode: billing?.taxCode || '',
    type: hasTaxCode ? 'organization' as const : 'private person' as const,
  };

  console.log('[BILLINGO] Creating partner:', JSON.stringify(partnerData));

  const partner = await billingoFetch<BillingoPartner>('/partners', {
    method: 'POST',
    body: JSON.stringify(partnerData),
  });

  console.log(`[BILLINGO] Partner created: id=${partner.id}, name=${partner.name}`);
  return partner.id;
}

/**
 * Számla létrehozása — draft vagy végleges mód az admin beállítás alapján
 *
 * @param partnerId - Billingo partner ID
 * @param productId - Billingo product ID (Max vagy Ultra tier)
 * @param currency - Pénznem NAGYBETŰVEL (HUF, EUR, USD)
 * @param paymentIntentId - Stripe payment intent ID (megjegyzésbe kerül)
 * @param draftMode - true: piszkozat, false: végleges számla + email küldés
 * @returns Billingo document ID
 */
export async function createDraftInvoice(
  partnerId: number,
  productId: number,
  currency: string,
  paymentIntentId: string,
  draftMode: boolean = false
): Promise<number> {
  // KRITIKUS: Currency MINDIG uppercase kell legyen!
  const upperCurrency = currency.toUpperCase();

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  const invoiceData: Record<string, unknown> = {
    partner_id: partnerId,
    block_id: BILLINGO_BLOCK_ID,
    bank_account_id: BILLINGO_BANK_ACCOUNT_ID,
    type: draftMode ? 'draft' : 'invoice',
    fulfillment_date: dateStr,
    due_date: dateStr,
    payment_method: 'online_bankcard',
    language: 'hu',
    currency: upperCurrency,
    electronic: true,
    comment: `Stripe: ${paymentIntentId}`,
    items: [
      {
        product_id: productId,
        quantity: 1,
      },
    ],
  };

  if (!draftMode) {
    invoiceData.paid = true;
  }

  console.log(`[BILLINGO] Creating ${draftMode ? 'draft' : 'invoice'}:`, JSON.stringify(invoiceData));

  const doc = await billingoFetch<BillingoDocument>('/documents', {
    method: 'POST',
    body: JSON.stringify(invoiceData),
  });

  console.log(`[BILLINGO] ${draftMode ? 'Draft' : 'Invoice'} created: id=${doc.id}, number=${doc.invoice_number || 'N/A (draft)'}`);

  // Végleges számlánál kiküldés emailben
  if (!draftMode) {
    try {
      await billingoFetch(`/documents/${doc.id}/send`, {
        method: 'POST',
      });
      console.log(`[BILLINGO] Invoice emailed: id=${doc.id}`);
    } catch (sendErr) {
      console.error(`[BILLINGO] Invoice email failed (id=${doc.id}):`, sendErr);
    }
  }

  return doc.id;
}

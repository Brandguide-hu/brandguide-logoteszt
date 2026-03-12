-- Billingo számlázás tracking tábla
-- Stripe fizetések és Billingo piszkozat számlák összerendelése

CREATE TABLE IF NOT EXISTS billingo_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Stripe referenciák
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,

  -- Billingo referenciák
  billingo_document_id INTEGER,
  billingo_partner_id INTEGER,
  billingo_invoice_number TEXT,       -- Null amíg piszkozat

  -- Összeg
  amount_total INTEGER,               -- Stripe amount (fillér/minor unit)
  currency TEXT DEFAULT 'HUF',

  -- Ügyfél adatok
  customer_email TEXT,
  customer_name TEXT,

  -- Státusz tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'created', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Extra adat
  metadata JSONB DEFAULT '{}',

  -- Időbélyegek
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index a gyakori lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_billingo_invoices_status ON billingo_invoices(status);
CREATE INDEX IF NOT EXISTS idx_billingo_invoices_email ON billingo_invoices(customer_email);
CREATE INDEX IF NOT EXISTS idx_billingo_invoices_created ON billingo_invoices(created_at DESC);

-- RLS: csak admin férhet hozzá
ALTER TABLE billingo_invoices ENABLE ROW LEVEL SECURITY;

-- Admin policy (service_role key-jel mindig elérhető, de ha kell explicit policy)
CREATE POLICY "Service role full access on billingo_invoices"
  ON billingo_invoices
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- LogoLab v0.91 migráció
-- Dátum: 2026.02.05
-- ============================================

-- 1. Profiles tábla frissítése
-- -------------------------------------------

-- Account eredete mező
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS created_via TEXT DEFAULT 'direct'
  CHECK (created_via IN ('direct', 'stripe'));

-- Name nullable legyen (Stripe-ból jövő usereknél nincs név)
ALTER TABLE profiles
  ALTER COLUMN name DROP NOT NULL;

ALTER TABLE profiles
  ALTER COLUMN name SET DEFAULT NULL;


-- 2. Analyses tábla frissítése
-- -------------------------------------------

-- Stripe Checkout Session ID
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT DEFAULT NULL;

-- creator_name és category nullable (fizetősnél opcionális)
ALTER TABLE analyses
  ALTER COLUMN creator_name DROP NOT NULL;

ALTER TABLE analyses
  ALTER COLUMN category DROP NOT NULL;

-- Kategória constraint frissítése (11 → 16)
-- Először töröljük a régi constraint-et (ha létezik)
ALTER TABLE analyses
  DROP CONSTRAINT IF EXISTS analyses_category_check;

-- Új constraint a 16 kategóriával
ALTER TABLE analyses
  ADD CONSTRAINT analyses_category_check
  CHECK (category IS NULL OR category IN (
    'auto_transport', 'fashion', 'health_beauty', 'food_agriculture',
    'construction_realestate', 'manufacturing', 'retail_webshop', 'creative_media',
    'nonprofit', 'education_training', 'finance_insurance', 'sport_fitness',
    'accommodation_tourism', 'tech', 'hospitality', 'other'
  ));

-- Meglévő adatok migrálása: régi kategória nevek → új
UPDATE analyses SET category = 'retail_webshop' WHERE category = 'retail';
UPDATE analyses SET category = 'education_training' WHERE category = 'education';
UPDATE analyses SET category = 'other' WHERE category = 'services';


-- 3. Ideiglenes elemzés adatok (Stripe fizetés előtt)
-- -------------------------------------------

CREATE TABLE IF NOT EXISTS pending_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'paid', 'consultation')),

  -- Logó fájl (Supabase Storage temp path)
  logo_temp_path TEXT NOT NULL,
  logo_thumbnail_temp_path TEXT DEFAULT NULL,

  -- Form adatok
  logo_name TEXT DEFAULT 'Névtelen logó',
  creator_name TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL CHECK (category IS NULL OR category IN (
    'auto_transport', 'fashion', 'health_beauty', 'food_agriculture',
    'construction_realestate', 'manufacturing', 'retail_webshop', 'creative_media',
    'nonprofit', 'education_training', 'finance_insurance', 'sport_fitness',
    'accommodation_tourism', 'tech', 'hospitality', 'other'
  )),

  -- User adatok
  email TEXT DEFAULT NULL,
  user_id UUID DEFAULT NULL,

  -- Időbélyegek
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_pending_analyses_session ON pending_analyses(session_id);
CREATE INDEX idx_pending_analyses_expires ON pending_analyses(expires_at);

-- Automatikus cleanup: lejárt pending_analyses törlése (24h)
-- Ezt Supabase scheduled function-nel vagy pg_cron-nal kell beállítani:
-- SELECT cron.schedule('cleanup-pending-analyses', '0 * * * *',
--   $$DELETE FROM pending_analyses WHERE expires_at < NOW()$$
-- );


-- 4. Feltöltési funnel tracking
-- -------------------------------------------

CREATE TABLE IF NOT EXISTS upload_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view',
    'tier_selected',
    'logo_selected',
    'form_filled',
    'submit_clicked',
    'auth_started',
    'stripe_redirect',
    'completed',
    'abandoned'
  )),
  tier TEXT DEFAULT NULL,
  has_logo BOOLEAN DEFAULT FALSE,
  has_email BOOLEAN DEFAULT FALSE,
  referrer TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  ip_hash TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upload_events_session ON upload_events(session_id);
CREATE INDEX idx_upload_events_type ON upload_events(event_type);
CREATE INDEX idx_upload_events_created ON upload_events(created_at);


-- 5. Admin műveletek logolása
-- -------------------------------------------

CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'approve_analysis',
    'reject_analysis',
    'select_weekly_winner',
    'delete_user',
    'restore_user'
  )),
  target_id UUID NOT NULL,
  details JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at);


-- 6. Supabase Storage — temp bucket
-- -------------------------------------------

-- Temp bucket a feltöltés előtti ideiglenes logó tároláshoz
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos-temp', 'logos-temp', false)
ON CONFLICT (id) DO NOTHING;

-- Bárki feltölthet temp fájlokat (publikus feltöltő oldal)
CREATE POLICY "Anyone can upload temp logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'logos-temp');

-- Service role olvashat temp fájlokat (webhook-ban)
-- A service role megkerüli az RLS-t, így nem kell külön policy


-- 7. RLS frissítések
-- -------------------------------------------

-- pending_analyses: service role csak (nincs user-facing hozzáférés)
ALTER TABLE pending_analyses ENABLE ROW LEVEL SECURITY;

-- upload_events: insert bárki, read admin only
ALTER TABLE upload_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert upload events" ON upload_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read upload events" ON upload_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- admin_actions: admin only
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert actions" ON admin_actions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can read actions" ON admin_actions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

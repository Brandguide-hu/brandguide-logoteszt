-- ============================================
-- LogoLab v0.90 — Alap tábla migráció
-- Dátum: 2026.02.05
-- Ez a migráció a v091.sql ELŐTT kell fusson!
-- ============================================

-- 1. Profiles tábla
-- -------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT DEFAULT NULL,
  display_name TEXT DEFAULT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_email_verified BOOLEAN NOT NULL DEFAULT false,
  last_free_analysis_at TIMESTAMPTZ DEFAULT NULL,
  last_free_analysis_ip TEXT DEFAULT NULL,
  admin_2fa_code TEXT DEFAULT NULL,
  admin_2fa_expires_at TIMESTAMPTZ DEFAULT NULL,
  trusted_browsers JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- User can read own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- User can update own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Service role can do anything (via admin client — bypasses RLS)
-- No explicit policy needed for service_role


-- 2. Analyses tábla
-- -------------------------------------------

CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'paid', 'consultation')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'pending_approval', 'public', 'rejected')),
  rejection_reason TEXT DEFAULT NULL,
  logo_name TEXT NOT NULL DEFAULT 'Névtelen logó',
  creator_name TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  logo_original_path TEXT DEFAULT NULL,
  logo_thumbnail_path TEXT DEFAULT NULL,
  logo_base64 TEXT DEFAULT NULL,
  result JSONB DEFAULT NULL,
  share_hash TEXT DEFAULT NULL,
  is_weekly_winner BOOLEAN NOT NULL DEFAULT false,
  weekly_winner_date TIMESTAMPTZ DEFAULT NULL,
  stripe_payment_intent_id TEXT DEFAULT NULL,
  stripe_amount INTEGER DEFAULT NULL,
  test_level TEXT NOT NULL DEFAULT 'basic' CHECK (test_level IN ('basic', 'detailed', 'full', 'rebranding')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_visibility ON analyses(visibility);
CREATE INDEX IF NOT EXISTS idx_analyses_share_hash ON analyses(share_hash);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_tier ON analyses(tier);

-- RLS
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- User can read own analyses
CREATE POLICY "Users can read own analyses" ON analyses
  FOR SELECT USING (user_id = auth.uid() OR visibility = 'public');

-- User can insert own analyses
CREATE POLICY "Users can insert own analyses" ON analyses
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- User can update own analyses
CREATE POLICY "Users can update own analyses" ON analyses
  FOR UPDATE USING (user_id = auth.uid());

-- User can soft-delete own analyses
CREATE POLICY "Users can delete own analyses" ON analyses
  FOR DELETE USING (user_id = auth.uid());


-- 3. Storage: logos bucket (végleges logó tárolás)
-- -------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload logos
CREATE POLICY "Authenticated users can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Anyone can read public logos (galéria, megosztás)
CREATE POLICY "Anyone can read logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

-- Users can delete own logos
CREATE POLICY "Users can delete own logos" ON storage.objects
  FOR DELETE USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);


-- 4. Auto-update updated_at trigger
-- -------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analyses_updated_at
  BEFORE UPDATE ON analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

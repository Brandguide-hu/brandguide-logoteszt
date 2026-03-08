-- Site settings table for maintenance mode and other site-wide settings
CREATE TABLE IF NOT EXISTS site_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_settings (key, value) VALUES ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read (middleware reads server-side)
DO $$ BEGIN
  CREATE POLICY "settings_read" ON site_settings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only admins can write
DO $$ BEGIN
  CREATE POLICY "settings_write" ON site_settings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Minta elemzések (az "Így működik az elemzés" oldalhoz)
-- v1.0 - 2026.02.10

CREATE TABLE IF NOT EXISTS featured_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Egyediség: egy elemzés csak egyszer szerepelhet
  UNIQUE(analysis_id)
);

-- Index a sorrend szerinti lekérdezéshez
CREATE INDEX IF NOT EXISTS idx_featured_analyses_order ON featured_analyses(display_order);

-- RLS policies
ALTER TABLE featured_analyses ENABLE ROW LEVEL SECURITY;

-- Mindenki olvashatja (publikus megjelenítéshez)
CREATE POLICY "Anyone can view featured analyses" ON featured_analyses
  FOR SELECT USING (true);

-- Csak admin módosíthatja
CREATE POLICY "Only admins can modify featured analyses" ON featured_analyses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Trigger: Ha egy elemzés visibility-je megváltozik és nem 'public',
-- automatikusan töröljük a featured_analyses-ból
CREATE OR REPLACE FUNCTION remove_from_featured_if_not_public()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visibility != 'public' THEN
    DELETE FROM featured_analyses WHERE analysis_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DROP ha létezik, majd CREATE
DROP TRIGGER IF EXISTS trg_remove_from_featured ON analyses;

CREATE TRIGGER trg_remove_from_featured
  AFTER UPDATE OF visibility ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION remove_from_featured_if_not_public();

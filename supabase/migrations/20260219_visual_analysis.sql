-- Visual analysis test mode migration
-- Adds visual_analysis JSONB column and timestamp to analyses table

ALTER TABLE analyses ADD COLUMN IF NOT EXISTS visual_analysis JSONB DEFAULT NULL;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS visual_analysis_at TIMESTAMPTZ DEFAULT NULL;

-- Storage bucket for generated visual analysis images
INSERT INTO storage.buckets (id, name, public)
VALUES ('visual-analysis', 'visual-analysis', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for visual analysis images
DO $$ BEGIN
  CREATE POLICY "Visual analysis images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'visual-analysis');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin-only write access for visual analysis images
DO $$ BEGIN
  CREATE POLICY "Admins can upload visual analysis images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'visual-analysis');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update visual analysis images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'visual-analysis');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete visual analysis images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'visual-analysis');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

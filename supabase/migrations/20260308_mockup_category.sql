-- Add mockup_category and mockup_confidence columns for category selection step
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS mockup_category TEXT,
  ADD COLUMN IF NOT EXISTS mockup_confidence FLOAT;

ALTER TABLE pending_analyses
  ADD COLUMN IF NOT EXISTS mockup_category TEXT;

-- Add brief column to pending_analyses and analyses tables
-- Brief: optional free-text context from the uploader (max 1000 chars), available for MAX and Ultra tiers

ALTER TABLE pending_analyses ADD COLUMN IF NOT EXISTS brief TEXT DEFAULT NULL;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS brief TEXT DEFAULT NULL;

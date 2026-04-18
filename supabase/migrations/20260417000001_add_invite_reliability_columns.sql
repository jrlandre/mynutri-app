ALTER TABLE experts ADD COLUMN IF NOT EXISTS invite_sent_at timestamptz;
ALTER TABLE experts ADD COLUMN IF NOT EXISTS invite_fallback_used boolean DEFAULT false;

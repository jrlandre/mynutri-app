ALTER TABLE experts ADD COLUMN IF NOT EXISTS last_subdomain_change_at timestamptz;
ALTER TABLE experts ADD COLUMN IF NOT EXISTS previous_subdomain text;

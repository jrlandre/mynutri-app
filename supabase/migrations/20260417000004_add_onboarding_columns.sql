ALTER TABLE experts ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE experts ADD COLUMN IF NOT EXISTS onboarding_step int DEFAULT 0;

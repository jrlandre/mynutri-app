-- Add expiry timestamp to magic link tokens
-- Tokens are valid for 7 days from issuance; expired tokens are rejected at activation time.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

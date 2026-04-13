-- Add locale column to experts table
-- Stores the expert's preferred language for emails and UI
ALTER TABLE experts
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'pt'
  CHECK (locale IN ('pt', 'en'));

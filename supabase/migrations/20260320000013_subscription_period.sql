ALTER TABLE public.experts
  ADD COLUMN IF NOT EXISTS subscription_period TEXT
    CHECK (subscription_period IN ('monthly','yearly'));

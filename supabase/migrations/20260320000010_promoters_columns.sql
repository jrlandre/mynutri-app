ALTER TABLE public.experts
  ADD COLUMN IF NOT EXISTS is_promoter    BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_code  TEXT         UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_coupon_id TEXT;

CREATE INDEX IF NOT EXISTS experts_referral_code_idx
  ON public.experts (referral_code)
  WHERE referral_code IS NOT NULL;

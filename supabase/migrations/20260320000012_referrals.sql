CREATE TABLE public.referrals (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id            UUID         NOT NULL REFERENCES public.experts(id),
  referred_expert_id     UUID         REFERENCES public.experts(id),
  stripe_invoice_id      TEXT,
  stripe_subscription_id TEXT,
  amount_gross_cents     INTEGER      NOT NULL,
  commission_pct         NUMERIC(5,2) NOT NULL,
  commission_cents       INTEGER      NOT NULL,
  attribution            TEXT         NOT NULL,
  status                 TEXT         NOT NULL DEFAULT 'pending',
  clears_at              TIMESTAMPTZ  NOT NULL,
  paid_at                TIMESTAMPTZ,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT valid_status      CHECK (status IN ('pending','cleared','paid')),
  CONSTRAINT valid_attribution CHECK (attribution IN ('link','coupon','link_and_coupon','link_split','coupon_split'))
);

CREATE INDEX referrals_promoter_idx ON public.referrals (promoter_id, status);
CREATE INDEX referrals_clears_idx   ON public.referrals (clears_at) WHERE status = 'pending';

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promoter lê seus referrals"
  ON public.referrals FOR SELECT
  USING (
    promoter_id IN (
      SELECT id FROM public.experts WHERE user_id = auth.uid()
    )
  );

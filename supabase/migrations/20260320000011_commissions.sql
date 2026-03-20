CREATE TABLE public.commissions (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id  UUID         NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
  percentage   NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  valid_from   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  valid_until  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT percentage_range CHECK (percentage > 0 AND percentage <= 100)
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promoter lê suas comissões"
  ON public.commissions FOR SELECT
  USING (
    promoter_id IN (
      SELECT id FROM public.experts WHERE user_id = auth.uid()
    )
  );

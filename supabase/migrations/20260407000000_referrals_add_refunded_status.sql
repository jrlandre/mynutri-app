-- Adiciona 'refunded' ao CHECK constraint de status nos referrals.
-- handleChargeRefunded no webhook tenta gravar status='refunded' mas a constraint
-- só aceitava 'pending','cleared','paid' — causando falha silenciosa em produção.

ALTER TABLE public.referrals
  DROP CONSTRAINT valid_status,
  ADD CONSTRAINT valid_status CHECK (status IN ('pending','cleared','paid','refunded'));

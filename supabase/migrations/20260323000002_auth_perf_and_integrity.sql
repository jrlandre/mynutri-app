-- ─── 1. check_user_has_password ──────────────────────────────────────────────
-- Usada em check-email e has-password para verificar se usuário tem senha definida.
-- Estava ausente das migrations (risco de quebra em deploy limpo).

CREATE OR REPLACE FUNCTION public.check_user_has_password(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT encrypted_password IS NOT NULL AND encrypted_password != ''
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_has_password(TEXT) TO service_role;

-- ─── 2. get_user_auth_data_by_email ──────────────────────────────────────────
-- Substitui o loop O(n) de listUsers em check-email/route.ts.
-- Retorna tudo que o endpoint precisa em uma única query.

CREATE OR REPLACE FUNCTION public.get_user_auth_data_by_email(p_email TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT jsonb_build_object(
    'id',           id::text,
    'providers',    COALESCE(raw_app_meta_data->'providers', '[]'::jsonb),
    'confirmed',    email_confirmed_at IS NOT NULL,
    'has_password', encrypted_password IS NOT NULL AND encrypted_password != ''
  )
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_auth_data_by_email(TEXT) TO service_role;

-- ─── 3. Unique index em referrals (stripe_invoice_id, promoter_id) ────────────
-- Previne duplicação de comissões se o mesmo evento invoice.payment_succeeded
-- for entregue duas vezes concorrentemente.
-- Parcial: stripe_invoice_id pode ser NULL (referrals de checkout inicial).

CREATE UNIQUE INDEX IF NOT EXISTS referrals_invoice_promoter_uniq
  ON public.referrals (stripe_invoice_id, promoter_id)
  WHERE stripe_invoice_id IS NOT NULL;

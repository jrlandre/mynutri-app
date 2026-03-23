-- ─── 1. RLS: bloquear INSERT / UPDATE / DELETE em commissions para não-service_role ───

CREATE POLICY "Bloqueia INSERT em commissions"
  ON public.commissions FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Bloqueia UPDATE em commissions"
  ON public.commissions FOR UPDATE
  USING (false);

CREATE POLICY "Bloqueia DELETE em commissions"
  ON public.commissions FOR DELETE
  USING (false);

-- ─── 2. Índices de performance ────────────────────────────────────────────────

-- Webhook: lookup de coupon → promoter
CREATE INDEX IF NOT EXISTS experts_stripe_coupon_id_idx
  ON public.experts (stripe_coupon_id)
  WHERE stripe_coupon_id IS NOT NULL;

-- Comissão vigente por promoter
CREATE INDEX IF NOT EXISTS commissions_promoter_valid_from_idx
  ON public.commissions (promoter_id, valid_from DESC);

-- ─── 3. Unique index para upsert atômico de uso anônimo (por IP) ──────────────

-- O index não-único já existe em 20260319_security_hardening; criar versão UNIQUE
-- para suportar ON CONFLICT na função abaixo.
CREATE UNIQUE INDEX IF NOT EXISTS usage_ip_date_uniq
  ON public.usage (ip, date)
  WHERE user_id IS NULL;

-- ─── 4. Função atômica de check-and-increment de uso ─────────────────────────

CREATE OR REPLACE FUNCTION public.check_and_increment_usage(
  p_user_id  UUID,
  p_ip       TEXT,
  p_date     DATE,
  p_limit    INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_count INT;
  v_new_count INT;
BEGIN
  LOOP
    -- Tenta adquirir lock na linha existente
    IF p_user_id IS NOT NULL THEN
      SELECT analysis_count INTO v_old_count
        FROM public.usage
       WHERE user_id = p_user_id AND date = p_date
         FOR UPDATE;
    ELSE
      SELECT analysis_count INTO v_old_count
        FROM public.usage
       WHERE user_id IS NULL AND ip = p_ip AND date = p_date
         FOR UPDATE;
    END IF;

    IF FOUND THEN
      EXIT; -- linha encontrada e bloqueada, sai do loop
    END IF;

    -- Nenhuma linha: tenta inserir (pode colidir com insert concorrente)
    BEGIN
      INSERT INTO public.usage (user_id, ip, date, analysis_count)
      VALUES (p_user_id, p_ip, p_date, 1);

      -- Insert bem-sucedido
      RETURN jsonb_build_object(
        'allowed', 1 <= p_limit,
        'count',   1
      );
    EXCEPTION WHEN unique_violation THEN
      -- Insert concorrente ganhou — retry para pegar o lock
      NULL;
    END;
  END LOOP;

  -- Linha encontrada e bloqueada: verificar limite
  IF v_old_count >= p_limit THEN
    RETURN jsonb_build_object('allowed', false, 'count', v_old_count);
  END IF;

  v_new_count := v_old_count + 1;

  IF p_user_id IS NOT NULL THEN
    UPDATE public.usage
       SET analysis_count = v_new_count
     WHERE user_id = p_user_id AND date = p_date;
  ELSE
    UPDATE public.usage
       SET analysis_count = v_new_count
     WHERE user_id IS NULL AND ip = p_ip AND date = p_date;
  END IF;

  RETURN jsonb_build_object('allowed', true, 'count', v_new_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_usage(UUID, TEXT, DATE, INT) TO service_role;

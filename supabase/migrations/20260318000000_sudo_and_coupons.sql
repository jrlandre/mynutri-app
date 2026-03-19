-- 1. Adicionar flag 'is_admin' na tabela nutritionists (que passará a ser tratada como 'Pro' no front-end)
ALTER TABLE public.nutritionists
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Criar tabela de cupons (Motor de Cupons)
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_pct INTEGER NOT NULL CHECK (discount_pct >= 0 AND discount_pct <= 100),
  valid_until TIMESTAMPTZ,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Configuração de RLS para coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ler/modificar os cupons integralmente
CREATE POLICY "Admins têm acesso total aos cupons"
ON public.coupons FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.nutritionists n 
    WHERE n.user_id = auth.uid() AND n.is_admin = true
  )
);

-- Usuários comuns podem consultar cupons (para checar validade no checkout)
CREATE POLICY "Usuários podem consultar cupons válidos"
ON public.coupons FOR SELECT
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
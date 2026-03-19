-- 1. Adicionar coluna ip na tabela usage (necessária para rastreamento de usuários anônimos)
ALTER TABLE public.usage ADD COLUMN IF NOT EXISTS ip TEXT;

CREATE INDEX IF NOT EXISTS usage_ip_date_idx
  ON public.usage (ip, date)
  WHERE user_id IS NULL;

-- 2. RLS hardening: remover DELETE das políticas FOR ALL nas tabelas críticas

-- Experts
DROP POLICY IF EXISTS "Expert vê seus próprios dados" ON public.experts;
CREATE POLICY "Expert lê seus próprios dados"
  ON public.experts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Expert atualiza seus próprios dados"
  ON public.experts FOR UPDATE
  USING (auth.uid() = user_id);

-- Clients
DROP POLICY IF EXISTS "Client vê seus próprios dados" ON public.clients;
CREATE POLICY "Client lê seus próprios dados"
  ON public.clients FOR SELECT
  USING (auth.uid() = user_id);

-- Usage
DROP POLICY IF EXISTS "Usuário vê seu próprio uso" ON public.usage;
CREATE POLICY "Usuário lê seu próprio uso"
  ON public.usage FOR SELECT
  USING (auth.uid() = user_id);

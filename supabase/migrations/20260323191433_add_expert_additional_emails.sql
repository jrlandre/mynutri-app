-- Adiciona suporte para múltiplos emails de login gerenciarem o mesmo expert
ALTER TABLE public.experts 
ADD COLUMN IF NOT EXISTS additional_emails text[] DEFAULT '{}'::text[];

-- Atualiza as políticas para permitir que o dono do email adicional veja os dados (para chamadas não-admin, se houver)
DROP POLICY IF EXISTS "Expert lê seus próprios dados" ON public.experts;
CREATE POLICY "Expert lê seus próprios dados"
  ON public.experts FOR SELECT
  USING (
    auth.uid() = user_id OR 
    (auth.jwt() ->> 'email')::text = ANY(additional_emails)
  );

DROP POLICY IF EXISTS "Expert atualiza seus próprios dados" ON public.experts;
CREATE POLICY "Expert atualiza seus próprios dados"
  ON public.experts FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    (auth.jwt() ->> 'email')::text = ANY(additional_emails)
  );

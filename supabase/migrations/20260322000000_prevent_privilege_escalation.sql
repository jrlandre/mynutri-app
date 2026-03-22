-- Impede que usuários comuns se auto-promovam a admin ou promoter
-- via UPDATE direto na tabela experts (bypass de RLS)

CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.is_admin IS DISTINCT FROM NEW.is_admin) OR
     (OLD.is_promoter IS DISTINCT FROM NEW.is_promoter) THEN
    RAISE EXCEPTION 'Alteração de privilégios não permitida';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS experts_prevent_privilege_escalation ON public.experts;

CREATE TRIGGER experts_prevent_privilege_escalation
  BEFORE UPDATE ON public.experts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_privilege_escalation();

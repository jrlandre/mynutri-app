-- Função auxiliar para buscar user_id por email em auth.users
-- Usada no webhook como fallback quando inviteUserByEmail falha (usuário já existe)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role;

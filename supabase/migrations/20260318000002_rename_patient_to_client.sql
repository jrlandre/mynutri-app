-- 1. Renomear tabela de pacientes para clientes
ALTER TABLE public.patients RENAME TO clients;

-- 2. Renomear constraints e índices para consistência
ALTER TABLE public.clients RENAME CONSTRAINT patients_pkey TO clients_pkey;
ALTER TABLE public.clients RENAME CONSTRAINT patients_expert_id_fkey TO clients_expert_id_fkey;
ALTER TABLE public.clients RENAME CONSTRAINT patients_expert_email_unique TO clients_expert_email_unique;
ALTER TABLE public.clients RENAME CONSTRAINT patients_user_id_expert_id_key TO clients_user_id_expert_id_key;

ALTER INDEX IF EXISTS patients_expert_id_idx RENAME TO clients_expert_id_idx;

-- 3. Atualizar política RLS
ALTER POLICY "Paciente vê seus próprios dados" ON public.clients RENAME TO "Client vê seus próprios dados";

-- 1. Renomear tabela principal
ALTER TABLE public.nutritionists RENAME TO experts;

-- 2. Renomear coluna na tabela de pacientes
ALTER TABLE public.patients RENAME COLUMN nutritionist_id TO expert_id;

-- 3. Renomear chaves estrangeiras e constraints (opcional para organização limpa)
ALTER TABLE public.patients RENAME CONSTRAINT patients_nutritionist_id_fkey TO patients_expert_id_fkey;
ALTER TABLE public.patients RENAME CONSTRAINT patients_nutritionist_email_unique TO patients_expert_email_unique;
ALTER TABLE public.patients RENAME CONSTRAINT patients_user_id_nutritionist_id_key TO patients_user_id_expert_id_key;

-- 4. Renomear índices
ALTER INDEX IF EXISTS patients_nutritionist_id_idx RENAME TO patients_expert_id_idx;

-- 5. Atualizar políticas RLS da tabela experts (antiga nutritionists)
ALTER POLICY "Nutricionista vê seus próprios dados" ON public.experts RENAME TO "Expert vê seus próprios dados";
ALTER POLICY "Vitrine pública de nutricionistas" ON public.experts RENAME TO "Vitrine pública de experts";
-- Reverte plan='lifetime' (não usar valor no array) e introduz coluna lifetime boolean

-- 1. Corrigir registro que tem plan='lifetime' antes de alterar a constraint
UPDATE experts SET plan = 'standard' WHERE plan = 'lifetime';

-- 2. Recriar constraint sem 'lifetime'
ALTER TABLE experts DROP CONSTRAINT nutritionists_plan_check;
ALTER TABLE experts ADD CONSTRAINT nutritionists_plan_check
  CHECK (plan = ANY (ARRAY['standard', 'enterprise']));

-- 3. Adicionar coluna lifetime
ALTER TABLE experts ADD COLUMN IF NOT EXISTS lifetime boolean NOT NULL DEFAULT false;

-- 4. Marcar Maria Luisa como lifetime (acesso padrão sem prazo, sem cobranças futuras)
UPDATE experts SET lifetime = true WHERE id = '0cb65fa1-198d-4dfb-b9a2-dad39936aa5f';

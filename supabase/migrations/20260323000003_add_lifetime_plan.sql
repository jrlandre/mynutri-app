-- Adiciona 'lifetime' como valor válido para o campo plan dos experts
ALTER TABLE experts DROP CONSTRAINT nutritionists_plan_check;
ALTER TABLE experts ADD CONSTRAINT nutritionists_plan_check
  CHECK (plan = ANY (ARRAY['standard', 'enterprise', 'lifetime']));

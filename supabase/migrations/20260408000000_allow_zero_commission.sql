-- Permite comissão 0% (ex: dono da plataforma)
ALTER TABLE public.commissions DROP CONSTRAINT percentage_range;
ALTER TABLE public.commissions ADD CONSTRAINT percentage_range CHECK (percentage >= 0 AND percentage <= 100);

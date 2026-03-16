ALTER TABLE nutritionists
  ADD COLUMN IF NOT EXISTS photo_url     text,
  ADD COLUMN IF NOT EXISTS specialty     text,
  ADD COLUMN IF NOT EXISTS city          text,
  ADD COLUMN IF NOT EXISTS listed        boolean not null default true,
  ADD COLUMN IF NOT EXISTS contact_links jsonb   not null default '[]';

CREATE POLICY "Vitrine pública de nutricionistas"
  ON nutritionists FOR SELECT
  TO anon
  USING (active = true AND listed = true);

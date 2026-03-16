-- Email do paciente para o fluxo de convite
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email text;

-- Unique: um email por nutricionista
ALTER TABLE patients
  ADD CONSTRAINT patients_nutritionist_email_unique
  UNIQUE (nutritionist_id, email);

-- Índices
CREATE INDEX IF NOT EXISTS patients_magic_link_token_idx
  ON patients (magic_link_token) WHERE magic_link_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS patients_nutritionist_id_idx
  ON patients (nutritionist_id);

-- Bucket público de avatares
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT DO NOTHING;

-- RLS storage
CREATE POLICY "Nutricionista faz upload do próprio avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Nutricionista atualiza o próprio avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatar público para leitura"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'avatars');

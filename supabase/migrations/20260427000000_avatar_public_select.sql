CREATE POLICY "Avatar público para leitura (auth)"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

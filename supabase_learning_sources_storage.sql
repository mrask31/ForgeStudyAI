-- ============================================
-- STORAGE BUCKET + POLICIES (Learning Sources)
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Create bucket (private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('learning-sources', 'learning-sources', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (should already be enabled in Supabase)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policies for authenticated users (owner-only access)
DROP POLICY IF EXISTS "Learning sources objects are viewable by owner" ON storage.objects;
CREATE POLICY "Learning sources objects are viewable by owner"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'learning-sources' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Learning sources objects are insertable by owner" ON storage.objects;
CREATE POLICY "Learning sources objects are insertable by owner"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'learning-sources' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Learning sources objects are updatable by owner" ON storage.objects;
CREATE POLICY "Learning sources objects are updatable by owner"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'learning-sources' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Learning sources objects are deletable by owner" ON storage.objects;
CREATE POLICY "Learning sources objects are deletable by owner"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'learning-sources' AND auth.uid() = owner);

-- ============================================
-- Verification
-- SELECT * FROM storage.buckets WHERE id = 'learning-sources';
-- SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
-- ============================================

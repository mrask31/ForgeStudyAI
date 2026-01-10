-- ============================================
-- DOCUMENTS TABLE ROW LEVEL SECURITY (RLS)
-- ============================================
-- CRITICAL SECURITY: Multi-tenant data isolation
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Ensure documents table has user_id column
-- If it doesn't exist, add it and backfill with a safe default
DO $$
BEGIN
  -- Check if user_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'user_id'
  ) THEN
    -- Add user_id column (nullable initially for backfill)
    ALTER TABLE documents ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Backfill: Set user_id to a placeholder for existing rows
    -- WARNING: This assumes you want to keep existing data
    -- If you want to delete orphaned documents, use: DELETE FROM documents WHERE user_id IS NULL;
    UPDATE documents SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
    
    -- Make user_id NOT NULL after backfill
    ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
  END IF;
END $$;

-- 2. Enable Row Level Security on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

-- 4. SELECT Policy: Users can only see their own documents
CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

-- 5. INSERT Policy: Users can only insert documents with their own user_id
CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. UPDATE Policy: Users can only update their own documents
CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. DELETE Policy: Users can only delete their own documents
CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- 8. Create composite index for common query patterns
-- (user_id + metadata->>filename for faster lookups)
CREATE INDEX IF NOT EXISTS idx_documents_user_filename 
ON documents(user_id, ((metadata->>'filename')));

-- 9. Create index for active documents filtering (for vector search)
CREATE INDEX IF NOT EXISTS idx_documents_user_active 
ON documents(user_id, ((metadata->>'is_active')::boolean))
WHERE ((metadata->>'is_active')::boolean = true OR metadata->>'is_active' IS NULL);

-- ============================================
-- VERIFICATION QUERIES (Run these to test)
-- ============================================
-- 
-- 1. Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'documents';
-- Should return: rowsecurity = true
--
-- 2. Check policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'documents';
-- Should return 4 policies (SELECT, INSERT, UPDATE, DELETE)
--
-- 3. Test as authenticated user (replace with actual user_id):
-- SET request.jwt.claim.sub = 'your-user-id-here';
-- SELECT COUNT(*) FROM documents;
-- Should only return count of that user's documents
-- ============================================


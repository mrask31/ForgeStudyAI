-- ============================================
-- FILE_KEY MIGRATION
-- ============================================
-- Adds a durable file-level identifier to documents table
-- This allows reliable grouping of chunks by file, independent of filename
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Add file_key column to documents table
DO $$
BEGIN
  -- Check if file_key column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'file_key'
  ) THEN
    -- Add file_key column (nullable initially for backfill)
    ALTER TABLE documents ADD COLUMN file_key TEXT;
    
    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_documents_file_key ON documents(file_key);
    
    -- Create composite index for common query patterns
    CREATE INDEX IF NOT EXISTS idx_documents_user_file_key 
    ON documents(user_id, file_key);
  END IF;
END $$;

-- 2. Backfill file_key for existing documents
-- Use format: user_id:filename:created_at_date (YYYY-MM-DD)
-- This groups chunks from the same file uploaded on the same day
UPDATE documents
SET file_key = CONCAT(
  user_id::text, 
  ':', 
  COALESCE(metadata->>'filename', 'untitled'),
  ':',
  DATE(created_at)::text
)
WHERE file_key IS NULL;

-- 3. Make file_key NOT NULL after backfill
-- Note: This will fail if any rows still have NULL file_key
-- If needed, set a default for any remaining NULLs
UPDATE documents
SET file_key = CONCAT(user_id::text, ':untitled:', DATE(created_at)::text)
WHERE file_key IS NULL;

ALTER TABLE documents ALTER COLUMN file_key SET NOT NULL;

-- 4. Add comment explaining the column
COMMENT ON COLUMN documents.file_key IS 
  'Durable file-level identifier. Groups chunks from the same uploaded file. Format: user_id:filename:date';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- 
-- 1. Check file_key column exists:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'documents' AND column_name = 'file_key';
--
-- 2. Check file_key distribution:
-- SELECT file_key, COUNT(*) as chunk_count 
-- FROM documents 
-- WHERE user_id = 'your-user-id-here'
-- GROUP BY file_key 
-- ORDER BY chunk_count DESC 
-- LIMIT 10;
--
-- 3. Count distinct files (should match UI counts):
-- SELECT COUNT(DISTINCT file_key) as distinct_files
-- FROM documents 
-- WHERE user_id = 'your-user-id-here' 
--   AND document_type = 'note';
-- ============================================


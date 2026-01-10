-- ============================================
-- BINDER FILE MANAGEMENT SCHEMA UPDATE
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================
-- This migration adds support for:
-- 1. Context toggling (is_active flag in metadata)
-- 2. Batch deletion (already supported via metadata->filename)
-- ============================================

-- Update all existing documents to have is_active: true in metadata
-- This ensures backward compatibility - all existing documents are active by default
UPDATE documents
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{is_active}',
  'true'::jsonb,
  true
)
WHERE metadata->>'is_active' IS NULL;

-- Optional: Create an index on metadata->>filename for faster lookups
-- (This is helpful for batch operations)
CREATE INDEX IF NOT EXISTS idx_documents_metadata_filename 
ON documents USING btree ((metadata->>'filename'));

-- Optional: Create an index on metadata->>is_active for faster filtering
-- (This is helpful when filtering active documents for vector search)
CREATE INDEX IF NOT EXISTS idx_documents_metadata_is_active 
ON documents USING btree (((metadata->>'is_active')::boolean))
WHERE (metadata->>'is_active')::boolean = true;

-- ============================================
-- USAGE NOTES
-- ============================================
-- 1. When querying for active documents in vector search:
--    WHERE metadata->>'is_active' = 'true' OR metadata->>'is_active' IS NULL
--
-- 2. When toggling a document's context:
--    UPDATE documents 
--    SET metadata = jsonb_set(metadata, '{is_active}', 'false'::jsonb)
--    WHERE metadata->>'filename' = 'your-filename.pdf';
--
-- 3. When deleting documents:
--    DELETE FROM documents 
--    WHERE metadata->>'filename' = 'your-filename.pdf';
-- ============================================


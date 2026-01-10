-- ============================================
-- DOCUMENT TYPE MIGRATION
-- ============================================
-- Adds document_type column to distinguish between
-- student-authored notes and reference materials
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Add document_type column with default 'reference'
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'reference'
CHECK (document_type IN ('note', 'reference'));

-- 2. Set all existing documents to 'reference' (backward compatibility)
UPDATE documents
SET document_type = 'reference'
WHERE document_type IS NULL;

-- 3. Create index for faster filtering by document_type
CREATE INDEX IF NOT EXISTS idx_documents_document_type 
ON documents (document_type)
WHERE document_type IS NOT NULL;

-- 4. Drop existing match_documents functions to avoid ambiguity
-- Drop all possible overloads (using CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS match_documents(vector, float, int, uuid) CASCADE;
DROP FUNCTION IF EXISTS match_documents(vector, float, int, uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS match_documents(vector, float, int, uuid, boolean, text) CASCADE;

-- 5. Create match_documents function with document_type filtering support
CREATE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  user_id_filter uuid DEFAULT auth.uid(),
  filter_active boolean DEFAULT true,
  filter_document_type TEXT DEFAULT NULL  -- 'note', 'reference', or NULL for mixed
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float,
  document_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity,
    COALESCE(documents.document_type, 'reference') as document_type
  FROM documents
  WHERE 
    -- User isolation
    documents.user_id = user_id_filter
    -- Active documents filter
    AND (
      CASE 
        WHEN filter_active = true THEN
          (documents.metadata->>'is_active' = 'true' OR documents.metadata->>'is_active' IS NULL)
        ELSE true
      END
    )
    -- Document type filter
    AND (
      CASE 
        WHEN filter_document_type IS NOT NULL THEN
          COALESCE(documents.document_type, 'reference') = filter_document_type
        ELSE true
      END
    )
    -- Similarity threshold
    AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY 
    -- Prioritize 'note' documents when filter_document_type is NULL (mixed mode)
    CASE 
      WHEN filter_document_type IS NULL THEN
        CASE WHEN COALESCE(documents.document_type, 'reference') = 'note' THEN 0 ELSE 1 END
      ELSE 0
    END,
    documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. Grant execute permission
GRANT EXECUTE ON FUNCTION match_documents(vector, float, int, uuid, boolean, text) TO authenticated;

-- ============================================
-- USAGE NOTES
-- ============================================
-- Filter by notes only:
--   filter_document_type = 'note'
--
-- Filter by reference only:
--   filter_document_type = 'reference'
--
-- Mixed mode (prioritize notes):
--   filter_document_type = NULL
-- ============================================


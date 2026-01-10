-- ============================================
-- VECTOR SEARCH RPC FUNCTION OVERLOADS
-- ============================================
-- Creates overloaded versions of match_documents with additional filters
-- CRITICAL: All functions must return id as uuid (cast if necessary)
-- Run this SQL in your Supabase SQL Editor AFTER the base function
-- ============================================

-- 1. 5-arg version: with filter_active parameter
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  user_id_filter uuid DEFAULT auth.uid(),
  filter_active boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id::uuid,  -- Explicit cast to ensure uuid type
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  FROM documents
  WHERE 
    documents.user_id = user_id_filter
    AND (
      CASE 
        WHEN filter_active THEN
          (documents.metadata->>'is_active' = 'true' OR documents.metadata->>'is_active' IS NULL)
        ELSE true
      END
    )
    AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 2. 6-arg version: with filter_active and filter_document_type parameters
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  user_id_filter uuid DEFAULT auth.uid(),
  filter_active boolean DEFAULT true,
  filter_document_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id::uuid,  -- Explicit cast to ensure uuid type
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  FROM documents
  WHERE 
    documents.user_id = user_id_filter
    AND (
      CASE 
        WHEN filter_active THEN
          (documents.metadata->>'is_active' = 'true' OR documents.metadata->>'is_active' IS NULL)
        ELSE true
      END
    )
    AND (
      CASE 
        WHEN filter_document_type IS NOT NULL THEN
          documents.document_type = filter_document_type
        ELSE true
      END
    )
    AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 3. Update the base 4-arg function to also cast id to uuid
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  user_id_filter uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id::uuid,  -- Explicit cast to ensure uuid type
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  FROM documents
  WHERE 
    documents.user_id = user_id_filter
    AND (
      documents.metadata->>'is_active' = 'true' 
      OR documents.metadata->>'is_active' IS NULL
    )
    AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_documents TO authenticated;


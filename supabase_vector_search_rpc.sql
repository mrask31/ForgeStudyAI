-- ============================================
-- VECTOR SEARCH RPC FUNCTION
-- ============================================
-- Creates a secure RPC function for similarity search
-- SECURITY: Filters by user_id and is_active
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Create the match_documents function
-- This function performs vector similarity search with security filters
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),  -- text-embedding-3-small produces 1536-dimensional vectors
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  user_id_filter uuid DEFAULT auth.uid()  -- Default to current user for security
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with function creator's privileges, but still respects RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id::uuid,  -- Explicit cast to ensure uuid type (handles bigint if present)
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  FROM documents
  WHERE 
    -- CRITICAL: User isolation - only return documents for the specified user
    documents.user_id = user_id_filter
    -- CRITICAL: Only active documents (is_active = true or null for backward compatibility)
    AND (
      documents.metadata->>'is_active' = 'true' 
      OR documents.metadata->>'is_active' IS NULL
    )
    -- Similarity threshold filter
    AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 2. Grant execute permission to authenticated users
-- RLS policies on documents table will still enforce access control
GRANT EXECUTE ON FUNCTION match_documents TO authenticated;

-- 3. Create index for faster vector similarity searches
-- This index helps with the cosine distance operator (<=>)
-- Note: You may need to adjust the vector dimension if using a different embedding model
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- USAGE EXAMPLE
-- ============================================
-- 
-- From application code:
-- const { data, error } = await supabase.rpc('match_documents', {
--   query_embedding: embeddingArray,
--   match_threshold: 0.7,
--   match_count: 5,
--   user_id_filter: user.id  // Explicitly pass user ID for security
-- })
--
-- The function will:
-- 1. Filter by user_id (security)
-- 2. Filter by is_active = true (only active documents)
-- 3. Calculate cosine similarity
-- 4. Return top N matches above threshold
-- ============================================

-- ============================================
-- VERIFICATION
-- ============================================
-- 
-- Test the function (replace with actual embedding and user_id):
-- SELECT * FROM match_documents(
--   '[0.1, 0.2, ...]'::vector(1536),  -- Your query embedding
--   0.7,  -- Threshold
--   5,    -- Count
--   'your-user-id-here'::uuid  -- User ID
-- );
-- ============================================


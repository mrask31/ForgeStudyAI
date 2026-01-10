/**
 * Vector Search Utilities
 * SECURITY: All vector search queries MUST filter by user_id and is_active
 * Use these helpers when implementing pgvector similarity search
 */

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get active documents for a user (for vector search context)
 * SECURITY: Filters by user_id (enforced by RLS) and is_active
 * 
 * This is a template for when you implement vector similarity search.
 * Replace with your actual vector search implementation (e.g., using RPC functions).
 */
export async function getActiveUserDocuments(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 10
) {
  // Example: Using a vector similarity RPC function
  // You'll need to create this function in Supabase
  // 
  // CREATE OR REPLACE FUNCTION match_documents(
  //   query_embedding vector(1536),
  //   match_threshold float,
  //   match_count int,
  //   user_id_filter uuid
  // )
  // RETURNS TABLE (
  //   id uuid,
  //   content text,
  //   metadata jsonb,
  //   similarity float
  // )
  // LANGUAGE plpgsql
  // AS $$
  // BEGIN
  //   RETURN QUERY
  //   SELECT
  //     documents.id,
  //     documents.content,
  //     documents.metadata,
  //     1 - (documents.embedding <=> query_embedding) as similarity
  //   FROM documents
  //   WHERE 
  //     documents.user_id = user_id_filter  -- CRITICAL: User isolation
  //     AND (
  //       documents.metadata->>'is_active' = 'true' 
  //       OR documents.metadata->>'is_active' IS NULL
  //     )  -- CRITICAL: Only active documents
  //     AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  //   ORDER BY documents.embedding <=> query_embedding
  //   LIMIT match_count;
  // END;
  // $$;

  // Example usage (when RPC is implemented):
  // const { data, error } = await supabase.rpc('match_documents', {
  //   query_embedding: embedding,
  //   match_threshold: 0.7,
  //   match_count: limit,
  //   user_id_filter: userId  // CRITICAL: Pass authenticated user's ID
  // })

  // For now, return empty array as placeholder
  // When implementing, ensure:
  // 1. RPC function filters by user_id
  // 2. RPC function filters by is_active
  // 3. RLS policies are enforced (defense in depth)
  return []
}

/**
 * Build filter string for active documents in PostgREST queries
 * Use this when building manual vector search queries
 */
export function getActiveDocumentsFilter(): string {
  return "metadata->>'is_active'.is.null,metadata->>'is_active'.eq.true"
}

/**
 * Validate that a vector search query includes user_id filtering
 * Use this in development to catch security issues
 */
export function validateVectorSearchQuery(query: any, userId: string): boolean {
  if (!query || !userId) {
    console.error('[SECURITY] Vector search query missing user_id filter')
    return false
  }
  
  // Check if query includes user_id filter
  // This is a basic check - actual implementation depends on your query builder
  if (typeof query === 'object' && 'user_id' in query) {
    if (query.user_id !== userId) {
      console.error('[SECURITY] Vector search query user_id mismatch')
      return false
    }
    return true
  }
  
  console.error('[SECURITY] Vector search query missing user_id filter')
  return false
}


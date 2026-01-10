/**
 * Utility functions for binder file management
 * These helpers ensure consistent filtering of active/inactive documents
 */

/**
 * Get the active state from document metadata
 * Defaults to true if not set (backward compatibility)
 */
export function getDocumentActiveState(metadata: any): boolean {
  if (!metadata) return true;
  return metadata.is_active !== undefined ? metadata.is_active : true;
}

/**
 * Build a Supabase query filter for active documents only
 * Use this when querying documents for vector search or retrieval
 * 
 * Example usage:
 * ```ts
 * const { data } = await supabase
 *   .from('documents')
 *   .select('*')
 *   .or(getActiveDocumentsFilter())
 * ```
 */
export function getActiveDocumentsFilter(): string {
  // Returns a filter that matches:
  // - documents where is_active is explicitly 'true'
  // - documents where is_active is null/undefined (backward compatibility)
  return "metadata->>'is_active'.is.null,metadata->>'is_active'.eq.true";
}

/**
 * Build a Supabase query filter for vector similarity search with active documents only
 * This is a helper for when you implement pgvector similarity search
 * 
 * Example usage (when using RPC for vector search):
 * ```ts
 * const { data } = await supabase.rpc('match_documents', {
 *   query_embedding: embedding,
 *   match_threshold: 0.7,
 *   match_count: 5,
 *   user_id: user.id
 * })
 * .or(getActiveDocumentsFilter())
 * ```
 */
export function getActiveDocumentsPostgrestFilter(): string {
  // PostgREST filter format for active documents
  return "metadata->>'is_active'.is.null,metadata->>'is_active'.eq.true";
}

/**
 * Filter documents array to only include active ones
 * Useful for client-side filtering after fetching
 */
export function filterActiveDocuments<T extends { metadata?: any }>(documents: T[]): T[] {
  return documents.filter(doc => getDocumentActiveState(doc.metadata));
}


'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Batch delete documents by their IDs
 * This will delete all chunks associated with the given filenames
 */
export async function deleteDocuments(filenames: string[]) {
  const supabase = createClient()

  // 1. Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  if (!filenames || filenames.length === 0) {
    throw new Error('No files selected')
  }

  // 2. Delete all document chunks that match the filenames
  // Since documents are stored as chunks, we need to delete by metadata->filename
  // Supabase doesn't support .in() with JSONB paths, so we delete each filename separately
  try {
    const deletePromises = filenames.map(async (filename) => {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('user_id', user.id)
        .eq('metadata->>filename', filename)
      
      if (error) {
        console.error(`Failed to delete ${filename}:`, error)
        throw error
      }
    })

    await Promise.all(deletePromises)
  } catch (err: any) {
    console.error('Document deletion failed:', err)
    throw new Error('Failed to delete documents')
  }

  // 3. Refresh the UI
  revalidatePath('/classes', 'page')
  return { success: true, deleted: filenames.length }
}

/**
 * Toggle the active state of a document (include/exclude from AI context)
 * Uses metadata JSONB to store is_active flag (defaults to true)
 */
export async function toggleDocumentContext(filename: string, isActive: boolean) {
  try {
    const supabase = createClient()

    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[toggleDocumentContext] Auth error:', authError)
      throw new Error('Unauthorized')
    }

    // 2. Update all chunks for this filename
    // We need to update the metadata JSONB to include is_active
    // First, get existing documents to preserve other metadata
    const { data: existingDocs, error: fetchError } = await supabase
      .from('documents')
      .select('id, metadata')
      .eq('user_id', user.id)
      .eq('metadata->>filename', filename)

    if (fetchError) {
      console.error('[toggleDocumentContext] Failed to fetch documents:', fetchError)
      throw new Error(`Failed to fetch documents: ${fetchError.message}`)
    }

    if (!existingDocs || existingDocs.length === 0) {
      console.warn('[toggleDocumentContext] Document not found:', filename)
      throw new Error(`Document "${filename}" not found`)
    }

    console.log(`[toggleDocumentContext] Found ${existingDocs.length} chunks for ${filename}, setting is_active to ${isActive}`)

    // 3. Update each chunk's metadata with is_active flag
    const updatePromises = existingDocs.map(async (doc) => {
      try {
        const currentMetadata = doc.metadata || {}
        const updatedMetadata = {
          ...currentMetadata,
          is_active: isActive
        }

        const { error } = await supabase
          .from('documents')
          .update({ metadata: updatedMetadata })
          .eq('id', doc.id)
          .eq('user_id', user.id)

        if (error) {
          console.error(`[toggleDocumentContext] Failed to update chunk ${doc.id}:`, error)
          throw new Error(`Failed to update document: ${error.message}`)
        }
      } catch (err: any) {
        console.error(`[toggleDocumentContext] Error updating chunk ${doc.id}:`, err)
        throw err
      }
    })

    await Promise.all(updatePromises)

    console.log(`[toggleDocumentContext] Successfully toggled ${filename} to ${isActive ? 'active' : 'inactive'}`)

    // 4. Refresh the UI
    revalidatePath('/classes', 'page')
    return { success: true, filename, isActive }
  } catch (error: any) {
    console.error('[toggleDocumentContext] Error:', error)
    // Return a user-friendly error message
    const errorMessage = error?.message || 'An unexpected error occurred'
    throw new Error(errorMessage)
  }
}


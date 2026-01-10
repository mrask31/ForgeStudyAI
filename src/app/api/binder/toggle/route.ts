import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/binder/toggle
 * Toggle the active state of a document
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    
    let body
    try {
      body = await req.json()
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    
    const { filename, isActive } = body

    if (!filename || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: filename and isActive required' },
        { status: 400 }
      )
    }

    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get existing documents
    const { data: existingDocs, error: fetchError } = await supabase
      .from('documents')
      .select('id, metadata')
      .eq('user_id', user.id)
      .eq('metadata->>filename', filename)

    if (fetchError) {
      console.error('[Toggle API] Failed to fetch documents:', fetchError)
      return NextResponse.json(
        { error: `Failed to fetch documents: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!existingDocs || existingDocs.length === 0) {
      return NextResponse.json(
        { error: `Document "${filename}" not found` },
        { status: 404 }
      )
    }

    // 3. Update each chunk's metadata
    const updateErrors: string[] = []
    
    for (const doc of existingDocs) {
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
          console.error(`[Toggle API] Error updating chunk ${doc.id}:`, error)
          updateErrors.push(`Chunk ${doc.id}: ${error.message}`)
        }
      } catch (docError: any) {
        console.error(`[Toggle API] Exception updating chunk ${doc.id}:`, docError)
        updateErrors.push(`Chunk ${doc.id}: ${docError?.message || 'Unknown error'}`)
      }
    }

    if (updateErrors.length > 0) {
      return NextResponse.json(
        { 
          error: `Failed to update some chunks: ${updateErrors.join('; ')}`,
          partial: true
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      filename,
      isActive,
      chunksUpdated: existingDocs.length
    })
  } catch (error: any) {
    console.error('[Toggle API] Unexpected error:', error)
    
    // Ensure we always return JSON, never HTML
    const errorMessage = error?.message || 'An unexpected error occurred'
    
    // Check if error message contains HTML (which shouldn't happen)
    if (errorMessage.includes('<!DOCTYPE') || errorMessage.includes('<html>')) {
      return NextResponse.json(
        { error: 'Server error: Invalid response format' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}


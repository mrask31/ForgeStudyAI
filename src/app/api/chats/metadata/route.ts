import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chats/metadata
 * Returns metadata for a specific chat session
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId') || searchParams.get('chatId')

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId or chatId is required' }, { status: 400 })
    }

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch session metadata
    const { data: chat, error } = await supabase
      .from('chats')
      .select('id, title, session_type, mode, metadata')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('[API] Chats metadata error:', error)
      return NextResponse.json({ error: 'Failed to fetch session metadata' }, { status: 500 })
    }

    if (!chat) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get the raw metadata from the database
    const rawMetadata = chat.metadata || {}
    
    // Log the full structure to debug
    console.log('[Chats Metadata API] Raw metadata from DB:', {
      hasAttachedFiles: !!rawMetadata.attachedFiles,
      attachedFilesCount: Array.isArray(rawMetadata.attachedFiles) ? rawMetadata.attachedFiles.length : 0,
      hasAttachedFileIds: !!rawMetadata.attachedFileIds,
      attachedFileIdsCount: Array.isArray(rawMetadata.attachedFileIds) ? rawMetadata.attachedFileIds.length : 0,
      fullMetadata: rawMetadata,
      metadataKeys: Object.keys(rawMetadata)
    })

    const result = {
      session_type: chat.session_type || 'general',
      title: chat.title,
      mode: chat.mode || 'tutor',
      metadata: rawMetadata, // Return the full metadata object as-is
    }

    console.log('[Chats Metadata API] Returning metadata:', {
      hasAttachedFiles: !!result.metadata.attachedFiles,
      attachedFilesCount: Array.isArray(result.metadata.attachedFiles) ? result.metadata.attachedFiles.length : 0,
      attachedFiles: result.metadata.attachedFiles,
      hasAttachedFileIds: !!result.metadata.attachedFileIds,
      attachedFileIds: result.metadata.attachedFileIds
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[API] Chats metadata critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/chats/metadata
 * Updates metadata for a specific chat session
 */
export async function PATCH(req: Request) {
  try {
    const supabase = createClient()
    const body = await req.json()
    const { chatId, metadata } = body

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 })
    }

    if (!metadata || typeof metadata !== 'object') {
      return NextResponse.json({ error: 'metadata must be an object' }, { status: 400 })
    }

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update chat metadata (merge with existing metadata)
    const { data: existingChat } = await supabase
      .from('chats')
      .select('metadata')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single()

    if (!existingChat) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const existingMetadata = (existingChat.metadata && typeof existingChat.metadata === 'object') 
      ? existingChat.metadata 
      : {}
    
    // Merge metadata, ensuring arrays are replaced (not merged)
    // CRITICAL: Check for !== undefined (not truthy) because empty arrays [] are falsy
    const updatedMetadata = { 
      ...existingMetadata, 
      ...metadata,
      // If attachedFiles is provided (even if empty array), replace it (don't merge arrays)
      ...(metadata.attachedFiles !== undefined ? { attachedFiles: metadata.attachedFiles } : {}),
      // If attachedFileIds is provided (even if empty array), replace it (don't merge arrays)
      ...(metadata.attachedFileIds !== undefined ? { attachedFileIds: metadata.attachedFileIds } : {})
    }
    
    console.log('[Chats Metadata API] Metadata merge:', {
      existingHasAttachedFiles: !!existingMetadata.attachedFiles,
      existingAttachedFilesCount: Array.isArray(existingMetadata.attachedFiles) ? existingMetadata.attachedFiles.length : 0,
      incomingHasAttachedFiles: metadata.attachedFiles !== undefined,
      incomingAttachedFilesCount: Array.isArray(metadata.attachedFiles) ? metadata.attachedFiles.length : 0,
      finalHasAttachedFiles: !!updatedMetadata.attachedFiles,
      finalAttachedFilesCount: Array.isArray(updatedMetadata.attachedFiles) ? updatedMetadata.attachedFiles.length : 0
    })

    console.log('[Chats Metadata API] Updating metadata:', {
      chatId,
      hasAttachedFiles: !!metadata.attachedFiles,
      attachedFilesCount: metadata.attachedFiles?.length || 0,
      sampleFile: metadata.attachedFiles?.[0] || null
    })

    const { error: updateError } = await supabase
      .from('chats')
      .update({ metadata: updatedMetadata })
      .eq('id', chatId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[API] Chats metadata update error:', updateError)
      return NextResponse.json({ error: 'Failed to update session metadata' }, { status: 500 })
    }

    console.log('[Chats Metadata API] Successfully updated metadata')

    return NextResponse.json({ success: true, metadata: updatedMetadata })
  } catch (error: any) {
    console.error('[API] Chats metadata PATCH critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


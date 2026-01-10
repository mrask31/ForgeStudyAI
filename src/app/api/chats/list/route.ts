import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chats/list
 * Returns list of user's chats for sidebar
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(req.url)
    const classId = searchParams.get('classId')

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query
    // Check if we want to include archived chats (for History view)
    const includeArchived = searchParams.get('includeArchived') === 'true'
    
    let query = supabase
      .from('chats')
      .select('id, title, session_type, updated_at, metadata, is_archived')
      .eq('user_id', user.id)
    
    // Only filter by is_archived if we don't want to include archived chats
    if (!includeArchived) {
      query = query.eq('is_archived', false) // Only non-archived chats
    }

    // Filter by classId if provided (stored in metadata.classId)
    // If classId is explicitly "null" (string), filter for General Tutor chats (no classId)
    // If classId is provided (not null), filter for that specific class
    // If classId is not provided at all, return all chats (for History view)
    if (classId === 'null' || classId === '') {
      // General Tutor: only chats without a classId in metadata
      // Use PostgREST filter syntax: metadata->>classId is null OR metadata->>class_id is null
      // But we actually want AND (both null), so we'll filter client-side for now
      // TODO: Optimize with proper PostgREST query if needed
    } else if (classId) {
      // Specific class: only chats for this class
      query = query.eq('metadata->>classId', classId)
    }
    // If classId is not provided at all, return all chats (no filter)

    const { data: chats, error } = await query
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[API] Chats list error:', error)
      // Return more detailed error for debugging
      return NextResponse.json({ 
        error: 'Failed to fetch chats',
        details: error.message 
      }, { status: 500 })
    }

    // Filter for General Tutor chats if classId is 'null' or ''
    let filteredChats = chats || []
    if (classId === 'null' || classId === '') {
      // General Tutor: only chats without a classId in metadata
      filteredChats = filteredChats.filter((chat: any) => {
        const chatClassId = chat.metadata?.classId || chat.metadata?.class_id
        return !chatClassId // No classId means General Tutor
      })
    }

    return NextResponse.json({ chats: filteredChats })
  } catch (error: any) {
    console.error('[API] Chats list critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


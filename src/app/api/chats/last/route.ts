import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chats/last
 * Returns the most recent chat for a class (or General Tutor if no classId)
 * Used for generating welcome messages
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
    let query = supabase
      .from('chats')
      .select('id, title, session_type, updated_at, metadata')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)

    // Filter by classId if provided
    if (classId) {
      query = query.eq('metadata->>classId', classId)
    } else {
      // For General Tutor, only get chats without a classId
      // Use isNull filter for JSONB field
      query = query.is('metadata->>classId', null)
    }

    const { data: chats, error } = await query

    if (error) {
      console.error('[API] Chats last error:', error)
      return NextResponse.json({ error: 'Failed to fetch last chat' }, { status: 500 })
    }

    const lastChat = chats && chats.length > 0 ? chats[0] : null

    // If we have a chat, get the first user message to see what they were studying
    let lastTopic = null
    if (lastChat) {
      const { data: messages } = await supabase
        .from('messages')
        .select('content')
        .eq('chat_id', lastChat.id)
        .eq('role', 'user')
        .order('sequence_number', { ascending: true })
        .limit(1)
        .maybeSingle()
      
      if (messages?.content) {
        // Extract topic from first message (first 100 chars)
        lastTopic = messages.content.substring(0, 100)
      }
    }

    return NextResponse.json({ 
      chat: lastChat,
      lastTopic: lastTopic
    })
  } catch (error: any) {
    console.error('[API] Chats last critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


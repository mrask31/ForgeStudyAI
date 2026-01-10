import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/chats/archive
 * Archives a chat by setting is_archived to true
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { chatId } = await req.json()

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 })
    }

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Archive the chat (set is_archived to true)
    const { error } = await supabase
      .from('chats')
      .update({ is_archived: true })
      .eq('id', chatId)
      .eq('user_id', user.id) // Ensure user owns the chat

    if (error) {
      console.error('[API] Error archiving chat:', error)
      return NextResponse.json({ error: 'Failed to archive chat' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] Critical error archiving chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

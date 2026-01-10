import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/chats/update-title
 * Updates the title of a chat session
 */
export async function PATCH(req: Request) {
  try {
    const supabase = createClient()
    const body = await req.json()
    const { chatId, title } = body

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 })
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 })
    }

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update chat title
    const { error: updateError } = await supabase
      .from('chats')
      .update({ title: title.trim() })
      .eq('id', chatId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[API] Chats update-title error:', updateError)
      return NextResponse.json({ error: 'Failed to update chat title' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] Chats update-title critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


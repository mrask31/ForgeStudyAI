import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/chats/delete
 * Deletes multiple chats by their IDs
 * Body: { chatIds: string[] }
 */
export async function DELETE(req: Request) {
  try {
    const supabase = createClient()
    const { chatIds } = await req.json()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
      return NextResponse.json({ error: 'No chat IDs provided' }, { status: 400 })
    }

    // Validate all IDs are UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const invalidIds = chatIds.filter(id => !uuidRegex.test(id))
    if (invalidIds.length > 0) {
      return NextResponse.json({ 
        error: 'Invalid chat ID format', 
        invalidIds 
      }, { status: 400 })
    }

    // Delete chats (RLS will ensure user can only delete their own chats)
    // Messages will be automatically deleted via CASCADE
    const { error: deleteError } = await supabase
      .from('chats')
      .delete()
      .in('id', chatIds)
      .eq('user_id', user.id) // Extra safety check

    if (deleteError) {
      console.error('[API] Chats delete error:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete chats',
        details: deleteError.message 
      }, { status: 500 })
    }

    console.log(`[API] Successfully deleted ${chatIds.length} chat(s)`)
    return NextResponse.json({ 
      success: true, 
      deleted: chatIds.length 
    })
  } catch (error: any) {
    console.error('[API] Chats delete critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


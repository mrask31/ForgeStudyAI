import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET: Retrieve saved clips for the authenticated user
export async function GET(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url)
    const classId = searchParams.get('classId')
    const folder = searchParams.get('folder')
    const tag = searchParams.get('tag')

    // Build query
    let query = supabase
      .from('saved_clips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (classId) {
      query = query.eq('class_id', classId)
    }
    if (folder) {
      query = query.eq('folder', folder)
    }
    if (tag) {
      query = query.contains('tags', [tag])
    }

    const { data: clips, error } = await query

    if (error) {
      console.error('[Clips API] Error fetching clips:', error)
      return NextResponse.json({ error: 'Failed to fetch clips' }, { status: 500 })
    }

    return NextResponse.json({ clips: clips || [] })
  } catch (error: any) {
    console.error('[Clips API] Critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new saved clip
export async function POST(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, content, folder, tags, classId, chatId, messageId } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // Insert the clip
    const { data: clip, error: insertError } = await supabase
      .from('saved_clips')
      .insert({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        folder: folder || 'General',
        tags: tags || [],
        class_id: classId || null,
        chat_id: chatId || null,
        message_id: messageId || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Clips API] Error creating clip:', insertError)
      return NextResponse.json({ error: 'Failed to save clip' }, { status: 500 })
    }

    return NextResponse.json({ clip })
  } catch (error: any) {
    console.error('[Clips API] Critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete a saved clip
export async function DELETE(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const clipId = searchParams.get('id')

    if (!clipId) {
      return NextResponse.json({ error: 'Clip ID is required' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('saved_clips')
      .delete()
      .eq('id', clipId)
      .eq('user_id', user.id) // Ensure user can only delete their own clips

    if (deleteError) {
      console.error('[Clips API] Error deleting clip:', deleteError)
      return NextResponse.json({ error: 'Failed to delete clip' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Clips API] Critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


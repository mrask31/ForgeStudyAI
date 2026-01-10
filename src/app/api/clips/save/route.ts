import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

type SupabaseServerClient = ReturnType<typeof createServerClient>

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
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await req.json()
    const { chatId, messageId, title, content, folder = 'General', tags = [], sourceDocumentIds = [], sourceCitations = {} } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    // 3. Save clip
    const { data: clip, error: insertError } = await supabase
      .from('clips')
      .insert({
        user_id: user.id,
        chat_id: chatId || null,
        message_id: messageId || null,
        title,
        content,
        folder,
        tags: Array.isArray(tags) ? tags : [],
        source_document_ids: Array.isArray(sourceDocumentIds) ? sourceDocumentIds : [],
        source_citations: sourceCitations || {},
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Clips] Save error:', insertError)
      return NextResponse.json({ error: 'Failed to save clip' }, { status: 500 })
    }

    return NextResponse.json({ clip }, { status: 201 })
  } catch (error: any) {
    console.error('[Clips] Critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

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

    // 2. Find active chats older than 21 days
    const twentyOneDaysAgo = new Date()
    twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21)

    const { data: oldChats, error: fetchError } = await supabase
      .from('chats')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .lt('last_active_at', twentyOneDaysAgo.toISOString())

    if (fetchError) {
      console.error('[Auto-Archive] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 })
    }

    if (!oldChats || oldChats.length === 0) {
      return NextResponse.json({ archived: 0 })
    }

    // 3. Archive all old chats (fast, no LLM call)
    const { error: updateError } = await supabase
      .from('chats')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
      })
      .in('id', oldChats.map(c => c.id))
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[Auto-Archive] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to archive chats' }, { status: 500 })
    }

    return NextResponse.json({ archived: oldChats.length })
  } catch (error: any) {
    console.error('[Auto-Archive] Critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


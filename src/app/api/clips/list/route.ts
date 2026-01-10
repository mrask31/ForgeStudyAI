import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

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

    // 2. Parse query params
    const { searchParams } = new URL(req.url)
    const folder = searchParams.get('folder')
    const tag = searchParams.get('tag')

    // 3. Build query
    let query = supabase
      .from('saved_clips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (folder) {
      query = query.eq('folder', folder)
    }

    if (tag) {
      query = query.contains('tags', [tag])
    }

    const { data: clips, error: fetchError } = await query

    if (fetchError) {
      console.error('[Clips] List error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch clips' }, { status: 500 })
    }

    return NextResponse.json({ clips: clips || [] })
  } catch (error: any) {
    console.error('[Clips] Critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET: Retrieve saved words for the user
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
            cookieStore.set({ name, value, ...options })
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

    const { data: words, error } = await supabase
      .from('word_bank')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[WordBank] Error fetching words:', error)
      return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 })
    }

    return NextResponse.json({ words: words || [] })
  } catch (error: any) {
    console.error('[WordBank] Critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Save a word to the word bank
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
            cookieStore.set({ name, value, ...options })
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

    const { term, definition, category } = await req.json()

    if (!term || !definition) {
      return NextResponse.json({ error: 'Term and definition are required' }, { status: 400 })
    }

    // Check if word already exists for this user
    const { data: existing } = await supabase
      .from('word_bank')
      .select('id')
      .eq('user_id', user.id)
      .eq('term', term.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Word already saved' }, { status: 409 })
    }

    const { data: word, error } = await supabase
      .from('word_bank')
      .insert({
        user_id: user.id,
        term: term.toLowerCase(),
        definition,
        category: category || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[WordBank] Error saving word:', error)
      return NextResponse.json({ error: 'Failed to save word' }, { status: 500 })
    }

    return NextResponse.json({ word })
  } catch (error: any) {
    console.error('[WordBank] Critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Remove a word from the word bank
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
            cookieStore.set({ name, value, ...options })
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
    const wordId = searchParams.get('id')

    if (!wordId) {
      return NextResponse.json({ error: 'Word ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('word_bank')
      .delete()
      .eq('id', wordId)
      .eq('user_id', user.id)

    if (error) {
      console.error('[WordBank] Error deleting word:', error)
      return NextResponse.json({ error: 'Failed to delete word' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[WordBank] Critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


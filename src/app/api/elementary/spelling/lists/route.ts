import { NextResponse } from 'next/server'
import { assertProfileOwnership, requireUser } from '@/app/api/elementary/_helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await requireUser()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase, user } = auth
    const { searchParams } = new URL(req.url)
    const profileId = searchParams.get('profileId')
    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const { data: lists, error } = await supabase
      .from('spelling_lists')
      .select('id, title, status, created_at, spelling_words(id, word, pattern, is_mastered)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Spelling Lists] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to load spelling lists' }, { status: 500 })
    }

    return NextResponse.json({ lists: lists || [] })
  } catch (error) {
    console.error('[Spelling Lists] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase, user } = auth
    const body = await req.json()
    const { profileId, title, words } = body || {}
    if (!profileId || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: 'profileId and words are required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const { data: list, error: listError } = await supabase
      .from('spelling_lists')
      .insert({ profile_id: profileId, title: title || 'Spelling List' })
      .select('*')
      .single()

    if (listError || !list) {
      console.error('[Spelling Lists] Create list error:', listError)
      return NextResponse.json({ error: 'Failed to create list' }, { status: 500 })
    }

    const wordRows = words.map((word: any) => ({
      list_id: list.id,
      profile_id: profileId,
      word: typeof word === 'string' ? word.trim() : word.word?.trim(),
      pattern: typeof word === 'string' ? null : word.pattern || null,
    })).filter((row: any) => row.word)

    const { error: wordsError } = await supabase
      .from('spelling_words')
      .insert(wordRows)

    if (wordsError) {
      console.error('[Spelling Lists] Create words error:', wordsError)
      return NextResponse.json({ error: 'Failed to add words' }, { status: 500 })
    }

    return NextResponse.json({ listId: list.id })
  } catch (error) {
    console.error('[Spelling Lists] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireUser()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase, user } = auth
    const body = await req.json()
    const { profileId, listId } = body || {}
    if (!profileId || !listId) {
      return NextResponse.json({ error: 'profileId and listId are required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const { error } = await supabase
      .from('spelling_lists')
      .delete()
      .eq('id', listId)
      .eq('profile_id', profileId)

    if (error) {
      console.error('[Spelling Lists] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Spelling Lists] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const listId = searchParams.get('listId')
    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    let query = supabase
      .from('spelling_words')
      .select('word')
      .eq('profile_id', profileId)
      .eq('is_mastered', true)

    if (listId) {
      query = query.eq('list_id', listId)
    }

    const { data, error } = await query
    if (error) {
      console.error('[Spelling Mastered] Error:', error)
      return NextResponse.json({ error: 'Failed to load mastered words' }, { status: 500 })
    }

    const words = (data || []).map((row: any) => row.word).filter(Boolean)
    return NextResponse.json({ words })
  } catch (error) {
    console.error('[Spelling Mastered] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

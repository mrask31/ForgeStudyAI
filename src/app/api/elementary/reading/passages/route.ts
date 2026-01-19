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

    const { data, error } = await supabase
      .from('reading_passages')
      .select('id, title, content, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Reading Passages] Error:', error)
      return NextResponse.json({ error: 'Failed to load passages' }, { status: 500 })
    }

    return NextResponse.json({ passages: data || [] })
  } catch (error) {
    console.error('[Reading Passages] Error:', error)
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
    const { profileId, title, content } = body || {}
    if (!profileId || !content) {
      return NextResponse.json({ error: 'profileId and content are required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const { data, error } = await supabase
      .from('reading_passages')
      .insert({ profile_id: profileId, title: title || null, content })
      .select('*')
      .single()

    if (error) {
      console.error('[Reading Passages] Create error:', error)
      return NextResponse.json({ error: 'Failed to save passage' }, { status: 500 })
    }

    return NextResponse.json({ passage: data })
  } catch (error) {
    console.error('[Reading Passages] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

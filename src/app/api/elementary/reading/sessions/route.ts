import { NextResponse } from 'next/server'
import { assertProfileOwnership, requireUser } from '@/app/api/elementary/_helpers'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const auth = await requireUser()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase, user } = auth
    const body = await req.json()
    const { profileId, passageId } = body || {}
    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const { data, error } = await supabase
      .from('reading_sessions')
      .insert({ profile_id: profileId, passage_id: passageId || null })
      .select('*')
      .single()

    if (error) {
      console.error('[Reading Sessions] Create error:', error)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({ session: data })
  } catch (error) {
    console.error('[Reading Sessions] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

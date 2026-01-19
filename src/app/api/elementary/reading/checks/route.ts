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
    const { profileId, sessionId, checkType, score, notes, completeSession } = body || {}
    if (!profileId || !sessionId || !checkType) {
      return NextResponse.json({ error: 'profileId, sessionId, checkType are required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const { data: check, error } = await supabase
      .from('reading_checks')
      .insert({
        profile_id: profileId,
        session_id: sessionId,
        check_type: checkType,
        score: typeof score === 'number' ? score : null,
        notes: notes || null,
      })
      .select('*')
      .single()

    if (error) {
      console.error('[Reading Checks] Create error:', error)
      return NextResponse.json({ error: 'Failed to save check' }, { status: 500 })
    }

    if (completeSession) {
      await supabase
        .from('reading_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId)
        .eq('profile_id', profileId)
    }

    return NextResponse.json({ check })
  } catch (error) {
    console.error('[Reading Checks] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

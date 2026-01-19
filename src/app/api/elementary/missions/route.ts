import { NextResponse } from 'next/server'
import { assertProfileOwnership, requireUser } from '@/app/api/elementary/_helpers'

export const dynamic = 'force-dynamic'

function computeStreak(dates: string[]) {
  const uniqueDates = Array.from(new Set(dates)).sort().reverse()
  if (uniqueDates.length === 0) return 0
  const today = new Date().toISOString().slice(0, 10)
  let streak = 0
  let cursor = new Date(today)
  for (const date of uniqueDates) {
    const cursorDate = cursor.toISOString().slice(0, 10)
    if (date !== cursorDate) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export async function GET(req: Request) {
  try {
    const auth = await requireUser()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase, user } = auth
    const { searchParams } = new URL(req.url)
    const profileId = searchParams.get('profileId')
    const mode = searchParams.get('mode')
    if (!profileId || !mode) {
      return NextResponse.json({ error: 'profileId and mode are required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const today = new Date().toISOString().slice(0, 10)
    const { data: existing, error: findError } = await supabase
      .from('learning_missions')
      .select('*')
      .eq('profile_id', profileId)
      .eq('mode', mode)
      .eq('mission_date', today)
      .maybeSingle()

    if (findError) {
      console.error('[Missions] Lookup error:', findError)
      return NextResponse.json({ error: 'Failed to load mission' }, { status: 500 })
    }

    let mission = existing
    if (!mission) {
      const { data: created, error: createError } = await supabase
        .from('learning_missions')
        .insert({ profile_id: profileId, mode, mission_date: today })
        .select('*')
        .single()
      if (createError) {
        console.error('[Missions] Create error:', createError)
        return NextResponse.json({ error: 'Failed to create mission' }, { status: 500 })
      }
      mission = created
    }

    const { data: completedDates } = await supabase
      .from('learning_missions')
      .select('mission_date')
      .eq('profile_id', profileId)
      .eq('mode', mode)
      .eq('status', 'completed')
      .order('mission_date', { ascending: false })

    const streak = computeStreak((completedDates || []).map((row: any) => row.mission_date))

    return NextResponse.json({ mission, streak })
  } catch (error) {
    console.error('[Missions] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireUser()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase, user } = auth
    const body = await req.json()
    const { missionId, status, timeSpentSeconds } = body || {}
    if (!missionId) {
      return NextResponse.json({ error: 'missionId is required' }, { status: 400 })
    }

    const { data: mission, error } = await supabase
      .from('learning_missions')
      .select('id, profile_id')
      .eq('id', missionId)
      .single()

    if (error || !mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 })
    }

    const profileCheck = await assertProfileOwnership(supabase, mission.profile_id, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const updates: Record<string, any> = {}
    if (status) {
      updates.status = status
      updates.completed_at = status === 'completed' ? new Date().toISOString() : null
    }
    if (typeof timeSpentSeconds === 'number') {
      updates.time_spent_seconds = timeSpentSeconds
    }

    const { data: updated, error: updateError } = await supabase
      .from('learning_missions')
      .update(updates)
      .eq('id', missionId)
      .select('*')
      .single()

    if (updateError) {
      console.error('[Missions] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update mission' }, { status: 500 })
    }

    return NextResponse.json({ mission: updated })
  } catch (error) {
    console.error('[Missions] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

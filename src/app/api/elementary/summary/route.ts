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
    const { data: mission } = await supabase
      .from('learning_missions')
      .select('*')
      .eq('profile_id', profileId)
      .eq('mode', mode)
      .eq('mission_date', today)
      .maybeSingle()

    const { data: completedDates } = await supabase
      .from('learning_missions')
      .select('mission_date')
      .eq('profile_id', profileId)
      .eq('mode', mode)
      .eq('status', 'completed')
      .order('mission_date', { ascending: false })

    const streak = computeStreak((completedDates || []).map((row: any) => row.mission_date))
    const timeToday = mission?.time_spent_seconds ?? 0

    let proof: Record<string, number> = {}

    if (mode === 'spelling') {
      const { count: masteredCount } = await supabase
        .from('spelling_words')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .eq('is_mastered', true)
      const { data: missedRows } = await supabase
        .from('spelling_results')
        .select('word_id')
        .eq('profile_id', profileId)
        .eq('last_result', 'missed')
      const missedCount = new Set((missedRows || []).map((row: any) => row.word_id).filter(Boolean)).size
      proof = {
        mastered: masteredCount || 0,
        review: missedCount,
      }
    } else if (mode === 'reading') {
      const { count: completedSessions } = await supabase
        .from('reading_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .eq('status', 'completed')
      const { count: checksCount } = await supabase
        .from('reading_checks')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
      proof = {
        passages: completedSessions || 0,
        checks: checksCount || 0,
      }
    } else if (mode === 'homework') {
      const { count: completedTasks } = await supabase
        .from('homework_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .eq('status', 'completed')
      const { count: pendingTasks } = await supabase
        .from('homework_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .neq('status', 'completed')
      proof = {
        completed: completedTasks || 0,
        pending: pendingTasks || 0,
      }
    }

    return NextResponse.json({
      mission: mission || null,
      streak,
      timeToday,
      proof,
    })
  } catch (error) {
    console.error('[Elementary Summary] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/weekly-summary
 * Weekly cron (Sunday): logs a summary for each active student.
 * Wire Resend email later — for now, console.log only.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Get all active student profiles
    const { data: profiles } = await supabase
      .from('student_profiles')
      .select('id, display_name, owner_id')

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ summaries: 0 })
    }

    let summariesGenerated = 0

    for (const profile of profiles) {
      // Count sessions this week
      const { count: sessionsCount } = await supabase
        .from('mastery_checks')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profile.id)
        .gte('created_at', sevenDaysAgo)

      // Get mastery changes this week
      const { data: masteryChanges } = await supabase
        .from('mastery_checks')
        .select('class_id, score_delta, student_classes!inner(name)')
        .eq('profile_id', profile.id)
        .gte('created_at', sevenDaysAgo)

      // Get new portfolio entries
      const { data: newEntries } = await supabase
        .from('portfolio_entries')
        .select('title')
        .eq('profile_id', profile.id)
        .gte('created_at', sevenDaysAgo)

      // Aggregate mastery changes by course
      const courseDeltas = new Map<string, { name: string; delta: number }>()
      for (const check of masteryChanges || []) {
        const name = (check as any).student_classes?.name || 'Unknown'
        const existing = courseDeltas.get(check.class_id) || { name, delta: 0 }
        existing.delta += check.score_delta || 0
        courseDeltas.set(check.class_id, existing)
      }

      const masteryChangeSummary = Array.from(courseDeltas.values())
        .map(c => `${c.name} ${c.delta >= 0 ? '+' : ''}${c.delta}`)
        .join(', ')

      const entryTitles = (newEntries || []).map(e => e.title).join(', ')

      // Log summary (wire Resend later)
      console.log(`Weekly summary for [${profile.display_name}]: Sessions this week: ${sessionsCount || 0}, Mastery changes: [${masteryChangeSummary || 'none'}], New portfolio entries: [${entryTitles || 'none'}]`)

      summariesGenerated++
    }

    return NextResponse.json({ summaries: summariesGenerated })
  } catch (error: any) {
    console.error('[Weekly Summary] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

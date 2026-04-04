import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/mastery-decay
 * Weekly cron (Monday 6am): reduces mastery scores by 5 points.
 * Skips decay if student had a session in the last 7 days for that course.
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

    const { data: scores } = await supabase
      .from('mastery_scores')
      .select('id, profile_id, class_id, score')
      .gt('score', 0)

    if (!scores || scores.length === 0) {
      return NextResponse.json({ decayed: 0, skipped: 0 })
    }

    const { data: recentChecks } = await supabase
      .from('mastery_checks')
      .select('profile_id, class_id')
      .gte('created_at', sevenDaysAgo)

    const activeSet = new Set(
      (recentChecks || []).map((c: any) => `${c.profile_id}:${c.class_id}`)
    )

    let decayed = 0
    let skipped = 0

    for (const score of scores) {
      if (activeSet.has(`${score.profile_id}:${score.class_id}`)) {
        skipped++
        continue
      }

      const newScore = Math.max(0, score.score - 5)
      const { error } = await supabase
        .from('mastery_scores')
        .update({ score: newScore, last_updated: new Date().toISOString() })
        .eq('id', score.id)

      if (!error) decayed++
    }

    console.log(`[Mastery Decay] Decayed: ${decayed}, Skipped: ${skipped}`)
    return NextResponse.json({ decayed, skipped })
  } catch (error: any) {
    console.error('[Mastery Decay] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

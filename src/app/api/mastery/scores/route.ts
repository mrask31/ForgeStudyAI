import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/mastery/scores?profileId=xxx
 * Returns mastery scores for all classes, joined with class names.
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const profileId = searchParams.get('profileId')
    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
    }

    const { data: scores, error } = await supabase
      .from('mastery_scores')
      .select(`
        id,
        class_id,
        score,
        sessions_count,
        last_updated,
        student_classes!inner(name, code, type)
      `)
      .eq('profile_id', profileId)
      .order('score', { ascending: false })

    if (error) {
      console.error('[Mastery Scores] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
    }

    const formatted = (scores || []).map((s: any) => ({
      classId: s.class_id,
      className: s.student_classes?.name || 'Unknown',
      classCode: s.student_classes?.code || '',
      classType: s.student_classes?.type || 'other',
      score: s.score,
      sessionsCount: s.sessions_count,
      lastUpdated: s.last_updated,
    }))

    return NextResponse.json({ scores: formatted })
  } catch (error: any) {
    console.error('[Mastery Scores] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

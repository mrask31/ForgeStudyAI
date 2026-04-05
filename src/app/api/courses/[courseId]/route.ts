import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/courses/[courseId]?profileId=xxx
 * Returns all workspace data for a course in one call.
 */
export async function GET(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId } = params
    const { searchParams } = new URL(req.url)
    const profileId = searchParams.get('profileId')

    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
    }

    // Fetch course info
    const { data: course } = await supabase
      .from('student_classes')
      .select('id, name, code, type')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Fetch mastery score
    const { data: mastery } = await supabase
      .from('mastery_scores')
      .select('score, sessions_count, last_updated')
      .eq('profile_id', profileId)
      .eq('class_id', courseId)
      .single()

    // Fetch mastery check history (last 5)
    const { data: masteryHistory } = await supabase
      .from('mastery_checks')
      .select('id, score_delta, questions, created_at')
      .eq('profile_id', profileId)
      .eq('class_id', courseId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Fetch upcoming assignments (match by course_name since manual_assignments uses text)
    const { data: assignments } = await supabase
      .from('manual_assignments')
      .select('id, title, due_date, notes, is_complete, course_name')
      .eq('profile_id', profileId)
      .eq('is_complete', false)
      .or(`course_name.ilike.%${course.name}%,course_name.ilike.%${course.code}%`)
      .order('due_date', { ascending: true })
      .limit(10)

    // Fetch vault documents linked to this course
    const { data: rawDocs } = await supabase
      .from('documents')
      .select('id, file_key, metadata, document_type, created_at')
      .eq('user_id', user.id)
      .eq('metadata->>is_active', 'true')
      .eq('metadata->>class_id', courseId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Group documents by file_key
    const docMap = new Map<string, any>()
    for (const doc of rawDocs || []) {
      if (!doc.file_key || docMap.has(doc.file_key)) continue
      docMap.set(doc.file_key, {
        fileKey: doc.file_key,
        filename: (doc.metadata as any)?.filename || 'Document',
        documentType: doc.document_type,
        createdAt: doc.created_at,
      })
    }

    // Fetch recent chat sessions for this course
    const { data: sessions } = await supabase
      .from('chats')
      .select('id, title, metadata, updated_at')
      .eq('user_id', user.id)
      .eq('metadata->>classId', courseId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(5)

    // Fetch portfolio entries for this course
    const { data: portfolio } = await supabase
      .from('portfolio_entries')
      .select('id, type, title, content, created_at, is_pinned')
      .eq('profile_id', profileId)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      course: {
        id: course.id,
        name: course.name,
        code: course.code,
        type: course.type,
      },
      mastery: {
        score: mastery?.score ?? 0,
        sessionsCount: mastery?.sessions_count ?? 0,
        lastUpdated: mastery?.last_updated ?? null,
        history: (masteryHistory || []).map((h: any) => ({
          id: h.id,
          scoreDelta: h.score_delta,
          createdAt: h.created_at,
        })),
      },
      assignments: assignments || [],
      documents: Array.from(docMap.values()),
      sessions: (sessions || []).map((s: any) => ({
        id: s.id,
        title: s.title || 'Untitled session',
        updatedAt: s.updated_at,
      })),
      portfolio: portfolio || [],
    })
  } catch (error: any) {
    console.error('[Course Workspace] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

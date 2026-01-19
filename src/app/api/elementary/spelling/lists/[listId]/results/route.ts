import { NextResponse } from 'next/server'
import { assertProfileOwnership, requireUser } from '@/app/api/elementary/_helpers'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { listId: string } }) {
  try {
    const auth = await requireUser()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase, user } = auth
    const body = await req.json()
    const { profileId, results } = body || {}
    if (!profileId || !Array.isArray(results)) {
      return NextResponse.json({ error: 'profileId and results are required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const listId = params.listId
    const now = new Date().toISOString()

    for (const result of results) {
      const wordId = result.wordId
      const correct = !!result.correct
      if (!wordId) continue

      const { data: existing } = await supabase
        .from('spelling_results')
        .select('id, attempt_count, missed_count')
        .eq('profile_id', profileId)
        .eq('list_id', listId)
        .eq('word_id', wordId)
        .maybeSingle()

      const attemptCount = (existing?.attempt_count || 0) + 1
      const missedCount = (existing?.missed_count || 0) + (correct ? 0 : 1)

      if (existing?.id) {
        await supabase
          .from('spelling_results')
          .update({
            attempt_count: attemptCount,
            missed_count: missedCount,
            last_result: correct ? 'correct' : 'missed',
            last_attempt_at: now,
          })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('spelling_results')
          .insert({
            list_id: listId,
            profile_id: profileId,
            word_id: wordId,
            attempt_count: attemptCount,
            missed_count: missedCount,
            last_result: correct ? 'correct' : 'missed',
            last_attempt_at: now,
          })
      }

      await supabase
        .from('spelling_words')
        .update({ is_mastered: correct })
        .eq('id', wordId)
        .eq('profile_id', profileId)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Spelling Results] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

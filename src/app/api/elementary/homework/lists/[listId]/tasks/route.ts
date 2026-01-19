import { NextResponse } from 'next/server'
import { assertProfileOwnership, requireUser } from '@/app/api/elementary/_helpers'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: { listId: string } }) {
  try {
    const auth = await requireUser()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase, user } = auth
    const body = await req.json()
    const { profileId, taskId, status } = body || {}
    if (!profileId || !taskId || !status) {
      return NextResponse.json({ error: 'profileId, taskId, status are required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const { error } = await supabase
      .from('homework_tasks')
      .update({ status })
      .eq('id', taskId)
      .eq('list_id', params.listId)
      .eq('profile_id', profileId)

    if (error) {
      console.error('[Homework Tasks] Update error:', error)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Homework Tasks] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

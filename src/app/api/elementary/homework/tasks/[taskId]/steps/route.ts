import { NextResponse } from 'next/server'
import { assertProfileOwnership, requireUser } from '@/app/api/elementary/_helpers'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { taskId: string } }) {
  try {
    const auth = await requireUser()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase, user } = auth
    const body = await req.json()
    const { profileId, steps } = body || {}
    if (!profileId || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ error: 'profileId and steps are required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const stepRows = steps.map((step: string, index: number) => ({
      task_id: params.taskId,
      profile_id: profileId,
      title: step.trim(),
      status: 'pending',
      order_index: index,
    })).filter((row: any) => row.title)

    const { error } = await supabase
      .from('homework_steps')
      .insert(stepRows)

    if (error) {
      console.error('[Homework Steps] Create error:', error)
      return NextResponse.json({ error: 'Failed to add steps' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Homework Steps] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { taskId: string } }) {
  try {
    const auth = await requireUser()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase, user } = auth
    const body = await req.json()
    const { profileId, stepId, status } = body || {}
    if (!profileId || !stepId || !status) {
      return NextResponse.json({ error: 'profileId, stepId, status are required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const { error } = await supabase
      .from('homework_steps')
      .update({ status })
      .eq('id', stepId)
      .eq('task_id', params.taskId)
      .eq('profile_id', profileId)

    if (error) {
      console.error('[Homework Steps] Update error:', error)
      return NextResponse.json({ error: 'Failed to update step' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Homework Steps] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { assertProfileOwnership, requireUser } from '@/app/api/elementary/_helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await requireUser()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase, user } = auth
    const { searchParams } = new URL(req.url)
    const profileId = searchParams.get('profileId')
    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const { data, error } = await supabase
      .from('homework_lists')
      .select('id, title, status, due_date, created_at, homework_tasks(id, title, status, order_index)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Homework Lists] Error:', error)
      return NextResponse.json({ error: 'Failed to load homework lists' }, { status: 500 })
    }

    return NextResponse.json({ lists: data || [] })
  } catch (error) {
    console.error('[Homework Lists] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { supabase, user } = auth
    const body = await req.json()
    const { profileId, title, tasks, dueDate } = body || {}
    if (!profileId || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: 'profileId and tasks are required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const { data: list, error: listError } = await supabase
      .from('homework_lists')
      .insert({ profile_id: profileId, title: title || 'Tonight’s Homework', due_date: dueDate || null })
      .select('*')
      .single()

    if (listError || !list) {
      console.error('[Homework Lists] Create list error:', listError)
      return NextResponse.json({ error: 'Failed to create homework list' }, { status: 500 })
    }

    const taskRows = tasks.map((task: string, index: number) => ({
      list_id: list.id,
      profile_id: profileId,
      title: task.trim(),
      status: index === 0 ? 'active' : 'pending',
      order_index: index,
    })).filter((row: any) => row.title)

    const { error: tasksError } = await supabase
      .from('homework_tasks')
      .insert(taskRows)

    if (tasksError) {
      console.error('[Homework Lists] Create tasks error:', tasksError)
      return NextResponse.json({ error: 'Failed to add tasks' }, { status: 500 })
    }

    return NextResponse.json({ listId: list.id })
  } catch (error) {
    console.error('[Homework Lists] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

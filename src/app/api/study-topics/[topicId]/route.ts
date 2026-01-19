import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function assertTopicOwnership(supabase: ReturnType<typeof createClient>, topicId: string, userId: string) {
  const { data: topic, error } = await supabase
    .from('study_topics')
    .select('id, profile_id')
    .eq('id', topicId)
    .single()

  if (error || !topic) {
    return { error: 'Study topic not found', status: 404 }
  }

  const { data: profile } = await supabase
    .from('student_profiles')
    .select('id, owner_id, grade_band')
    .eq('id', topic.profile_id)
    .eq('owner_id', userId)
    .single()

  if (!profile) {
    return { error: 'Study topic not found', status: 404 }
  }

  return { topic, profile }
}

export async function PATCH(req: Request, { params }: { params: { topicId: string } }) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ownership = await assertTopicOwnership(supabase, params.topicId, user.id)
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status })
    }

    const body = await req.json()
    const { title } = body || {}
    if (title !== undefined && !title.trim()) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
    }

    const updates: Record<string, string> = {}
    if (title !== undefined) {
      updates.title = title.trim()
    }

    const { data: topic, error } = await supabase
      .from('study_topics')
      .update(updates)
      .eq('id', params.topicId)
      .select()
      .single()

    if (error || !topic) {
      console.error('[Study Topics API] Failed to update topic:', error)
      return NextResponse.json({ error: 'Failed to update topic' }, { status: 500 })
    }

    return NextResponse.json({
      topic: {
        id: topic.id,
        profileId: topic.profile_id,
        title: topic.title,
        gradeBand: topic.grade_band,
        createdAt: topic.created_at,
        updatedAt: topic.updated_at,
      },
    })
  } catch (error) {
    console.error('[Study Topics API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { topicId: string } }) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ownership = await assertTopicOwnership(supabase, params.topicId, user.id)
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status })
    }

    const { error } = await supabase
      .from('study_topics')
      .delete()
      .eq('id', params.topicId)

    if (error) {
      console.error('[Study Topics API] Failed to delete topic:', error)
      return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Study Topics API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

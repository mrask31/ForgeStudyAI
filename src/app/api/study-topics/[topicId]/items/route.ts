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
    .select('id, owner_id')
    .eq('id', topic.profile_id)
    .eq('owner_id', userId)
    .single()

  if (!profile) {
    return { error: 'Study topic not found', status: 404 }
  }

  return { topic }
}

export async function GET(req: Request, { params }: { params: { topicId: string } }) {
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

    const { data: items, error } = await supabase
      .from('study_topic_items')
      .select('id, topic_id, profile_id, item_type, item_ref, source_text, created_at, updated_at')
      .eq('topic_id', params.topicId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Study Topics API] Failed to list items:', error)
      return NextResponse.json({ error: 'Failed to load study topic items' }, { status: 500 })
    }

    const mapped = (items || []).map((item: any) => ({
      id: item.id,
      topicId: item.topic_id,
      profileId: item.profile_id,
      itemType: item.item_type,
      itemRef: item.item_ref,
      sourceText: item.source_text,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }))

    return NextResponse.json({ items: mapped })
  } catch (error) {
    console.error('[Study Topics API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { topicId: string } }) {
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
    const { itemType, itemRef, sourceText } = body || {}

    if (!itemType) {
      return NextResponse.json({ error: 'itemType is required' }, { status: 400 })
    }
    if (!sourceText || !sourceText.trim()) {
      return NextResponse.json({ error: 'sourceText is required' }, { status: 400 })
    }

    const { data: item, error } = await supabase
      .from('study_topic_items')
      .insert({
        topic_id: params.topicId,
        profile_id: ownership.topic.profile_id,
        item_type: itemType,
        item_ref: itemRef || null,
        source_text: sourceText.trim(),
      })
      .select()
      .single()

    if (error || !item) {
      console.error('[Study Topics API] Failed to create item:', error)
      return NextResponse.json({ error: 'Failed to save study topic item' }, { status: 500 })
    }

    return NextResponse.json({
      item: {
        id: item.id,
        topicId: item.topic_id,
        profileId: item.profile_id,
        itemType: item.item_type,
        itemRef: item.item_ref,
        sourceText: item.source_text,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[Study Topics API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function assertProfileOwnership(supabase: ReturnType<typeof createClient>, profileId: string, userId: string) {
  const { data: profile, error } = await supabase
    .from('student_profiles')
    .select('id, owner_id, grade_band')
    .eq('id', profileId)
    .eq('owner_id', userId)
    .single()

  if (error || !profile) {
    return { error: 'Profile not found or access denied', status: 404 }
  }

  if (profile.grade_band !== 'middle' && profile.grade_band !== 'high') {
    return { error: 'Study topics are available for grades 6–12 only', status: 403 }
  }

  return { profile }
}

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
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const { data: topics, error } = await supabase
      .from('study_topics')
      .select('id, profile_id, title, grade_band, created_at, updated_at, study_topic_items(count)')
      .eq('profile_id', profileId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[Study Topics API] Failed to list topics:', error)
      return NextResponse.json({ error: 'Failed to load topics' }, { status: 500 })
    }

    const mapped = (topics || []).map((topic: any) => {
      const itemCount = Array.isArray(topic.study_topic_items)
        ? topic.study_topic_items?.[0]?.count ?? 0
        : topic.study_topic_items?.count ?? 0
      return {
        id: topic.id,
        profileId: topic.profile_id,
        title: topic.title,
        gradeBand: topic.grade_band,
        createdAt: topic.created_at,
        updatedAt: topic.updated_at,
        itemsCount: itemCount,
      }
    })

    return NextResponse.json({ topics: mapped })
  } catch (error) {
    console.error('[Study Topics API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { profileId, title } = body || {}
    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
    }
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const profileCheck = await assertProfileOwnership(supabase, profileId, user.id)
    if ('error' in profileCheck) {
      return NextResponse.json({ error: profileCheck.error }, { status: profileCheck.status })
    }

    const { data: topic, error } = await supabase
      .from('study_topics')
      .insert({
        profile_id: profileId,
        title: title.trim(),
        grade_band: profileCheck.profile.grade_band,
      })
      .select()
      .single()

    if (error || !topic) {
      console.error('[Study Topics API] Failed to create topic:', error)
      return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 })
    }

    return NextResponse.json({
      topic: {
        id: topic.id,
        profileId: topic.profile_id,
        title: topic.title,
        gradeBand: topic.grade_band,
        createdAt: topic.created_at,
        updatedAt: topic.updated_at,
        itemsCount: 0,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[Study Topics API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

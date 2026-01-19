'use server'

import { createClient } from '@/lib/supabase/server'

export type StudyTopicRow = {
  id: string
  profile_id: string
  title: string
  grade_band: 'middle' | 'high'
  created_at: string
  updated_at: string
}

export type StudyTopicItemRow = {
  id: string
  topic_id: string
  profile_id: string
  item_type: 'chat' | 'map' | 'exam' | 'practice' | 'custom'
  item_ref: string | null
  source_text: string
  created_at: string
  updated_at: string
}

async function requireAuth() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Unauthorized')
  }
  return { supabase, user }
}

async function assertProfileOwnership(supabase: ReturnType<typeof createClient>, profileId: string, userId: string) {
  const { data: profile, error } = await supabase
    .from('student_profiles')
    .select('id, owner_id, grade_band')
    .eq('id', profileId)
    .eq('owner_id', userId)
    .single()

  if (error || !profile) {
    throw new Error('Profile not found or access denied')
  }

  if (profile.grade_band !== 'middle' && profile.grade_band !== 'high') {
    throw new Error('Study topics are available for grades 6–12 only')
  }

  return profile
}

async function assertTopicOwnership(supabase: ReturnType<typeof createClient>, topicId: string, userId: string) {
  const { data: topic, error } = await supabase
    .from('study_topics')
    .select('id, profile_id, grade_band')
    .eq('id', topicId)
    .single()

  if (error || !topic) {
    throw new Error('Study topic not found')
  }

  await assertProfileOwnership(supabase, topic.profile_id, userId)
  return topic
}

export async function listStudyTopics(profileId: string): Promise<StudyTopicRow[]> {
  const { supabase, user } = await requireAuth()
  await assertProfileOwnership(supabase, profileId, user.id)

  const { data: topics, error } = await supabase
    .from('study_topics')
    .select('*')
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[Study Topics] Failed to list topics:', error)
    throw new Error('Failed to load study topics')
  }

  return (topics || []) as StudyTopicRow[]
}

export async function createStudyTopic(profileId: string, title: string): Promise<StudyTopicRow> {
  const { supabase, user } = await requireAuth()
  const profile = await assertProfileOwnership(supabase, profileId, user.id)

  if (!title?.trim()) {
    throw new Error('Title is required')
  }

  const { data: topic, error } = await supabase
    .from('study_topics')
    .insert({
      profile_id: profileId,
      title: title.trim(),
      grade_band: profile.grade_band,
    })
    .select()
    .single()

  if (error || !topic) {
    console.error('[Study Topics] Failed to create topic:', error)
    throw new Error('Failed to create study topic')
  }

  return topic as StudyTopicRow
}

export async function updateStudyTopic(topicId: string, updates: { title?: string }): Promise<StudyTopicRow> {
  const { supabase, user } = await requireAuth()
  await assertTopicOwnership(supabase, topicId, user.id)

  const payload: Partial<StudyTopicRow> = {}
  if (updates.title !== undefined) {
    if (!updates.title.trim()) {
      throw new Error('Title cannot be empty')
    }
    payload.title = updates.title.trim()
  }

  const { data: topic, error } = await supabase
    .from('study_topics')
    .update(payload)
    .eq('id', topicId)
    .select()
    .single()

  if (error || !topic) {
    console.error('[Study Topics] Failed to update topic:', error)
    throw new Error('Failed to update study topic')
  }

  return topic as StudyTopicRow
}

export async function deleteStudyTopic(topicId: string): Promise<void> {
  const { supabase, user } = await requireAuth()
  await assertTopicOwnership(supabase, topicId, user.id)

  const { error } = await supabase
    .from('study_topics')
    .delete()
    .eq('id', topicId)

  if (error) {
    console.error('[Study Topics] Failed to delete topic:', error)
    throw new Error('Failed to delete study topic')
  }
}

export async function listStudyTopicItems(topicId: string): Promise<StudyTopicItemRow[]> {
  const { supabase, user } = await requireAuth()
  await assertTopicOwnership(supabase, topicId, user.id)

  const { data: items, error } = await supabase
    .from('study_topic_items')
    .select('*')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Study Topics] Failed to list items:', error)
    throw new Error('Failed to load study topic items')
  }

  return (items || []) as StudyTopicItemRow[]
}

export async function createStudyTopicItem(topicId: string, data: {
  itemType: StudyTopicItemRow['item_type']
  itemRef?: string | null
  sourceText: string
}): Promise<StudyTopicItemRow> {
  const { supabase, user } = await requireAuth()
  const topic = await assertTopicOwnership(supabase, topicId, user.id)

  if (!data.sourceText?.trim()) {
    throw new Error('Source text is required')
  }

  const { data: item, error } = await supabase
    .from('study_topic_items')
    .insert({
      topic_id: topicId,
      profile_id: topic.profile_id,
      item_type: data.itemType,
      item_ref: data.itemRef || null,
      source_text: data.sourceText.trim(),
    })
    .select()
    .single()

  if (error || !item) {
    console.error('[Study Topics] Failed to create item:', error)
    throw new Error('Failed to save study topic item')
  }

  return item as StudyTopicItemRow
}

export async function deleteStudyTopicItem(itemId: string): Promise<void> {
  const { supabase, user } = await requireAuth()

  const { data: item, error: itemError } = await supabase
    .from('study_topic_items')
    .select('id, topic_id')
    .eq('id', itemId)
    .single()

  if (itemError || !item) {
    throw new Error('Study topic item not found')
  }

  await assertTopicOwnership(supabase, item.topic_id, user.id)

  const { error } = await supabase
    .from('study_topic_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('[Study Topics] Failed to delete item:', error)
    throw new Error('Failed to delete study topic item')
  }
}

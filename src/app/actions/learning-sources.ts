'use server'

import { createClient } from '@/lib/supabase/server'

export type LearningSourceType = 'syllabus' | 'weekly' | 'photos' | 'other'
export type LearningItemType = 'text' | 'file' | 'photo' | 'note'

export interface LearningSource {
  id: string
  user_id: string
  profile_id: string | null
  source_type: LearningSourceType
  title: string
  description: string | null
  status: 'active' | 'archived'
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface LearningSourceItem {
  id: string
  source_id: string
  item_type: LearningItemType
  file_url: string | null
  mime_type: string | null
  original_filename: string | null
  extracted_text: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

const parseStorageUrl = (fileUrl: string) => {
  const trimmed = fileUrl.replace(/^\/+/, '')
  const [bucket, ...rest] = trimmed.split('/')
  return { bucket, path: rest.join('/') }
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'with', 'without', 'to', 'from', 'in', 'on', 'of',
  'for', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'this', 'that', 'these', 'those',
  'as', 'at', 'if', 'then', 'than', 'so', 'because', 'about', 'into', 'over', 'under', 'up',
])

const tokenize = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
}

const countMatches = (tokens: string[], text?: string | null) => {
  if (!text) return 0
  const lower = text.toLowerCase()
  let score = 0
  for (const token of tokens) {
    if (lower.includes(token)) score += 1
  }
  return score
}

const buildExcerpt = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '…'
}

export async function createLearningSource(data: {
  profileId?: string | null
  sourceType: LearningSourceType
  title: string
  description?: string | null
}): Promise<LearningSource> {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: source, error } = await supabase
    .from('learning_sources')
    .insert({
      user_id: user.id,
      profile_id: data.profileId || null,
      source_type: data.sourceType,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('[LearningSources] Error creating source:', error)
    throw new Error('Failed to create learning source')
  }

  return source
}

export async function addLearningSourceItem(data: {
  sourceId: string
  itemType: LearningItemType
  pastedText?: string | null
  fileUrl?: string | null
  fileMetadata?: { name?: string; type?: string; size?: number } | null
  metadata?: Record<string, any> | null
}): Promise<LearningSourceItem> {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: item, error } = await supabase
    .from('learning_source_items')
    .insert({
      source_id: data.sourceId,
      item_type: data.itemType,
      file_url: data.fileUrl || null,
      extracted_text: data.pastedText?.trim() || null,
      original_filename: data.fileMetadata?.name || null,
      mime_type: data.fileMetadata?.type || null,
      metadata: data.metadata || {},
    })
    .select()
    .single()

  if (error) {
    console.error('[LearningSources] Error creating item:', error)
    throw new Error('Failed to add learning source item')
  }

  return item
}

export async function listLearningSources(profileId?: string | null) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  let query = supabase
    .from('learning_sources')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (profileId) {
    query = query.eq('profile_id', profileId)
  }

  const { data: sources, error } = await query
  if (error) {
    console.error('[LearningSources] Error listing sources:', error)
    throw new Error('Failed to load learning sources')
  }

  const sourceIds = (sources || []).map((source) => source.id)
  if (sourceIds.length === 0) {
    return []
  }

  const { data: items, error: itemsError } = await supabase
    .from('learning_source_items')
    .select('id, source_id, created_at')
    .in('source_id', sourceIds)

  if (itemsError) {
    console.error('[LearningSources] Error listing items:', itemsError)
    throw new Error('Failed to load learning source items')
  }

  const itemLookup = new Map<string, { count: number; lastUpdated: string | null }>()
  for (const item of items || []) {
    const entry = itemLookup.get(item.source_id) || { count: 0, lastUpdated: null }
    entry.count += 1
    if (!entry.lastUpdated || item.created_at > entry.lastUpdated) {
      entry.lastUpdated = item.created_at
    }
    itemLookup.set(item.source_id, entry)
  }

  return (sources || []).map((source) => ({
    ...source,
    itemCount: itemLookup.get(source.id)?.count || 0,
    lastItemAt: itemLookup.get(source.id)?.lastUpdated || null,
  }))
}

export async function listLearningSourceItems(profileId?: string | null) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  let query = supabase
    .from('learning_source_items')
    .select('id, source_id, item_type, file_url, original_filename, mime_type, metadata, created_at, learning_sources!inner(id, profile_id, user_id, source_type, title)')
    .eq('learning_sources.user_id', user.id)
    .order('created_at', { ascending: false })

  if (profileId) {
    query = query.eq('learning_sources.profile_id', profileId)
  }

  const { data: items, error } = await query
  if (error) {
    console.error('[LearningSources] Error listing items:', error)
    throw new Error('Failed to load learning source items')
  }

  return items || []
}

export async function getSignedSourceUrl(fileUrl: string, expiresInSeconds: number = 300) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  if (!fileUrl) {
    throw new Error('Missing file URL')
  }

  const { bucket, path } = parseStorageUrl(fileUrl)
  if (!bucket || !path) {
    throw new Error('Invalid file URL')
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
  if (error) {
    console.error('[LearningSources] Error signing URL:', error)
    throw new Error('Failed to generate download link')
  }

  return data?.signedUrl || null
}

export async function deleteLearningSourceItems(itemIds: string[]) {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return { deleted: 0, missing: 0, failedStorage: 0 }
  }

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: items, error } = await supabase
    .from('learning_source_items')
    .select('id, file_url, learning_sources!inner(user_id)')
    .in('id', itemIds)
    .eq('learning_sources.user_id', user.id)

  if (error) {
    console.error('[LearningSources] Error loading items for delete:', error)
    throw new Error('Failed to delete items')
  }

  const validItems = items || []
  if (validItems.length === 0) {
    return { deleted: 0, missing: itemIds.length, failedStorage: 0 }
  }

  const filesByBucket = new Map<string, string[]>()
  for (const item of validItems) {
    if (!item.file_url) continue
    try {
      const { bucket, path } = parseStorageUrl(item.file_url)
      if (!bucket || !path) continue
      const list = filesByBucket.get(bucket) || []
      list.push(path)
      filesByBucket.set(bucket, list)
    } catch (err) {
      console.warn('[LearningSources] Skipping invalid file URL:', item.file_url)
    }
  }

  let failedStorage = 0
  for (const [bucket, paths] of filesByBucket.entries()) {
    if (paths.length === 0) continue
    const { error: storageError } = await supabase.storage.from(bucket).remove(paths)
    if (storageError) {
      console.error('[LearningSources] Error removing storage files:', storageError)
      failedStorage += paths.length
    }
  }

  const { error: deleteError } = await supabase
    .from('learning_source_items')
    .delete()
    .in('id', validItems.map((item) => item.id))

  if (deleteError) {
    console.error('[LearningSources] Error deleting items:', deleteError)
    throw new Error('Failed to delete items')
  }

  return {
    deleted: validItems.length,
    missing: Math.max(0, itemIds.length - validItems.length),
    failedStorage,
  }
}

export async function retrieveLearningContext(params: {
  question: string
  profileId?: string | null
  mode?: 'strict' | 'balanced' | 'practice'
  maxItems?: number
  maxChars?: number
}) {
  const { question, profileId, mode = 'balanced', maxItems = 6, maxChars = 2000 } = params
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const tokens = tokenize(question)

  let query = supabase
    .from('learning_source_items')
    .select('id, source_id, item_type, extracted_text, created_at, metadata, original_filename, learning_sources!inner(id, title, source_type, description, profile_id)')
    .eq('learning_sources.user_id', user.id)
    .order('created_at', { ascending: false })

  if (profileId) {
    query = query.eq('learning_sources.profile_id', profileId)
  }

  const { data: items, error } = await query
  if (error) {
    console.error('[LearningSources] Error retrieving context:', error)
    return { hasContext: false, context: '', sourcesUsed: [] }
  }

  const scored = (items || []).map((item: any) => {
    const source = item.learning_sources
    const tags = Array.isArray(item.metadata?.tags) ? item.metadata.tags.join(' ') : ''
    const titleScore = countMatches(tokens, source?.title)
    const descriptionScore = countMatches(tokens, source?.description)
    const tagScore = countMatches(tokens, tags)
    const textScore = countMatches(tokens, item.extracted_text)
    let score = titleScore * 3 + descriptionScore * 2 + tagScore * 2 + textScore

    const createdAt = new Date(item.created_at)
    const daysOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysOld <= 7) score += 1
    else if (daysOld <= 30) score += 0.5

    return { item, source, score }
  })

  let filtered = scored
    .filter((entry) => entry.score > 0 || mode !== 'strict')
    .sort((a, b) => b.score - a.score)

  if (filtered.length === 0 && mode === 'balanced') {
    filtered = scored.sort((a, b) => {
      return new Date(b.item.created_at).getTime() - new Date(a.item.created_at).getTime()
    })
  }

  const selected = filtered.slice(0, maxItems)

  let context = ''
  const sourcesUsed: Array<{ title: string; sourceType: string; itemType: string }> = []

  for (const entry of selected) {
    if (!entry.item.extracted_text) continue
    const header = `Source: ${entry.source?.title || 'Untitled'} (${entry.source?.source_type || 'other'})`
    const meta = entry.item.original_filename
      ? `File: ${entry.item.original_filename}`
      : entry.item.metadata?.label
        ? `Note: ${entry.item.metadata.label}`
        : null
    const excerpt = buildExcerpt(entry.item.extracted_text, 420)
    const block = `${header}${meta ? `\n${meta}` : ''}\n${excerpt}\n\n`

    if ((context + block).length > maxChars) {
      break
    }

    context += block
    sourcesUsed.push({
      title: entry.source?.title || 'Untitled',
      sourceType: entry.source?.source_type || 'other',
      itemType: entry.item.item_type,
    })
  }

  return {
    hasContext: context.trim().length > 0,
    context: context.trim(),
    sourcesUsed,
  }
}

import { NotebookTopic } from '@/lib/types'

export async function listNotebookTopics(
  userId: string,
  classId?: string
): Promise<NotebookTopic[]> {
  try {
    const url = classId
      ? `/api/notebook/topics?userId=${userId}&classId=${classId}`
      : `/api/notebook/topics?userId=${userId}`
    const response = await fetch(url, {
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch notebook topics')
    }
    const data = await response.json()
    return data.topics || []
  } catch (error) {
    console.error('[Notebook API] Error listing topics:', error)
    return []
  }
}

export async function createNotebookTopic(
  userId: string,
  payload: {
    classId?: string
    title: string
    description?: string
    nclexCategory?: string
    fileIds?: string[]
  }
): Promise<NotebookTopic | null> {
  try {
    const response = await fetch('/api/notebook/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, ...payload }),
    })
    if (!response.ok) {
      throw new Error('Failed to create notebook topic')
    }
    const data = await response.json()
    return data.topic || null
  } catch (error) {
    console.error('[Notebook API] Error creating topic:', error)
    return null
  }
}

export async function updateNotebookTopic(
  userId: string,
  id: string,
  payload: Partial<{
    title: string
    description: string
    nclexCategory: string
    fileIds: string[]
    lastStudiedAt: string
    confidence: number
  }>
): Promise<NotebookTopic | null> {
  try {
    const response = await fetch(`/api/notebook/topics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, ...payload }),
    })
    if (!response.ok) {
      throw new Error('Failed to update notebook topic')
    }
    const data = await response.json()
    return data.topic || null
  } catch (error) {
    console.error('[Notebook API] Error updating topic:', error)
    return null
  }
}

export async function deleteNotebookTopic(userId: string, id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/notebook/topics/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    return response.ok
  } catch (error) {
    console.error('[Notebook API] Error deleting topic:', error)
    return false
  }
}

export async function linkFilesToTopic(
  userId: string,
  topicId: string,
  fileIds: string[]
): Promise<NotebookTopic | null> {
  try {
    // First, get the current topic to merge with existing fileIds
    // Use list endpoint and find the topic
    const topics = await listNotebookTopics(userId)
    const currentTopic = topics.find((t) => t.id === topicId)
    const currentFileIds = currentTopic?.fileIds || []
    
    // Merge and de-duplicate
    const mergedFileIds = Array.from(new Set([...currentFileIds, ...fileIds]))
    
    // Update topic with merged fileIds
    return await updateNotebookTopic(userId, topicId, { fileIds: mergedFileIds })
  } catch (error) {
    console.error('[Notebook API] Error linking files to topic:', error)
    return null
  }
}

export async function setTopicSummaryAndStudiedAt(
  userId: string,
  topicId: string,
  summary: string
): Promise<NotebookTopic | null> {
  try {
    return await updateNotebookTopic(userId, topicId, {
      description: summary,
      lastStudiedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Notebook API] Error setting topic summary:', error)
    return null
  }
}


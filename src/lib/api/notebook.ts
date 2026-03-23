import { NotebookTopic } from '@/lib/types'

export async function listNotebookTopics(
  userId: string,
  classId?: string
): Promise<NotebookTopic[]> {
  try {
    const url = classId
      ? `/api/chats/resolve?savedToNotebook=true&classId=${classId}`
      : `/api/chats/resolve?savedToNotebook=true`
    const response = await fetch(url, {
      credentials: 'include',
    })
    if (!response.ok) return []
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
    category?: string
    fileIds?: string[]
  }
): Promise<NotebookTopic | null> {
  // Topics are now saved chats — use "Save to Notebook" in the Tutor
  return null
}

export async function updateNotebookTopic(
  userId: string,
  id: string,
  payload: Partial<{
    title: string
    description: string
    category: string
    fileIds: string[]
    lastStudiedAt: string
    confidence: number
  }>
): Promise<NotebookTopic | null> {
  return null
}

export async function deleteNotebookTopic(userId: string, id: string): Promise<boolean> {
  return true
}

export async function linkFilesToTopic(
  userId: string,
  topicId: string,
  fileIds: string[]
): Promise<NotebookTopic | null> {
  return null
}

export async function setTopicSummaryAndStudiedAt(
  userId: string,
  chatId: string,
  summary: string
): Promise<NotebookTopic | null> {
  try {
    const response = await fetch('/api/chats/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ intent: 'save_to_notebook', chatId, summary }),
    })
    if (!response.ok) return null
    return { id: chatId } as NotebookTopic
  } catch (error) {
    console.error('[Notebook API] Error saving to notebook:', error)
    return null
  }
}

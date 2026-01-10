import { StudentClass, ClassType } from '@/lib/types'

export async function listClasses(userId: string): Promise<StudentClass[]> {
  try {
    const response = await fetch(`/api/classes?userId=${userId}`, {
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch classes')
    }
    const data = await response.json()
    return data.classes || []
  } catch (error) {
    console.error('[Classes API] Error listing classes:', error)
    return []
  }
}

export async function createClass(
  userId: string,
  payload: {
    code: string
    name: string
    type: ClassType
    startDate?: string
    endDate?: string
    nextExamDate?: string
    notes?: string
  }
): Promise<StudentClass | null> {
  try {
    const response = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, ...payload }),
    })
    if (!response.ok) {
      throw new Error('Failed to create class')
    }
    const data = await response.json()
    return data.class || null
  } catch (error) {
    console.error('[Classes API] Error creating class:', error)
    return null
  }
}

export async function updateClass(
  userId: string,
  id: string,
  payload: Partial<{
    code: string
    name: string
    type: ClassType
    startDate: string
    endDate: string
    nextExamDate: string
    notes: string
  }>
): Promise<StudentClass | null> {
  try {
    const response = await fetch(`/api/classes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, ...payload }),
    })
    if (!response.ok) {
      throw new Error('Failed to update class')
    }
    const data = await response.json()
    return data.class || null
  } catch (error) {
    console.error('[Classes API] Error updating class:', error)
    return null
  }
}

export async function deleteClass(userId: string, id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/classes/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    return response.ok
  } catch (error) {
    console.error('[Classes API] Error deleting class:', error)
    return false
  }
}


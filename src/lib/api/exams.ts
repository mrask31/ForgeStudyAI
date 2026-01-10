import { ExamPlan } from '@/lib/types'

/**
 * List all exams for a user and class
 */
export async function listExams(userId: string, classId: string): Promise<ExamPlan[]> {
  try {
    const response = await fetch(`/api/exams?userId=${userId}&classId=${classId}`, {
      credentials: 'include',
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch exams')
    }
    
    const data = await response.json()
    return data.exams || []
  } catch (error) {
    console.error('[API] Error listing exams:', error)
    return []
  }
}

/**
 * Create a new exam plan
 */
export async function createExam(
  userId: string,
  payload: Omit<ExamPlan, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ExamPlan> {
  try {
    // Extract userId from payload to avoid duplication, use the parameter instead
    const { userId: _, ...payloadWithoutUserId } = payload
    const response = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, ...payloadWithoutUserId }),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create exam' }))
      throw new Error(error.error || 'Failed to create exam')
    }
    
    const data = await response.json()
    return data.exam
  } catch (error) {
    console.error('[API] Error creating exam:', error)
    throw error
  }
}

/**
 * Update an existing exam plan
 */
export async function updateExam(
  userId: string,
  id: string,
  payload: Partial<ExamPlan>
): Promise<ExamPlan> {
  try {
    // Extract userId from payload to avoid duplication, use the parameter instead
    const { userId: _, ...payloadWithoutUserId } = payload
    const response = await fetch(`/api/exams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, ...payloadWithoutUserId }),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update exam' }))
      throw new Error(error.error || 'Failed to update exam')
    }
    
    const data = await response.json()
    return data.exam
  } catch (error) {
    console.error('[API] Error updating exam:', error)
    throw error
  }
}


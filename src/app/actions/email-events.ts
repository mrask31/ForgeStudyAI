'use server'

import { createClient } from '@/lib/supabase/server'

export interface EmailEvent {
  id: string
  user_id: string
  student_profile_id: string | null
  template_slug: string
  status: 'queued' | 'sent' | 'skipped' | 'failed'
  scheduled_for: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

/**
 * Enqueue an email event
 * Fails gracefully - logs errors but does not throw
 * 
 * @param userId - The user ID (auth.uid())
 * @param templateSlug - Template slug (e.g., 'welcome-1')
 * @param studentProfileId - Optional student profile ID
 * @param metadata - Optional metadata object (e.g., { "reason": "first_profile_created", "parentName": "..." })
 * @returns true if successful, false otherwise
 */
export async function enqueueEmailEvent(
  userId: string,
  templateSlug: string,
  studentProfileId?: string | null,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    const supabase = createClient()

    // Verify the user making the request matches the userId
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.id !== userId) {
      console.error('[Email Events] Unauthorized or user mismatch')
      return false
    }

    const { error } = await supabase
      .from('email_events')
      .insert({
        user_id: userId,
        student_profile_id: studentProfileId || null,
        template_slug: templateSlug,
        status: 'queued',
        metadata: metadata || {},
      })

    if (error) {
      console.error('[Email Events] Error enqueueing email event:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[Email Events] Unexpected error enqueueing email event:', err)
    return false
  }
}

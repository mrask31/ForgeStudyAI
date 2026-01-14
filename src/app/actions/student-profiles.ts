'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { FAMILY_MAX_PROFILES } from '@/lib/constants'
import { enqueueEmailEvent } from './email-events'

export interface StudentProfile {
  id: string
  owner_id: string
  display_name: string
  grade_band: 'elementary' | 'middle' | 'high'
  grade: string | null
  created_at: string
  updated_at: string
}

/**
 * Get all student profiles for the logged-in user
 */
export async function getStudentProfiles(): Promise<StudentProfile[]> {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Get the user's profile id (which matches auth.uid())
  const { data: profiles, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Student Profiles] Error fetching profiles:', error)
    throw new Error('Failed to fetch student profiles')
  }

  return profiles || []
}

/**
 * Get a single student profile by ID (must belong to logged-in user)
 */
export async function getStudentProfile(profileId: string): Promise<StudentProfile | null> {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('id', profileId)
    .eq('owner_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null
    }
    console.error('[Student Profiles] Error fetching profile:', error)
    throw new Error('Failed to fetch student profile')
  }

  return profile
}

/**
 * Create a new student profile
 * Enforces max 4 profiles per account
 */
export async function createStudentProfile(data: {
  display_name: string
  grade_band: 'elementary' | 'middle' | 'high'
  grade?: string | null
}): Promise<StudentProfile> {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Check current profile count
  const existingProfiles = await getStudentProfiles()
  if (existingProfiles.length >= FAMILY_MAX_PROFILES) {
    throw new Error(`Maximum of ${FAMILY_MAX_PROFILES} profiles allowed per account`)
  }

  // Validate display_name
  if (!data.display_name || data.display_name.trim().length === 0) {
    throw new Error('Display name is required')
  }

  // Validate grade_band
  if (!['elementary', 'middle', 'high'].includes(data.grade_band)) {
    throw new Error('Invalid grade band')
  }

  // Validate grade if provided (K or 1-12)
  if (data.grade !== null && data.grade !== undefined && data.grade.trim() !== '') {
    const gradeRegex = /^(K|([1-9]|1[0-2]))$/
    if (!gradeRegex.test(data.grade.trim())) {
      throw new Error('Grade must be K or a number between 1-12')
    }
  }

  const { data: profile, error } = await supabase
    .from('student_profiles')
    .insert({
      owner_id: user.id,
      display_name: data.display_name.trim(),
      grade_band: data.grade_band,
      grade: data.grade?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[Student Profiles] Error creating profile:', error)
    throw new Error('Failed to create student profile')
  }

  // Check if this is the first student profile for this user
  // existingProfiles was checked earlier, so we know the count before insertion
  // After insertion, the count will be existingProfiles.length + 1
  const isFirstProfile = existingProfiles.length === 0

  // Enqueue welcome-1 email event if this is the first profile
  // Wrapped in try-catch to ensure profile creation never fails due to email event issues
  if (isFirstProfile) {
    try {
      // Try to get parent name from profiles table (preferred_name or email)
      let parentName: string | null = null
      try {
        const { data: parentProfile } = await supabase
          .from('profiles')
          .select('preferred_name')
          .eq('id', user.id)
          .single()
        
        parentName = parentProfile?.preferred_name || null
        
        // If no preferred_name, try to get from auth.users email
        if (!parentName && user.email) {
          // Extract first name from email if available
          const emailName = user.email.split('@')[0]
          parentName = emailName || null
        }
      } catch (err) {
        // Fail gracefully - parent name is optional
        console.warn('[Student Profiles] Could not fetch parent name for email event:', err)
      }

      // Enqueue email event (fails gracefully - doesn't affect profile creation)
      await enqueueEmailEvent(
        user.id,
        'welcome-1',
        profile.id,
        {
          reason: 'first_profile_created',
          parentName: parentName,
        }
      )
    } catch (err) {
      // Log but don't throw - email event failure should not prevent profile creation
      console.error('[Student Profiles] Error enqueueing email event (non-fatal):', err)
    }
  }

  revalidatePath('/profiles', 'page')
  revalidatePath('/profiles/new', 'page')
  
  return profile
}

/**
 * Update an existing student profile
 */
export async function updateStudentProfile(
  profileId: string,
  data: {
    display_name?: string
    grade_band?: 'elementary' | 'middle' | 'high'
    grade?: string | null
  }
): Promise<StudentProfile> {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Verify profile belongs to user
  const existingProfile = await getStudentProfile(profileId)
  if (!existingProfile) {
    throw new Error('Profile not found or access denied')
  }

  const updateData: any = {}

  if (data.display_name !== undefined) {
    if (!data.display_name || data.display_name.trim().length === 0) {
      throw new Error('Display name cannot be empty')
    }
    updateData.display_name = data.display_name.trim()
  }

  if (data.grade_band !== undefined) {
    if (!['elementary', 'middle', 'high'].includes(data.grade_band)) {
      throw new Error('Invalid grade band')
    }
    updateData.grade_band = data.grade_band
  }

  if (data.grade !== undefined) {
    if (data.grade !== null && data.grade.trim() !== '') {
      const gradeRegex = /^(K|([1-9]|1[0-2]))$/
      if (!gradeRegex.test(data.grade.trim())) {
        throw new Error('Grade must be K or a number between 1-12')
      }
      updateData.grade = data.grade.trim()
    } else {
      updateData.grade = null
    }
  }

  const { data: profile, error } = await supabase
    .from('student_profiles')
    .update(updateData)
    .eq('id', profileId)
    .eq('owner_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[Student Profiles] Error updating profile:', error)
    throw new Error('Failed to update student profile')
  }

  revalidatePath('/profiles', 'page')
  revalidatePath(`/p/${profileId}`, 'page')
  
  return profile
}

/**
 * Delete a student profile
 */
export async function deleteStudentProfile(profileId: string): Promise<void> {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Verify profile belongs to user
  const existingProfile = await getStudentProfile(profileId)
  if (!existingProfile) {
    throw new Error('Profile not found or access denied')
  }

  const { error } = await supabase
    .from('student_profiles')
    .delete()
    .eq('id', profileId)
    .eq('owner_id', user.id)

  if (error) {
    console.error('[Student Profiles] Error deleting profile:', error)
    throw new Error('Failed to delete student profile')
  }

  revalidatePath('/profiles', 'page')
}

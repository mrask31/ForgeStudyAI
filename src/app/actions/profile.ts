'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateGradeLevel(gradeLevel: string) {
  const supabase = createClient()

  // 1. Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // 2. Update the 'grade_level' column in your existing 'profiles' table
  const { error } = await supabase
    .from('profiles')
    .update({ 
      grade_level: gradeLevel,
      // We update 'updated_at' so we know when they last changed it
      // Note: Your screenshot shows 'created_at' but likely has no 'updated_at'. 
      // If the code fails on 'updated_at', delete this line.
    })
    .eq('id', user.id)

  if (error) {
    console.error('Profile update failed:', error)
    throw new Error('Failed to update profile')
  }

  // 3. Refresh the UI
  revalidatePath('/', 'layout')
  return { success: true }
}
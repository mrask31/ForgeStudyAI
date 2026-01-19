import { createClient } from '@/lib/supabase/server'

export async function requireUser() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { error: 'Unauthorized', status: 401 as const }
  }
  return { supabase, user }
}

export async function assertProfileOwnership(
  supabase: ReturnType<typeof createClient>,
  profileId: string,
  userId: string
) {
  const { data: profile, error } = await supabase
    .from('student_profiles')
    .select('id, owner_id, grade_band')
    .eq('id', profileId)
    .eq('owner_id', userId)
    .single()

  if (error || !profile) {
    return { error: 'Profile not found or access denied', status: 404 as const }
  }

  if (profile.grade_band !== 'elementary') {
    return { error: 'This experience is for grades 3–5 only', status: 403 as const }
  }

  return { profile }
}

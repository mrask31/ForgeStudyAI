import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentProfiles } from '@/app/actions/student-profiles'

export default async function PostLoginPage() {
  const supabase = createClient()

  // Verify session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    // Not logged in, redirect to login
    redirect('/login')
  }

  // Always route to /profiles after login
  redirect('/profiles')
}

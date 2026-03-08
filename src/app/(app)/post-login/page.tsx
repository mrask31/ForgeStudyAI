import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentProfiles } from '@/app/actions/student-profiles'

export default async function PostLoginPage() {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.warn('[PostLogin] Failed to load profile status:', profileError)
  }

  const subscriptionStatus = profile?.subscription_status
  const trialEndsAt = profile?.trial_ends_at
  const isTrialActive = trialEndsAt && new Date(trialEndsAt) > new Date()
  
  const isActive =
    subscriptionStatus === 'active' ||
    subscriptionStatus === 'trialing' ||
    subscriptionStatus === 'past_due' ||
    subscriptionStatus === 'incomplete' ||
    isTrialActive

  if (!isActive) {
    redirect('/checkout')
  }

  const profiles = await getStudentProfiles()

  if (profiles.length === 0) {
    redirect('/profiles/new')
  }

  if (profiles.length === 1) {
    redirect('/profiles?auto=1')
  }

  redirect('/profiles?auto=1')
}

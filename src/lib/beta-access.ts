/**
 * Beta Access System
 *
 * First 20 signups → 90-day free beta, no Stripe required
 * Signups 21+ → 7-day free trial, no credit card required
 * After trial/beta expires → must subscribe via Stripe
 */

import { createClient } from '@supabase/supabase-js'

const BETA_SLOTS = 20
const BETA_DAYS = 90
const TRIAL_DAYS = 7

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Assign beta or trial access to a newly created user.
 * Called during signup / auth callback.
 */
export async function assignBetaAccess(userId: string): Promise<'beta' | 'trial'> {
  const supabase = getAdminClient()

  // Check if already assigned
  const { data: existing } = await supabase
    .from('beta_access')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) {
    // Already assigned — determine type
    const { data: access } = await supabase
      .from('beta_access')
      .select('is_beta')
      .eq('user_id', userId)
      .single()
    return access?.is_beta ? 'beta' : 'trial'
  }

  // Count existing beta users
  const { count } = await supabase
    .from('beta_access')
    .select('*', { count: 'exact', head: true })
    .eq('is_beta', true)

  const betaCount = count ?? 0

  if (betaCount < BETA_SLOTS) {
    // Beta user — 90 days free
    await supabase.from('beta_access').insert({
      user_id: userId,
      is_beta: true,
      beta_expires_at: new Date(Date.now() + BETA_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    })

    // Also set trial_ends_at on profiles so existing middleware doesn't block
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'trialing',
        trial_ends_at: new Date(Date.now() + BETA_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', userId)

    console.log(`[Beta Access] User ${userId} assigned BETA slot ${betaCount + 1}/${BETA_SLOTS}`)
    return 'beta'
  } else {
    // Trial user — 7 days free
    await supabase.from('beta_access').insert({
      user_id: userId,
      is_beta: false,
      trial_expires_at: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    })

    // Set trial on profiles
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'trialing',
        trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', userId)

    console.log(`[Beta Access] User ${userId} assigned 7-day TRIAL (beta slots full: ${betaCount}/${BETA_SLOTS})`)
    return 'trial'
  }
}

/**
 * Check if a user has active access (beta, trial, or subscription).
 */
export async function checkAccess(userId: string): Promise<{
  allowed: boolean
  reason: 'beta' | 'trial' | 'subscribed' | 'expired' | 'trial_expired'
  daysRemaining?: number
}> {
  const supabase = getAdminClient()

  // 1. Check beta_access table
  const { data: access } = await supabase
    .from('beta_access')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (access?.is_beta && access.beta_expires_at) {
    const expiresAt = new Date(access.beta_expires_at)
    if (expiresAt > new Date()) {
      const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      return { allowed: true, reason: 'beta', daysRemaining }
    }
  }

  if (!access?.is_beta && access?.trial_expires_at) {
    const expiresAt = new Date(access.trial_expires_at)
    if (expiresAt > new Date()) {
      const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      return { allowed: true, reason: 'trial', daysRemaining }
    }
  }

  // 2. Check Stripe subscription
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single()

  if (profile?.subscription_status === 'active') {
    return { allowed: true, reason: 'subscribed' }
  }

  // 3. Blocked
  if (access?.is_beta) return { allowed: false, reason: 'expired' }
  return { allowed: false, reason: 'trial_expired' }
}

/**
 * Get the number of remaining beta slots.
 */
export async function getBetaSpotsRemaining(): Promise<number> {
  const supabase = getAdminClient()
  const { count } = await supabase
    .from('beta_access')
    .select('*', { count: 'exact', head: true })
    .eq('is_beta', true)
  return Math.max(0, BETA_SLOTS - (count ?? 0))
}

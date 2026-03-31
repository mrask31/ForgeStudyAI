import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { hasSubscriptionAccess } from '@/lib/subscription-access'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const plan = searchParams.get('plan')
  const next = searchParams.get('next')
  
  // Confirm redirectTo / callbackUrl matches production domain
  // Use NEXT_PUBLIC_APP_URL if available, otherwise use request origin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? (process.env.NEXT_PUBLIC_APP_URL.startsWith('http') 
        ? process.env.NEXT_PUBLIC_APP_URL 
        : `https://${process.env.NEXT_PUBLIC_APP_URL}`)
    : origin

  if (!code) {
    // If something breaks, send them to the login page
    return NextResponse.redirect(`${appUrl}/login?error=auth-code-error`)
  }

  // Exchange code for session — set cookies for SSR auth
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can fail in server components — safe to ignore
          }
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)

  if (authError || !user) {
    console.error('[Auth Callback] Failed to exchange code:', authError)
    return NextResponse.redirect(`${appUrl}/login?error=auth-exchange-failed`)
  }

  // Use service role key to bypass RLS for profile upsert
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error('[Auth Callback] SUPABASE_SERVICE_ROLE_KEY is missing')
    return NextResponse.redirect(`${appUrl}/login?error=server-config-error`)
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Upsert profile with trialing status (auto-set by database trigger)
  // Use onConflict to handle existing profiles gracefully
  let profile: any = null
  const { data: profileData, error: profileError } = await adminClient
    .from('profiles')
    .upsert({
      id: user.id,
      // Note: subscription_status and trial_ends_at are set by handle_new_user() trigger
      // Onboarding fields (will be ignored if columns don't exist yet)
      onboarding_completed: false,
      onboarding_step: 0,
    }, {
      onConflict: 'id',
      ignoreDuplicates: false
    })
    .select()
    .single()

  if (profileError) {
    console.error('[Auth Callback] Failed to upsert profile:', profileError)
    // If upsert fails due to missing columns, try without onboarding fields
    if (profileError.message?.includes('column') || profileError.code === '42703') {
      console.warn('[Auth Callback] Onboarding columns may not exist, retrying without them')
      const { data: retryProfile, error: retryError } = await adminClient
        .from('profiles')
        .upsert({
          id: user.id,
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single()
      
      if (retryError) {
        console.error('[Auth Callback] Retry failed:', retryError)
      } else {
        profile = retryProfile
      }
    }
  } else {
    profile = profileData
  }

  // If profile has stripe_customer_id, optionally sync latest subscription status from Stripe
  // (This handles cases where user already has a subscription)
  if (profile?.stripe_customer_id && profile?.stripe_subscription_id) {
    try {
      // We could fetch from Stripe here, but for now we'll let the webhook handle it
      console.log('[Auth Callback] User has existing Stripe customer, webhook will sync status')
    } catch (error) {
      console.error('[Auth Callback] Error checking Stripe subscription:', error)
    }
  }

  // If explicit next param is set (e.g. from password reset), honor it
  if (next) {
    console.log('[Auth Callback] Redirecting to next param:', next)
    return NextResponse.redirect(`${appUrl}${next}`)
  }

  // Determine redirect based on subscription status and plan parameter
  const subscriptionStatus = profile?.subscription_status
  const trialEndsAt = profile?.trial_ends_at
  const isTrialActive = trialEndsAt && new Date(trialEndsAt) > new Date()

  // If plan parameter is present, redirect to checkout with plan
  if (plan) {
    const checkoutUrl = new URL('/checkout', appUrl)
    checkoutUrl.searchParams.set('plan', plan)
    return NextResponse.redirect(checkoutUrl)
  }

  // If trial is active or has subscription access, redirect to parent dashboard
  if (isTrialActive || hasSubscriptionAccess(subscriptionStatus)) {
    return NextResponse.redirect(`${appUrl}/parent`)
  }

  // If no access and no trial, redirect to checkout
  return NextResponse.redirect(`${appUrl}/checkout`)
}
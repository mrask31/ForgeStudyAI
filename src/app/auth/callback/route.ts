import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { hasSubscriptionAccess } from '@/lib/subscription-access'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const plan = searchParams.get('plan')
  
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

  // Exchange code for session
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options })
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

  // Upsert profile with pending_payment status and onboarding fields
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .upsert({
      id: user.id,
      subscription_status: 'pending_payment',
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

  // Determine redirect based on subscription status and plan parameter
  const subscriptionStatus = profile?.subscription_status

  // If plan parameter is present, redirect to checkout with plan
  if (plan) {
    const checkoutUrl = new URL('/checkout', appUrl)
    checkoutUrl.searchParams.set('plan', plan)
    return NextResponse.redirect(checkoutUrl)
  }

  // If no access, redirect to checkout
  if (!hasSubscriptionAccess(subscriptionStatus)) {
    return NextResponse.redirect(`${appUrl}/checkout`)
  }

  // If has access, redirect to primary app route (profiles page for ForgeStudy)
  return NextResponse.redirect(`${appUrl}/profiles`)
}
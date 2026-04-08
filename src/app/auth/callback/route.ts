import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { hasSubscriptionAccess } from '@/lib/subscription-access'
import { assignBetaAccess } from '@/lib/beta-access'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'magiclink' | 'recovery' | 'signup' | null
  const plan = searchParams.get('plan')
  const next = searchParams.get('next')

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://www.forgestudyai.com'

  // Build Supabase client with cookie handling
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
            // Can fail in server components — safe to ignore
          }
        },
      },
    }
  )

  // Exchange token for session — supports both OTP and PKCE flows
  let user: any = null
  let authError: any = null

  if (tokenHash && type) {
    if (type === 'recovery') {
      // Recovery tokens must be verified client-side so the browser receives
      // and stores the session cookies directly. Server-side verifyOtp sets
      // cookies on the response, but they get lost through the redirect.
      console.log('[Auth Callback] Recovery flow — passing token to client')
      return NextResponse.redirect(
        new URL(`/reset-password?token_hash=${tokenHash}&type=recovery`, appUrl)
      )
    }

    // OTP flow: magic links use token_hash verified server-side
    console.log('[Auth Callback] OTP flow — type:', type)
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    user = result.data?.user ?? null
    authError = result.error
  } else if (code) {
    // PKCE flow: OAuth providers use authorization code
    console.log('[Auth Callback] PKCE flow — exchanging code')
    const result = await supabase.auth.exchangeCodeForSession(code)
    user = result.data?.user ?? null
    authError = result.error
  } else {
    console.error('[Auth Callback] No code or token_hash provided')
    return NextResponse.redirect(`${appUrl}/login?error=auth-code-error`)
  }

  if (authError || !user) {
    console.error('[Auth Callback] Auth failed:', authError?.message)
    return NextResponse.redirect(`${appUrl}/login?error=auth-exchange-failed`)
  }

  console.log('[Auth Callback] Auth succeeded for user:', user.id)

  // Upsert profile (service role to bypass RLS)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  let profile: any = null

  if (serviceRoleKey) {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: profileData, error: profileError } = await adminClient
      .from('profiles')
      .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: false })
      .select()
      .single()

    if (profileError) {
      console.error('[Auth Callback] Profile upsert error:', profileError.message)
    } else {
      profile = profileData
    }
  }

  // Assign beta/trial access for new users
  if (serviceRoleKey) {
    try {
      await assignBetaAccess(user.id)
    } catch (err) {
      console.error('[Auth Callback] Beta access assignment failed:', err)
    }
  }

  // If explicit next param, honor it
  if (next) {
    console.log('[Auth Callback] Redirecting to next:', next)
    return NextResponse.redirect(`${appUrl}${next}`)
  }

  // Redirect based on subscription status
  const subscriptionStatus = profile?.subscription_status
  const trialEndsAt = profile?.trial_ends_at
  const isTrialActive = trialEndsAt && new Date(trialEndsAt) > new Date()

  if (plan) {
    const checkoutUrl = new URL('/checkout', appUrl)
    checkoutUrl.searchParams.set('plan', plan)
    return NextResponse.redirect(checkoutUrl)
  }

  if (isTrialActive || hasSubscriptionAccess(subscriptionStatus)) {
    return NextResponse.redirect(`${appUrl}/parent`)
  }

  return NextResponse.redirect(`${appUrl}/checkout`)
}

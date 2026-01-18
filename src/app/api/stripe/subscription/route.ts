import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Lazy initialization function for Stripe client
function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
  })
}

export const dynamic = 'force-dynamic'

const resolvePlanType = (priceId: string | null) => {
  if (!priceId) return 'none'
  const familyPrices = [
    process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_MONTHLY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_ANNUAL,
  ].filter(Boolean)
  if (familyPrices.includes(priceId)) return 'family'
  return 'individual'
}

export async function GET(req: Request) {
  try {
    // Check if Stripe secret key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[Stripe Subscription] STRIPE_SECRET_KEY is missing')
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    const stripe = getStripeClient()

    // Authenticate user
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[Stripe Subscription] Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's subscription ID from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.stripe_subscription_id) {
      // No subscription found - return null
      return NextResponse.json({
        subscription: null,
        status: profile?.subscription_status || 'none',
      })
    }

    // Fetch subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      profile.stripe_subscription_id
    )

    // Calculate trial end date (not days remaining)
    let trialEndDate: string | null = null
    if (subscription.status === 'trialing' && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end * 1000)
      trialEndDate = trialEnd.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    }

    const priceId = subscription.items?.data?.[0]?.price?.id ?? null
    const planType = resolvePlanType(priceId)

    // Extract subscription properties safely
    // Note: current_period_end may not be in TypeScript types but exists on the object
    const subscriptionData = {
      id: subscription.id,
      status: subscription.status,
      trialEnd: subscription.trial_end ?? null,
      trialEndDate,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      currentPeriodEnd: (subscription as any).current_period_end ?? null,
      priceId,
      planType,
    }

    return NextResponse.json({
      subscription: subscriptionData,
      status: profile.subscription_status,
      planType,
    })

  } catch (error: unknown) {
    console.error('[Stripe Subscription] Error:', error)

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


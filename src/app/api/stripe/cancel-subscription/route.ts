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

export async function POST(req: Request) {
  try {
    // Check if Stripe secret key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[Stripe Cancel] STRIPE_SECRET_KEY is missing')
      return NextResponse.json(
        { error: 'Stripe is not configured. Please contact support.' },
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
      console.error('[Stripe Cancel] Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's subscription ID from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.stripe_subscription_id) {
      console.error('[Stripe Cancel] No subscription found:', profileError)
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    // Cancel the subscription at period end (don't cancel immediately)
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    )

    console.log('[Stripe Cancel] Subscription canceled at period end:', {
      subscriptionId: subscription.id,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    })

    // Update profile status to reflect cancellation
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceRoleKey) {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
      )

      await adminClient
        .from('profiles')
        .update({
          subscription_status: subscription.cancel_at_period_end ? 'canceled' : 'active',
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period',
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    })

  } catch (error: unknown) {
    console.error('[Stripe Cancel] Error:', error)

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


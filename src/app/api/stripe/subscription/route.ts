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
  return new Stripe(process.env.STRIPE_SECRET_KEY)
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
      .select('stripe_subscription_id, stripe_customer_id, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[Stripe Subscription] Profile lookup failed:', profileError)
      return NextResponse.json(
        { error: 'Profile lookup failed' },
        { status: 500 }
      )
    }

    let subscriptionId = profile?.stripe_subscription_id || null

    if (!subscriptionId && profile?.stripe_customer_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'all',
          limit: 5,
        })

        const activeSubscription = subscriptions.data.find((sub) =>
          ['trialing', 'active', 'past_due', 'incomplete'].includes(sub.status)
        )

        if (activeSubscription) {
          subscriptionId = activeSubscription.id
          await supabase
            .from('profiles')
            .update({
              stripe_subscription_id: subscriptionId,
              subscription_status: activeSubscription.status,
            })
            .eq('id', user.id)
        }
      } catch (error) {
        console.error('[Stripe Subscription] Failed to backfill subscription:', error)
      }
    }

    if (!subscriptionId && user.email) {
      try {
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        })
        const customer = customers.data[0]
        if (customer?.id) {
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: customer.id })
            .eq('id', user.id)

          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 5,
          })

          const activeSubscription = subscriptions.data.find((sub) =>
            ['trialing', 'active', 'past_due', 'incomplete'].includes(sub.status)
          )

          if (activeSubscription) {
            subscriptionId = activeSubscription.id
            await supabase
              .from('profiles')
              .update({
                stripe_subscription_id: subscriptionId,
                subscription_status: activeSubscription.status,
              })
              .eq('id', user.id)
          }
        }
      } catch (error) {
        console.error('[Stripe Subscription] Failed to backfill customer from email:', error)
      }
    }

    if (!subscriptionId) {
      // No subscription found - return null
      return NextResponse.json({
        subscription: null,
        status: profile?.subscription_status || 'none',
      })
    }

    // Fetch subscription details from Stripe — gracefully handle deleted/expired subscriptions
    let subscription: Stripe.Subscription | null = null
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId)
    } catch (stripeError: unknown) {
      console.warn('[Stripe Subscription] Failed to retrieve subscription from Stripe:', subscriptionId, stripeError)

      // If subscription no longer exists on Stripe, correct the local status
      if (stripeError instanceof Stripe.errors.StripeError &&
          (stripeError.statusCode === 404 || stripeError.code === 'resource_missing')) {
        // Subscription was deleted on Stripe — update local profile to reflect reality
        const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (adminKey) {
          const adminClient = createClient(adminUrl, adminKey)
          await adminClient
            .from('profiles')
            .update({ subscription_status: 'expired', stripe_subscription_id: null })
            .eq('id', user.id)
        }
      }

      // Return gracefully instead of 400
      return NextResponse.json({
        subscription: null,
        status: 'expired',
        planType: 'none',
      })
    }

    if (!subscription) {
      return NextResponse.json({
        subscription: null,
        status: profile?.subscription_status || 'none',
      })
    }

    // If Stripe says subscription is canceled/unpaid but local says active, fix it
    if (['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status) &&
        profile?.subscription_status === 'active') {
      const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (adminKey) {
        const adminClient = createClient(adminUrl, adminKey)
        await adminClient
          .from('profiles')
          .update({ subscription_status: subscription.status })
          .eq('id', user.id)
      }
    }

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
      status: subscription.status,
      planType,
    })

  } catch (error: unknown) {
    console.error('[Stripe Subscription] Error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


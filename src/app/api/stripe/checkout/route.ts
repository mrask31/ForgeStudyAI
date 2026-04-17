import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Lazy initialization function for Stripe client
// This prevents Stripe from being initialized during build time
function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    // Check if Stripe secret key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[Stripe Checkout] STRIPE_SECRET_KEY is missing from environment variables')
      return NextResponse.json(
        { error: 'Stripe is not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // Initialize Stripe client only when needed (not at module level)
    const stripe = getStripeClient()

    // 1. Authenticate user
    // Use createServerClient with explicit cookie handling (same pattern as auth callback)
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
      console.error('[Stripe Checkout] Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Ensure Stripe customer exists and store on profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[Stripe Checkout] Failed to load profile:', profileError)
      return NextResponse.json(
        { error: 'Profile lookup failed' },
        { status: 500 }
      )
    }

    let customerId = profile?.stripe_customer_id || null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { userId: user.id },
      })
      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // 3. Get price ID from request body — supports direct priceId or plan+billing combo
    const body = await req.json()
    let { priceId } = body
    const { plan, billing } = body

    // Map plan+billing to Stripe price IDs if priceId not provided directly
    if (!priceId && plan) {
      const STRIPE_PRICES: Record<string, string | undefined> = {
        individual_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_MONTHLY,
        individual_annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_ANNUAL,
        family_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_MONTHLY,
        family_annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_ANNUAL,
      }
      const key = `${plan}_${billing || 'monthly'}`
      priceId = STRIPE_PRICES[key]

      if (!priceId) {
        console.error('[Stripe Checkout] No price ID for plan:', key)
        return NextResponse.json({ error: `No price configured for ${key}` }, { status: 400 })
      }
    }

    console.log('[Stripe Checkout] Request received:', { 
      userId: user.id, 
      email: user.email,
      priceId: priceId ? `${priceId.substring(0, 10)}...` : 'missing'
    })

    if (!priceId || typeof priceId !== 'string') {
      console.error('[Stripe Checkout] Invalid price ID:', { priceId, body })
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      )
    }

    // 4. Build base URL for redirects (use request origin as fallback)
    const requestUrl = new URL(req.url)
    let appUrl: string

    if (process.env.NEXT_PUBLIC_APP_URL) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, '')
      // If NEXT_PUBLIC_APP_URL doesn't have a protocol, add it
      if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
        appUrl = baseUrl
      } else {
        // Default to https:// unless it's localhost
        const protocol = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') ? 'http://' : 'https://'
        appUrl = `${protocol}${baseUrl}`
      }
    } else {
      // Use request origin (already includes protocol)
      appUrl = requestUrl.origin
    }

    console.log('[Stripe Checkout] Using app URL:', appUrl)
    
    // 5. Create Stripe Checkout Session
    // Trial period is handled by the profiles table (14-day or 90-day Founding)
    // Users arriving here have already consumed their trial — no Stripe trial needed
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      payment_method_collection: 'always',
      allow_promotion_codes: true,
      success_url: new URL('/billing/success', appUrl).toString() +
        '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: new URL('/billing/cancel', appUrl).toString(),
      customer: customerId,
      client_reference_id: user.id, // Link the session to the user
    })

    // 6. Return session URL
    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id 
    })

  } catch (error: unknown) {
    console.error('[Stripe Checkout] Error:', error)
    
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


'use client'

type Plan =
  | 'monthly'
  | 'semester'
  | 'annual'
  | 'individual_monthly'
  | 'individual_annual'
  | 'family_monthly'
  | 'family_annual'

const PRICE_IDS = {
  individual_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_MONTHLY,
  individual_annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_ANNUAL,
  family_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_MONTHLY,
  family_annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_FAMILY_ANNUAL,
}

export async function startStripeCheckout(plan: Plan) {
  const resolvedPlan =
    plan === 'monthly'
      ? 'individual_monthly'
      : plan === 'semester'
      ? 'family_monthly'
      : plan === 'annual'
      ? 'family_annual'
      : plan

  const priceId = PRICE_IDS[resolvedPlan]

  // Log price IDs for debugging (first 10 chars only for security)
  console.log('[Stripe Checkout] Plan mapping:', {
    plan,
    resolvedPlan,
    priceId: priceId ? `${priceId.substring(0, 10)}...` : 'MISSING',
    allPriceIds: {
      individual_monthly: PRICE_IDS.individual_monthly
        ? `${PRICE_IDS.individual_monthly.substring(0, 10)}...`
        : 'MISSING',
      individual_annual: PRICE_IDS.individual_annual
        ? `${PRICE_IDS.individual_annual.substring(0, 10)}...`
        : 'MISSING',
      family_monthly: PRICE_IDS.family_monthly
        ? `${PRICE_IDS.family_monthly.substring(0, 10)}...`
        : 'MISSING',
      family_annual: PRICE_IDS.family_annual
        ? `${PRICE_IDS.family_annual.substring(0, 10)}...`
        : 'MISSING',
    }
  })

  // Validate that price IDs are unique
  const priceValues = Object.values(PRICE_IDS).filter(Boolean) as string[]
  const uniquePriceIds = new Set(priceValues)
  if (uniquePriceIds.size < priceValues.length) {
    console.error('[Stripe Checkout] WARNING: Duplicate price IDs detected!', {
      individual_monthly: PRICE_IDS.individual_monthly,
      individual_annual: PRICE_IDS.individual_annual,
      family_monthly: PRICE_IDS.family_monthly,
      family_annual: PRICE_IDS.family_annual,
    })
    alert(`Pricing configuration error: Duplicate price IDs detected. Please check your environment variables.`)
    return
  }

  if (!priceId) {
    console.error('Missing Stripe price ID for plan:', resolvedPlan)
    console.error('Available price IDs:', PRICE_IDS)
    alert(`Pricing configuration error: Missing price ID for ${resolvedPlan} plan. Please check your environment variables.`)
    return
  }

  try {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    })

    if (res.status === 401) {
      // Not logged in – send them to signup, preserving intended plan
      window.location.href = `/signup?plan=${plan}`
      return
    }

    if (!res.ok) {
      let errorData
      try {
        errorData = await res.json()
      } catch {
        errorData = { error: await res.text() }
      }
      console.error('Stripe checkout failed:', {
        status: res.status,
        statusText: res.statusText,
        error: errorData,
      })
      
      // Show more detailed error message in development
      const errorMessage = errorData?.error || 'Unknown error'
      if (process.env.NODE_ENV === 'development') {
        alert(`Error starting checkout: ${errorMessage} (Status: ${res.status})`)
      } else {
        alert('Something went wrong starting your trial. Please try again.')
      }
      return
    }

    const { url } = await res.json()
    if (!url) {
      console.error('Stripe checkout session missing URL')
      alert('Checkout session missing URL. Please contact support.')
      return
    }

    window.location.href = url
  } catch (err) {
    console.error('Stripe checkout error', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    if (process.env.NODE_ENV === 'development') {
      alert(`Network error: ${errorMessage}`)
    } else {
      alert('Network error starting your trial. Please try again.')
    }
  }
}


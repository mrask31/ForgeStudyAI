'use client'

type Plan = 'monthly' | 'semester' | 'annual'

const PRICE_IDS: Record<Plan, string> = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!,
  semester: process.env.NEXT_PUBLIC_STRIPE_PRICE_SEMESTER!,
  annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL!,
}

export async function startStripeCheckout(plan: Plan) {
  const priceId = PRICE_IDS[plan]

  // Log price IDs for debugging (first 10 chars only for security)
  console.log('[Stripe Checkout] Plan mapping:', {
    plan,
    priceId: priceId ? `${priceId.substring(0, 10)}...` : 'MISSING',
    allPriceIds: {
      monthly: PRICE_IDS.monthly ? `${PRICE_IDS.monthly.substring(0, 10)}...` : 'MISSING',
      semester: PRICE_IDS.semester ? `${PRICE_IDS.semester.substring(0, 10)}...` : 'MISSING',
      annual: PRICE_IDS.annual ? `${PRICE_IDS.annual.substring(0, 10)}...` : 'MISSING',
    }
  })

  // Validate that price IDs are unique
  const uniquePriceIds = new Set(Object.values(PRICE_IDS).filter(Boolean))
  if (uniquePriceIds.size < Object.keys(PRICE_IDS).length) {
    console.error('[Stripe Checkout] WARNING: Duplicate price IDs detected!', {
      monthly: PRICE_IDS.monthly,
      semester: PRICE_IDS.semester,
      annual: PRICE_IDS.annual,
    })
    alert(`Pricing configuration error: Duplicate price IDs detected. Please check your environment variables. All three plans (monthly, semester, annual) must have unique Stripe price IDs.`)
    return
  }

  if (!priceId) {
    console.error('Missing Stripe price ID for plan:', plan)
    console.error('Available price IDs:', PRICE_IDS)
    alert(`Pricing configuration error: Missing price ID for ${plan} plan. Please check your environment variables.`)
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


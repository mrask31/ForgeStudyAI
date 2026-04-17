'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { startStripeCheckout } from '@/lib/stripeClient'
import { Loader2, ArrowRight, Check } from 'lucide-react'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlPlan = searchParams.get('plan')
  const normalizePlan = (plan: string | null) => {
    if (!plan) return null
    if (plan === 'monthly') return 'individual_monthly'
    if (plan === 'semester') return 'family_monthly'
    if (plan === 'annual') return 'family_annual'
    if (plan === 'individual_monthly') return 'individual_monthly'
    if (plan === 'individual_annual') return 'individual_annual'
    if (plan === 'family_monthly') return 'family_monthly'
    if (plan === 'family_annual') return 'family_annual'
    return null
  }
  
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual')
  const [selectedPlanType, setSelectedPlanType] = useState<'individual' | 'family'>('family')
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)

  useEffect(() => {
    // If a plan is provided in URL and valid, set it as selected
    const normalizedPlan = normalizePlan(urlPlan)
    if (normalizedPlan) {
      // Extract plan type and billing period from normalized plan
      if (normalizedPlan.includes('individual')) {
        setSelectedPlanType('individual')
      } else if (normalizedPlan.includes('family')) {
        setSelectedPlanType('family')
      }
      
      if (normalizedPlan.includes('monthly')) {
        setBillingPeriod('monthly')
      } else if (normalizedPlan.includes('annual')) {
        setBillingPeriod('annual')
      }
      
      localStorage.removeItem('forgestudy-pending-plan')
      return
    }

    const pendingPlan = localStorage.getItem('forgestudy-pending-plan')
    const normalizedPendingPlan = normalizePlan(pendingPlan)
    if (normalizedPendingPlan) {
      if (normalizedPendingPlan.includes('individual')) {
        setSelectedPlanType('individual')
      } else if (normalizedPendingPlan.includes('family')) {
        setSelectedPlanType('family')
      }
      
      if (normalizedPendingPlan.includes('monthly')) {
        setBillingPeriod('monthly')
      } else if (normalizedPendingPlan.includes('annual')) {
        setBillingPeriod('annual')
      }
    }

    localStorage.removeItem('forgestudy-pending-plan')
  }, [urlPlan])

  const handleStartCheckout = async () => {
    const selectedPlan = `${selectedPlanType}_${billingPeriod}` as 
      'individual_monthly' | 'individual_annual' | 'family_monthly' | 'family_annual'
    
    setIsStartingCheckout(true)
    try {
      await startStripeCheckout(selectedPlan)
    } catch (error) {
      console.error('Failed to start Stripe checkout:', error)
      setIsStartingCheckout(false)
      router.push('/billing/payment-required')
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-950 py-12 sm:py-16 pb-safe-b">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-100 mb-4 tracking-tight">
            Unlock their cognitive potential
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Choose the plan that fits your family. All plans include the full Spatial OS experience.
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center bg-slate-900/60 backdrop-blur-md border border-slate-700 rounded-xl p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                billingPeriod === 'annual'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Annual
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto mb-8">
          {/* Individual Plan */}
          <div 
            onClick={() => setSelectedPlanType('individual')}
            className={`bg-slate-900/40 backdrop-blur-md border-2 rounded-2xl p-6 sm:p-8 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
              selectedPlanType === 'individual' 
                ? 'border-indigo-500 shadow-xl shadow-indigo-500/20' 
                : 'border-slate-800 hover:border-indigo-500/50'
            }`}
          >
            <h3 className="text-2xl font-bold text-slate-100 mb-4">Individual Plan</h3>
            <div className="mb-4">
              {billingPeriod === 'monthly' ? (
                <>
                  <span className="text-5xl font-bold text-slate-100">$14.99</span>
                  <span className="text-xl text-slate-400"> / month</span>
                </>
              ) : (
                <>
                  <span className="text-5xl font-bold text-slate-100">$129.99</span>
                  <span className="text-xl text-slate-400"> / year</span>
                </>
              )}
            </div>
            {billingPeriod === 'annual' && (
              <>
                <p className="text-sm text-indigo-400 font-semibold mb-1">
                  Save 28% — 12 months for the price of 9
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Just $10.83/month billed annually
                </p>
              </>
            )}
            {billingPeriod === 'monthly' && (
              <div className="h-12 mb-4"></div>
            )}
            <ul className="space-y-3 mb-6 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>1 student profile</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>Full Galaxy visualization</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>Socratic sparring sessions</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>Cancel anytime</span>
              </li>
            </ul>
            {selectedPlanType === 'individual' && (
              <div className="flex items-center justify-center gap-2 text-indigo-400 font-semibold">
                <Check className="w-5 h-5" />
                <span>Selected</span>
              </div>
            )}
          </div>

          {/* Family Plan */}
          <div 
            onClick={() => setSelectedPlanType('family')}
            className={`bg-slate-900/60 backdrop-blur-md border-2 rounded-2xl p-6 sm:p-8 relative cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
              selectedPlanType === 'family' 
                ? 'border-indigo-500 shadow-2xl shadow-indigo-500/30' 
                : 'border-indigo-500/50'
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                Most Popular
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-4 mt-2">Family Plan</h3>
            <div className="mb-4">
              {billingPeriod === 'monthly' ? (
                <>
                  <span className="text-5xl font-bold text-slate-100">$29.99</span>
                  <span className="text-xl text-slate-400"> / month</span>
                </>
              ) : (
                <>
                  <span className="text-5xl font-bold text-slate-100">$249.99</span>
                  <span className="text-xl text-slate-400"> / year</span>
                </>
              )}
            </div>
            {billingPeriod === 'annual' && (
              <>
                <p className="text-sm text-indigo-400 font-semibold mb-1">
                  Save 28% — 12 months for the price of 9
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Just $20.83/month billed annually
                </p>
              </>
            )}
            {billingPeriod === 'monthly' && (
              <div className="h-12 mb-4"></div>
            )}
            <ul className="space-y-3 mb-6 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>Up to 4 student profiles</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>One parent account</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>Easy profile switching</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>Cancel anytime</span>
              </li>
            </ul>
            {selectedPlanType === 'family' && (
              <div className="flex items-center justify-center gap-2 text-indigo-400 font-semibold">
                <Check className="w-5 h-5" />
                <span>Selected</span>
              </div>
            )}
          </div>
        </div>

        {/* Continue Button */}
        <div className="text-center max-w-md mx-auto">
          <button
            onClick={handleStartCheckout}
            disabled={isStartingCheckout}
            className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-base sm:text-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-none transform hover:scale-105 active:scale-95 min-h-[44px]"
          >
            {isStartingCheckout ? (
              <>
                <Loader2 className="w-5 h-5 h-6 animate-spin inline-block mr-2" />
                Starting checkout...
              </>
            ) : (
              <>
                Continue to Checkout
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 inline-block ml-2" />
              </>
            )}
          </button>
          <p className="text-xs text-slate-500 mt-3">
            14-day free trial · No credit card required
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100dvh-4rem)] bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

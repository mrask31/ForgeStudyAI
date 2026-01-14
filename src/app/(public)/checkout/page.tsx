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
  const [selectedPlan, setSelectedPlan] = useState<
    'individual_monthly' | 'individual_annual' | 'family_monthly' | 'family_annual' | null
  >(normalizePlan(urlPlan))
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)

  useEffect(() => {
    // Clean up localStorage
    localStorage.removeItem('forgenursing-pending-plan')
    
    // If a plan is provided in URL and valid, set it as selected (but still show UI)
    const normalizedPlan = normalizePlan(urlPlan)
    if (normalizedPlan) {
      setSelectedPlan(normalizedPlan)
    }
  }, [urlPlan])

  const handleStartCheckout = async () => {
    if (!selectedPlan) return
    
    setIsStartingCheckout(true)
    try {
      await startStripeCheckout(selectedPlan)
    } catch (error) {
      console.error('Failed to start Stripe checkout:', error)
      setIsStartingCheckout(false)
      router.push('/billing/payment-required')
    }
  }

  // Always show plan selection UI (even if a plan is pre-selected from URL)
  // This allows users to see and change their plan before checkout
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-br from-slate-50 to-white py-12 sm:py-16 pb-safe-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            Make homework easier, starting tonight
          </h1>
          <p className="text-lg sm:text-xl text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Choose the plan that fits your family. All plans help build confidence, reduce stress, and support step-by-step learning.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-6xl mx-auto mb-8">
            {/* Individual Plan (Monthly) */}
            <div 
              onClick={() => setSelectedPlan('individual_monthly')}
              className={`bg-white border-2 rounded-2xl p-6 sm:p-8 shadow-lg cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                selectedPlan === 'individual_monthly' 
                  ? 'border-teal-500 shadow-xl shadow-teal-500/30' 
                  : 'border-slate-200 hover:border-teal-300'
              }`}
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Individual Plan</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-slate-900">$9.99</span>
                <span className="text-lg text-slate-600"> / month</span>
              </div>
              <p className="text-sm text-teal-700 font-semibold mb-1">Annual: $89 / year</p>
              <p className="text-xs text-slate-600 mb-4">3 months free, includes summer</p>
              <ul className="space-y-2.5 mb-6 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>1 student profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Step-by-step homework help</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Personalized readiness dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Cancel anytime</span>
                </li>
              </ul>
              {selectedPlan === 'individual_monthly' && (
                <div className="flex items-center justify-center gap-2 text-teal-600 font-semibold mb-4">
                  <Check className="w-5 h-5" />
                  <span>Selected</span>
                </div>
              )}
            </div>

            {/* Individual Plan (Annual) */}
            <div 
              onClick={() => setSelectedPlan('individual_annual')}
              className={`bg-white border-2 rounded-2xl p-6 sm:p-8 shadow-lg cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                selectedPlan === 'individual_annual' 
                  ? 'border-teal-500 shadow-xl shadow-teal-500/30' 
                  : 'border-slate-200 hover:border-teal-300'
              }`}
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Individual Plan (Annual)</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-slate-900">$89</span>
                <span className="text-lg text-slate-600"> / year</span>
              </div>
              <p className="text-sm text-teal-700 font-semibold mb-1">Pay for 9 months, get 12</p>
              <p className="text-xs text-slate-600 mb-4">Includes summer — 3 months free</p>
              <ul className="space-y-2.5 mb-6 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>1 student profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Step-by-step homework help</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Personalized readiness dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Cancel anytime</span>
                </li>
              </ul>
              {selectedPlan === 'individual_annual' && (
                <div className="flex items-center justify-center gap-2 text-teal-600 font-semibold mb-4">
                  <Check className="w-5 h-5" />
                  <span>Selected</span>
                </div>
              )}
            </div>

            {/* Family Plan (Monthly) - Recommended */}
            <div 
              onClick={() => setSelectedPlan('family_monthly')}
              className={`bg-gradient-to-br from-teal-50/50 via-slate-50 to-teal-50/50 border-2 rounded-2xl p-6 sm:p-8 shadow-xl relative cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                selectedPlan === 'family_monthly' 
                  ? 'border-teal-500 shadow-2xl shadow-teal-500/40' 
                  : 'border-teal-300/60'
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-teal-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-semibold shadow-lg">
                  Recommended for Families
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 mt-2">Family Plan (Monthly)</h3>
              <div className="mb-1">
                <span className="text-4xl font-bold text-slate-900">$19.99</span>
                <span className="text-lg text-slate-600"> / month</span>
              </div>
              <p className="text-sm text-teal-700 mb-1 font-semibold">Annual: $179 / year</p>
              <p className="text-xs text-slate-600 mb-4">Less than $15/month per child</p>
              <ul className="space-y-2.5 mb-6 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Up to 4 student profiles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>One parent account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Easy profile switching</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Cancel anytime</span>
                </li>
              </ul>
              {selectedPlan === 'family_monthly' && (
                <div className="flex items-center justify-center gap-2 text-teal-600 font-semibold mb-4">
                  <Check className="w-5 h-5" />
                  <span>Selected</span>
                </div>
              )}
            </div>

            {/* Family Plan (Annual) - Best for Long-Term Growth */}
            <div 
              onClick={() => setSelectedPlan('family_annual')}
              className={`bg-gradient-to-br from-teal-50/50 via-slate-50 to-teal-50/50 border-2 rounded-2xl p-6 sm:p-8 shadow-xl relative cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                selectedPlan === 'family_annual' 
                  ? 'border-teal-500 shadow-2xl shadow-teal-500/40' 
                  : 'border-teal-300/60'
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-teal-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-semibold shadow-lg">
                  Best for Long-Term Growth
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 mt-2">Family Plan (Annual)</h3>
              <div className="mb-1">
                <span className="text-4xl font-bold text-slate-900">$179</span>
                <span className="text-lg text-slate-600"> / year</span>
              </div>
              <p className="text-sm text-teal-700 mb-4 font-semibold">
                Includes summer — 3 months free
              </p>
              <p className="text-sm text-slate-700 mb-4 font-medium">
                Less than $15/month per child, with uninterrupted support all year.
              </p>
              <ul className="space-y-2.5 mb-6 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Up to 4 student profiles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>One parent account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Easy profile switching</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Cancel anytime</span>
                </li>
              </ul>
              {selectedPlan === 'family_annual' && (
                <div className="flex items-center justify-center gap-2 text-teal-600 font-semibold mb-4">
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
            disabled={!selectedPlan || isStartingCheckout}
            className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-teal-700 to-teal-600 text-white rounded-xl text-base sm:text-lg font-bold hover:from-teal-800 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 transition-all duration-200 shadow-md shadow-teal-500/30 hover:shadow-lg hover:shadow-teal-500/40 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 min-h-[44px]"
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
            7-day free trial · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-slate-700">Loading...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}


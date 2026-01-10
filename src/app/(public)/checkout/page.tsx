'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { startStripeCheckout } from '@/lib/stripeClient'
import { Loader2, ArrowRight, Check } from 'lucide-react'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlPlan = searchParams.get('plan') as 'monthly' | 'semester' | 'annual' | null
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'semester' | 'annual' | null>(urlPlan || null)
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)

  useEffect(() => {
    // Clean up localStorage
    localStorage.removeItem('forgenursing-pending-plan')
    
    // If a plan is provided in URL and valid, set it as selected (but still show UI)
    if (urlPlan && (urlPlan === 'monthly' || urlPlan === 'semester' || urlPlan === 'annual')) {
      setSelectedPlan(urlPlan)
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
    <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 py-12 sm:py-16 pb-safe-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg sm:text-xl text-slate-700 max-w-2xl mx-auto">
            Select the plan that best fits your learning journey. All plans include a 7-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto mb-8">
            {/* Monthly Plan */}
            <div 
              onClick={() => setSelectedPlan('monthly')}
              className={`bg-white/80 backdrop-blur-sm border-2 rounded-2xl p-6 sm:p-8 shadow-lg cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                selectedPlan === 'monthly' 
                  ? 'border-indigo-500 shadow-xl shadow-indigo-500/30' 
                  : 'border-slate-200/60 hover:border-indigo-300'
              }`}
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Monthly Access</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-slate-900">$24.99</span>
                <span className="text-lg text-slate-600"> / month</span>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Perfect for students who want flexibility.
              </p>
              <ul className="space-y-2.5 mb-6 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>Unlimited access to ForgeNursing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>Billed monthly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>Cancel anytime</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>7-day free trial included</span>
                </li>
              </ul>
              {selectedPlan === 'monthly' && (
                <div className="flex items-center justify-center gap-2 text-indigo-600 font-semibold mb-4">
                  <Check className="w-5 h-5" />
                  <span>Selected</span>
                </div>
              )}
            </div>

            {/* Semester Plan - Most Popular */}
            <div 
              onClick={() => setSelectedPlan('semester')}
              className={`bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-indigo-50/80 backdrop-blur-sm border-2 rounded-2xl p-6 sm:p-8 shadow-xl relative cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                selectedPlan === 'semester' 
                  ? 'border-indigo-500 shadow-2xl shadow-indigo-500/40' 
                  : 'border-indigo-400/60'
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-indigo-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-semibold shadow-lg">
                  Most Popular
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 mt-2">Semester Access</h3>
              <div className="mb-1">
                <span className="text-4xl font-bold text-slate-900">$89</span>
              </div>
              <p className="text-xs text-slate-600 mb-1">One-Time Payment • 4 Months</p>
              <p className="text-sm text-indigo-700 mb-4 font-semibold">
                Save $11 vs monthly
              </p>
              <p className="text-sm text-slate-700 mb-4 font-medium">
                Designed for a single term or NCLEX prep cycle.
              </p>
              <ul className="space-y-2.5 mb-6 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>4 full months of access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>No contracts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>No surprise renewals</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>7-day free trial included</span>
                </li>
              </ul>
              {selectedPlan === 'semester' && (
                <div className="flex items-center justify-center gap-2 text-indigo-600 font-semibold mb-4">
                  <Check className="w-5 h-5" />
                  <span>Selected</span>
                </div>
              )}
            </div>

            {/* Annual Plan - Best Value */}
            <div 
              onClick={() => setSelectedPlan('annual')}
              className={`bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-indigo-50/80 backdrop-blur-sm border-2 rounded-2xl p-6 sm:p-8 shadow-xl relative cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                selectedPlan === 'annual' 
                  ? 'border-indigo-500 shadow-2xl shadow-indigo-500/40' 
                  : 'border-indigo-400/60'
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-indigo-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-semibold shadow-lg">
                  Best Value
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 mt-2">Annual Access</h3>
              <div className="mb-1">
                <span className="text-4xl font-bold text-slate-900">$199</span>
                <span className="text-lg text-slate-600"> / year</span>
              </div>
              <p className="text-sm text-indigo-700 mb-4 font-semibold">
                Save 34% vs monthly
              </p>
              <p className="text-sm text-slate-700 mb-4 font-medium">
                For students committed to mastery and peace of mind.
              </p>
              <ul className="space-y-2.5 mb-6 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>12 months of unlimited access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>Best overall savings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>Renews annually (reminders sent)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>7-day free trial included</span>
                </li>
              </ul>
              {selectedPlan === 'annual' && (
                <div className="flex items-center justify-center gap-2 text-indigo-600 font-semibold mb-4">
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
            className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-base sm:text-lg font-bold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 min-h-[44px]"
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
            All plans include a 7-day free trial. Cancel anytime.
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
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-700">Loading...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}


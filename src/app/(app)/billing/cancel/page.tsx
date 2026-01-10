'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, XCircle, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { startStripeCheckout } from '@/lib/stripeClient'

export default function BillingCancelPage() {
  const [plan, setPlan] = useState<'monthly' | 'semester' | 'annual' | null>(null)

  useEffect(() => {
    // Check if there's a plan in localStorage from previous checkout attempt
    const savedPlan = localStorage.getItem('forgenursing-pending-plan')
    if (savedPlan && (savedPlan === 'monthly' || savedPlan === 'semester' || savedPlan === 'annual')) {
      setPlan(savedPlan as 'monthly' | 'semester' | 'annual')
    }
  }, [])

  const handleRetryCheckout = async () => {
    if (plan) {
      await startStripeCheckout(plan)
    } else {
      // Default to monthly if no plan saved
      await startStripeCheckout('monthly')
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-slate-400" />
          </div>
          
          <h1 className="text-2xl font-semibold text-slate-900 mb-3">
            Checkout Cancelled
          </h1>
          
          <p className="text-slate-600 mb-6 leading-relaxed">
            Your checkout was cancelled. No charges were made. To access ForgeNursing, please complete your subscription setup.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleRetryCheckout}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-base font-medium hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              <CreditCard className="w-5 h-5" />
              Complete Payment Setup
            </button>
            
            <Link
              href="/"
              className="block w-full text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Back to Pricing
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2">
              Your account is set up, but payment is required to access the app.
            </p>
            <p className="text-xs text-slate-500">
              Questions? Contact us at{' '}
              <a href="mailto:support@forgenursing.com" className="text-indigo-600 hover:underline">
                support@forgenursing.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


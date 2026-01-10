'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { CreditCard, ArrowRight, Loader2 } from 'lucide-react'
import { startStripeCheckout } from '@/lib/stripeClient'

export default function PaymentRequiredPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [plan, setPlan] = useState<'monthly' | 'semester' | 'annual' | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    loadUser()

    // Check if there's a plan in localStorage from previous checkout attempt
    const savedPlan = localStorage.getItem('forgenursing-pending-plan')
    if (savedPlan && (savedPlan === 'monthly' || savedPlan === 'semester' || savedPlan === 'annual')) {
      setPlan(savedPlan as 'monthly' | 'semester' | 'annual')
    }
  }, [])

  const handleStartCheckout = async () => {
    if (!plan) {
      // Default to monthly if no plan selected
      await startStripeCheckout('monthly')
    } else {
      await startStripeCheckout(plan)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-10 h-10 text-indigo-600" />
          </div>
          
          <h1 className="text-2xl font-semibold text-slate-900 mb-3">
            Payment Required
          </h1>
          
          <p className="text-slate-600 mb-6 leading-relaxed">
            To access ForgeNursing, please complete your subscription setup. Start your 7-day free trial by adding your payment information.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleStartCheckout}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-base font-medium hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="block w-full text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              View Pricing Plans
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2">
              Your account is set up and email verified. Complete payment to start learning.
            </p>
            <p className="text-xs text-slate-500">
              Need help? Contact us at{' '}
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


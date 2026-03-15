'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { startStripeCheckout } from '@/lib/stripeClient'
import { Suspense } from 'react'

function PaymentRequiredContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<'monthly' | 'semester' | 'annual' | null>(null)
  const isExpired = searchParams.get('reason') === 'trial_expired'

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const loadUser = async () => {
      await supabase.auth.getUser()
      setLoading(false)
    }

    loadUser()

    const savedPlan = localStorage.getItem('forgestudy-pending-plan')
    if (savedPlan && (savedPlan === 'monthly' || savedPlan === 'semester' || savedPlan === 'annual')) {
      setPlan(savedPlan as 'monthly' | 'semester' | 'annual')
    }
  }, [])

  const handleStartCheckout = async () => {
    await startStripeCheckout(plan || 'monthly')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-indigo-400" />
          </div>

          <h1 className="text-2xl font-semibold text-slate-100 mb-3">
            {isExpired ? 'Your free trial has ended' : 'Upgrade to Keep Learning'}
          </h1>

          <p className="text-slate-400 mb-6 leading-relaxed">
            {isExpired
              ? 'Your Galaxy is still here — upgrade now to pick up right where you left off. All your progress is saved.'
              : 'Start your 7-day free trial to unlock AI tutoring, Galaxy visualization, and study tracking. No charge until the trial ends.'}
          </p>

          <div className="space-y-3">
            <button
              onClick={handleStartCheckout}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-base font-semibold transition-all shadow-lg shadow-indigo-500/30"
            >
              {isExpired ? 'Upgrade Now' : 'Start Free Trial'}
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => router.push('/')}
              className="block w-full text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              View Pricing Plans
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-600">
              {isExpired
                ? 'Your progress is safe. Upgrade to resume studying.'
                : 'Cancel anytime during your trial — no charge.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PaymentRequiredPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    }>
      <PaymentRequiredContent />
    </Suspense>
  )
}

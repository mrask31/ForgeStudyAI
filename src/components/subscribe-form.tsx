'use client'

import { useState } from 'react'
import { startStripeCheckout } from '@/lib/stripeClient'
import { CheckCircle2, Shield, Loader2 } from 'lucide-react'

interface SubscribeFormProps {
  fromContext?: 'founding' | 'trial' | null
}

const features = [
  'Socratic AI tutoring — guides, never gives answers',
  'Upload any homework, worksheet, or textbook',
  'Interactive Galaxy mastery map',
  'Weekly parent progress email',
  'Up to 4 student profiles (Family plan)',
]

export function SubscribeForm({ fromContext }: SubscribeFormProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (plan: 'individual_monthly' | 'individual_annual' | 'family_monthly' | 'family_annual') => {
    setLoading(plan)
    try {
      await startStripeCheckout(plan)
    } catch {
      // startStripeCheckout handles its own errors
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-8">
      {fromContext && (
        <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-xl p-4 text-center">
          <p className="text-indigo-200 text-sm">
            {fromContext === 'founding'
              ? 'Welcome back. Your Founding Families access ended. Pick up where you left off.'
              : 'Welcome back. Your free trial ended. Pick up where you left off.'}
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Individual Plan */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Individual</h3>
          <p className="text-slate-400 text-sm">1 student profile. Everything unlimited.</p>
          <div className="space-y-3">
            <button
              onClick={() => handleSubscribe('individual_monthly')}
              disabled={!!loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading === 'individual_monthly' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              $14.99/month
            </button>
            <button
              onClick={() => handleSubscribe('individual_annual')}
              disabled={!!loading}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading === 'individual_annual' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              $129.99/year (save 28%)
            </button>
          </div>
        </div>

        {/* Family Plan */}
        <div className="bg-slate-800/60 border-2 border-indigo-500 rounded-2xl p-6 space-y-4 relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            Most Popular
          </span>
          <h3 className="text-lg font-semibold text-white">Family</h3>
          <p className="text-slate-400 text-sm">Up to 4 student profiles. One parent email.</p>
          <div className="space-y-3">
            <button
              onClick={() => handleSubscribe('family_monthly')}
              disabled={!!loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading === 'family_monthly' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              $29.99/month
            </button>
            <button
              onClick={() => handleSubscribe('family_annual')}
              disabled={!!loading}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading === 'family_annual' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              $249.99/year (save 31%)
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-2">
        {features.map((f) => (
          <div key={f} className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-slate-300">{f}</span>
          </div>
        ))}
      </div>

      {/* Trust */}
      <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
        <Shield className="w-3.5 h-3.5" />
        <span>30-day money-back guarantee. Cancel anytime. Secure payment via Stripe.</span>
      </div>
    </div>
  )
}

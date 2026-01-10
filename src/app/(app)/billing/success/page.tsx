'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

function BillingSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Give Stripe a moment to process the session
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-700">Confirming your subscription...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-semibold text-slate-900 mb-3">
            Welcome to ForgeNursing!
          </h1>
          
          <p className="text-slate-600 mb-6 leading-relaxed">
            Your subscription is now active. You have full access to all features, and your 7-day free trial has begun.
          </p>

          {sessionId && (
            <p className="text-xs text-slate-500 mb-6">
              Session ID: {sessionId.substring(0, 20)}...
            </p>
          )}

          <div className="space-y-3">
            <Link
              href="/tutor"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-base font-medium hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              Start Learning
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <Link
              href="/readiness"
              className="block text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
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

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-700">Loading...</p>
        </div>
      </div>
    }>
      <BillingSuccessContent />
    </Suspense>
  )
}


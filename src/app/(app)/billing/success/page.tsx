'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight, Loader2, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { hasSubscriptionAccess } from '@/lib/subscription-access'

function BillingSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)
  const [subscriptionVerified, setSubscriptionVerified] = useState(false)

  useEffect(() => {
    const MAX_ATTEMPTS = 10 // Max 10 attempts
    const POLL_INTERVAL = 1000 // 1 second between attempts
    const INITIAL_DELAY = 2000 // 2 second initial delay
    let attemptCount = 0

    // Verify subscription status before proceeding
    async function verifySubscription() {
      attemptCount++
      
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          console.error('[Billing Success] No user found, redirecting to login')
          router.replace('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', user.id)
          .single()

        if (profile && hasSubscriptionAccess(profile.subscription_status)) {
          console.log('[Billing Success] Subscription verified:', profile.subscription_status)
          setSubscriptionVerified(true)
          return
        }

        // Subscription not active yet
        if (attemptCount < MAX_ATTEMPTS) {
          console.log(`[Billing Success] Attempt ${attemptCount}/${MAX_ATTEMPTS}: Subscription not active yet, retrying...`)
          setTimeout(verifySubscription, POLL_INTERVAL)
        } else {
          console.warn('[Billing Success] Max attempts reached, proceeding anyway')
          setSubscriptionVerified(true)
        }
      } catch (error) {
        console.error('[Billing Success] Error verifying subscription:', error)
        // On error, proceed anyway if max attempts reached
        if (attemptCount >= MAX_ATTEMPTS) {
          console.warn('[Billing Success] Error after max attempts, proceeding anyway')
          setSubscriptionVerified(true)
        } else {
          setTimeout(verifySubscription, POLL_INTERVAL)
        }
      }
    }

    // Give Stripe webhook initial time to process
    const timer = setTimeout(() => {
      verifySubscription()
    }, INITIAL_DELAY)

    return () => clearTimeout(timer)
  }, [router])

  useEffect(() => {
    if (!subscriptionVerified) return
    setLoading(false)
    
    const redirectTimer = setTimeout(() => {
      router.replace('/profiles/new')
    }, 2000)
    
    return () => clearTimeout(redirectTimer)
  }, [subscriptionVerified, router])

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-slate-700">Confirming your subscription...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          
          <h1 className="text-2xl font-semibold text-slate-900 mb-3">
            You’re all set!
          </h1>
          
          <p className="text-slate-600 mb-6 leading-relaxed">
            Your subscription is active and your 7-day free trial has started. Next, create your first student profile so we can match the right grade band.
          </p>

          {sessionId && (
            <p className="text-xs text-slate-500 mb-6">
              Session ID: {sessionId.substring(0, 20)}...
            </p>
          )}

          <div className="space-y-3">
            <Link
              href="/profiles/new"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-base font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl"
            >
              Create student profile
              <UserPlus className="w-5 h-5" />
            </Link>
            <div className="text-xs text-slate-500">
              Redirecting you to create a profile…
            </div>
            <Link
              href="/profiles"
              className="block text-sm text-teal-700 hover:text-teal-800 transition-colors"
            >
              Go to profiles
              <ArrowRight className="inline-block w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Need help? Contact us at{' '}
              <a href="mailto:support@forgestudy.com" className="text-teal-700 hover:underline">
                support@forgestudy.com
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
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-slate-700">Loading...</p>
        </div>
      </div>
    }>
      <BillingSuccessContent />
    </Suspense>
  )
}


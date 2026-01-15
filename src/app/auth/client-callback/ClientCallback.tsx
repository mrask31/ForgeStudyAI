 'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ClientCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'working' | 'error'>('working')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const supabase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration is missing.')
    }
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }, [])

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setStatus('error')
      router.replace('/login?error=auth-code-error')
      return
    }

    let didTimeout = false
    const timeoutId = window.setTimeout(() => {
      didTimeout = true
      setStatus('error')
      setErrorMessage(
        'Verification timed out. Please request a new verification email and try again.'
      )
    }, 10000)

    const run = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      window.clearTimeout(timeoutId)
      if (didTimeout) {
        return
      }
      if (error) {
        console.error('[Client Callback] Error exchanging code for session:', error)
        setStatus('error')
        setErrorMessage(error.message || 'Unknown error')
        return
      }
      router.replace('/checkout')
    }

    run()
  }, [router, searchParams, supabase])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          {status === 'working' ? 'Finishing verification...' : 'Verification failed'}
        </h1>
        <p className="text-sm text-slate-600">
          {status === 'working'
            ? 'One moment while we complete your signup.'
            : 'Please try signing in again or request a new verification email.'}
        </p>
        {status === 'error' && (
          <div className="mt-4 text-left text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="font-semibold text-slate-700 mb-1">Error detail</div>
            <div className="break-words">{errorMessage || 'Unknown error'}</div>
          </div>
        )}
        {status === 'error' && (
          <button
            type="button"
            onClick={() => {
              const storedEmail = window.localStorage.getItem('forgestudy-pending-email')
              const loginUrl = new URL('/login', window.location.origin)
              loginUrl.searchParams.set('verified', 'true')
              loginUrl.searchParams.set('redirect', '/checkout')
              if (storedEmail) {
                loginUrl.searchParams.set('email', storedEmail)
              }
              window.location.assign(loginUrl.toString())
            }}
            className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            Go to sign in
          </button>
        )}
      </div>
    </div>
  )
}

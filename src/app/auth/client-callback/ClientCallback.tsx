 'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ClientCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'working' | 'error'>('working')

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

    const run = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('[Client Callback] Error exchanging code for session:', error)
        setStatus('error')
        router.replace('/login?error=auth-code-error')
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
      </div>
    </div>
  )
}

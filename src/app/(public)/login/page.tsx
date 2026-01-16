'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Mail, Lock, ArrowRight, Loader2, MessageSquare, BookOpen, GraduationCap, Shield } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const [redirect, setRedirect] = useState('/profiles')
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false)
  
  const router = useRouter()

  // Memoize Supabase client to prevent recreation on every render
  // Ensure Supabase client configuration for production
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabase = useMemo(() => {

    // Sanity check: log warning in dev if env vars are missing
    if (process.env.NODE_ENV === 'development') {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('⚠️ [Login] Supabase environment variables are missing!')
        console.warn('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
        console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗')
      }
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration is missing. Please check your environment variables.')
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const redirectParam = params.get('redirect')
      // For backward compatibility, respect redirect param if provided
      // Otherwise default to profiles
      if (redirectParam) {
        setRedirect(redirectParam)
      } else {
        setRedirect('/profiles')
      }
      
      // Check if user just verified their email
      const verified = params.get('verified')
      const verifiedEmail = params.get('email')
      if (verified === 'true' && verifiedEmail) {
        setShowVerificationSuccess(true)
        setEmail(verifiedEmail)
        setMessage({ 
          text: `Thanks for verifying your email! Please sign in to continue.`, 
          type: 'success' 
        })
        if (!redirectParam) {
          setRedirect('/checkout')
        }
      } else if (verified === 'true' && !verifiedEmail) {
        const storedEmail = window.localStorage.getItem('forgestudy-pending-email')
        if (storedEmail) {
          setShowVerificationSuccess(true)
          setEmail(storedEmail)
          setMessage({ 
            text: `Thanks for verifying your email! Please sign in to continue.`, 
            type: 'success' 
          })
          if (!redirectParam) {
            setRedirect('/checkout')
          }
        }
      }
    }
  }, [])

  // Auth guard: if already signed in, go to /profiles
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('[Login] Session exists, redirecting to /profiles')
        router.replace('/profiles')
      }
    }

    checkExistingSession()
  }, [router, supabase])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Ensure spinner stops on login error - always set loading to false in finally
    setLoading(true)
    setMessage(null)
    try {
      console.log('[Login] Attempting to sign in...', { email: email.trim() })

      const signInPromise = supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              `Login timed out. Please check your connection or Supabase URL (${supabaseUrl || 'missing'}).`
            )
          )
        }, 10000)
      })

      const { data, error } = await Promise.race([signInPromise, timeoutPromise])

      // On error: Set isLoading back to false, store error state, show human-readable message
      if (error) {
        console.error('[Login] Supabase sign-in error:', error)
        setMessage({ 
          text: error.message || 'Login failed. Please check your email and password.', 
          type: 'error' 
        })
        return // Exit early, finally block will set loading to false
      }

      if (!data || !data.user) {
        console.error('[Login] No user data returned from sign-in')
        setMessage({ 
          text: 'Login failed: No user data returned. Please try again.', 
          type: 'error' 
        })
        return // Exit early, finally block will set loading to false
      }

      console.log('[Login] Sign in successful, redirecting', { redirect })
      router.replace(redirect || '/profiles')
    } catch (err) {
      // In catch: console.error for debugging, show user-friendly error
      console.error('[Login] Unexpected login error:', err)
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Something went wrong. Please try again.'
      setMessage({ 
        text: errorMessage, 
        type: 'error' 
      })
    } finally {
      console.log('[Login] Login flow complete, stopping loader')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100dvh-4rem)] flex-col-reverse lg:flex-row">
        {/* Left Column - Desktop Only, shown below on mobile */}
        <div className="hidden lg:flex bg-gradient-to-br from-slate-50 to-white border-r border-slate-200 flex flex-col justify-center items-center h-full px-8 text-center">
          <div className="max-w-md space-y-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center mx-auto shadow-lg">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                Homework help that teaches — not cheats.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Step-by-step support for Grades 3–12 that builds real understanding.
              </p>
            </div>
            
            {/* Quick Benefits */}
            <div className="space-y-4 pt-8 border-t border-slate-200">
              <div className="flex items-start gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm mb-1">Explains step-by-step (not just answers)</div>
                  <div className="text-xs text-slate-600">Guided explanations that build understanding</div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm mb-1">Personal readiness dashboard</div>
                  <div className="text-xs text-slate-600">Track progress and focus areas</div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm mb-1">Profiles for families (up to 4 students)</div>
                  <div className="text-xs text-slate-600">One account, multiple learners</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Auth Form - Shown first on mobile */}
        <div className="flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 bg-white order-1 lg:order-2">
          <div className="w-full max-w-md">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg">
              {/* Header */}
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-teal-700 to-teal-600 rounded-xl mb-4 shadow-lg shadow-teal-500/25">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                {showVerificationSuccess ? (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">
                      Email Verified! 🎉
                    </h1>
                    <p className="text-sm text-slate-600">
                      Thanks for verifying your email. Please sign in to continue.
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">
                      Welcome back
                    </h1>
                    <p className="text-sm text-slate-600">
                      Sign in to keep building confidence and independence.
                    </p>
                  </>
                )}
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      placeholder="Enter your password"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {message && (
                  <div className={`p-4 text-sm rounded-xl ${
                    message.type === 'error' 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-3.5 bg-gradient-to-r from-teal-700 to-teal-600 text-white rounded-xl text-base font-bold hover:from-teal-800 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-500/30 hover:shadow-lg hover:shadow-teal-500/40 min-h-[44px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-3 text-right">
                <Link
                  href="/reset"
                  className="text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Toggle */}
              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200 text-center">
                <span className="text-sm text-slate-600">
                  Don't have an account?{' '}
                </span>
                <Link
                  href="/signup"
                  className="text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

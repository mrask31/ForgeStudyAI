'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Mail, Lock, ArrowRight, Loader2, MessageSquare, BookOpen, GraduationCap, Shield } from 'lucide-react'
import Link from 'next/link'

export default function LoginClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const [redirect, setRedirect] = useState('/post-login')
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false)
  const hasClearedStaleSession = useRef(false)
  
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

  const debugAuth = process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true'
  const debugLog = (...args: any[]) => {
    if (debugAuth) {
      console.debug('[AuthDebug]', ...args)
    }
  }

  const clearSupabaseStorage = () => {
    if (typeof window === 'undefined') return
    const clearStore = (store: Storage) => {
      const keysToRemove: string[] = []
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i)
        if (!key) continue
        if (key.toLowerCase().includes('supabase') || key.toLowerCase().includes('sb-')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => store.removeItem(key))
    }
    try {
      clearStore(window.localStorage)
      clearStore(window.sessionStorage)
    } catch (error) {
      debugLog('storage-clear-error', error)
    }

    try {
      document.cookie.split(';').forEach((cookie) => {
        const name = cookie.split('=')[0]?.trim()
        if (!name) return
        const lower = name.toLowerCase()
        if (lower.includes('supabase') || lower.startsWith('sb-')) {
          document.cookie = `${name}=; Max-Age=0; path=/`
        }
      })
    } catch (error) {
      debugLog('cookie-clear-error', error)
    }
  }

  const resetSession = () => {
    clearSupabaseStorage()
    if (typeof window !== 'undefined') {
      window.location.assign('/login')
    }
  }

  const isRecoverableAuthError = (err: unknown) => {
    const message =
      typeof err === 'string'
        ? err
        : err instanceof Error
          ? err.message
          : (err as any)?.message || ''
    const normalized = message.toLowerCase()
    return [
      'invalid',
      'expired',
      'session',
      'refresh token',
      'jwt',
      'storage',
      'localstorage',
      'auth session missing',
    ].some((token) => normalized.includes(token))
  }

  const signInWithTimeout = async () => {
    const signInPromise = supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Sign in timed out. Please try again.'))
      }, 12000)
    })

    return Promise.race([signInPromise, timeoutPromise])
  }

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        clearSupabaseStorage()
        window.location.reload()
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => {
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  useEffect(() => {
    const isBackForward =
      typeof performance !== 'undefined' &&
      performance.getEntriesByType('navigation')[0] instanceof PerformanceNavigationTiming &&
      (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).type === 'back_forward'

    if (isBackForward) {
      clearSupabaseStorage()
      window.location.reload()
    }
  }, [])

  const hasSupabaseCookie = () => {
    if (typeof document === 'undefined') return false
    return document.cookie.split(';').some((cookie) => {
      const name = cookie.split('=')[0]?.trim().toLowerCase() || ''
      return name.startsWith('sb-') || name.includes('supabase')
    })
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const redirectParam = params.get('redirect')
      // For backward compatibility, respect redirect param if provided
      // Otherwise default to profiles
      if (redirectParam) {
        setRedirect(redirectParam)
      } else {
        setRedirect('/post-login')
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
          setRedirect('/parent')
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
            setRedirect('/parent')
          }
        }
      }
    }
  }, [])

  // Auth guard: if already signed in, go to /post-login
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('[Login] Session exists, redirecting to /post-login')
        router.replace('/post-login')
        return
      }

      if (!hasClearedStaleSession.current && hasSupabaseCookie()) {
        hasClearedStaleSession.current = true
        clearSupabaseStorage()
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
      debugLog('sign-in-start', { email: email.trim() })

      const attemptSignIn = async (attempt: number): Promise<any> => {
        try {
          const { data, error } = (await signInWithTimeout()) as any
          debugLog('sign-in-response', { attempt, hasUser: Boolean(data?.user), error })
          if (error) {
            throw error
          }
          if (!data || !data.user || !data.session) {
            throw new Error('Login failed: No session returned. Please try again.')
          }
          return data
        } catch (err) {
          const isTimeout = err instanceof Error && err.message.toLowerCase().includes('timed out')
          debugLog('sign-in-error', { attempt, error: err })
          if ((isTimeout || isRecoverableAuthError(err)) && attempt === 0) {
            debugLog('sign-in-retry-after-clear', { reason: isTimeout ? 'timeout' : 'recoverable' })
            clearSupabaseStorage()
            return attemptSignIn(1)
          }
          throw err
        }
      }

      await attemptSignIn(0)

      debugLog('sign-in-success', { redirect })
      router.replace(redirect || '/post-login')
    } catch (err) {
      // In catch: console.error for debugging, show user-friendly error
      debugLog('sign-in-final-error', err)
      const errorMessage = err instanceof Error
        ? err.message
        : 'Something went wrong. Please try again.'
      setMessage({ 
        text: errorMessage, 
        type: 'error' 
      })
    } finally {
      debugLog('sign-in-complete')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-950 flex">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[calc(100dvh-4rem)] w-full">
        {/* Left Column - Context Area */}
        <div className="bg-slate-900 md:border-r border-slate-800 flex flex-col justify-center p-8 md:p-16 w-full">
          <div className="max-w-md mx-auto space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-slate-100 leading-tight">
                Unlock their cognitive potential.
              </h2>
              <p className="text-slate-400 text-lg">
                The AI tutor that refuses to cheat.
              </p>
            </div>
            
            {/* Quick Benefits */}
            <div className="space-y-6 pt-8">
              <div className="flex items-start gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <div className="font-semibold text-slate-100 text-base mb-1">Visualized Mastery</div>
                  <div className="text-sm text-slate-400">Watch their knowledge grow into a connected universe.</div>
                </div>
              </div>
              <div className="flex items-start gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <div className="font-semibold text-slate-100 text-base mb-1">Socratic Sparring</div>
                  <div className="text-sm text-slate-400">We force critical thinking instead of just handing out answers.</div>
                </div>
              </div>
              <div className="flex items-start gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <div className="font-semibold text-slate-100 text-base mb-1">Guaranteed Retention</div>
                  <div className="text-sm text-slate-400">Snap-back reviews mathematically eliminate test-day anxiety.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Login Form */}
        <div className="bg-slate-950 flex flex-col justify-center items-center p-8 md:p-16 w-full">
          <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-md border border-slate-800 shadow-2xl rounded-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-2">
                Welcome back
              </h1>
              <p className="text-slate-400">
                Sign in to continue your learning journey
              </p>
            </div>

            {/* Success Message for Email Verification */}
            {showVerificationSuccess && (
              <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-xl p-4 text-center mb-6">
                <p className="text-sm text-emerald-400 font-medium">
                  ✅ Email verified successfully! Please sign in below.
                </p>
              </div>
            )}

            {/* Error Message */}
            {message && (
              <div className={`rounded-xl p-4 text-center mb-6 ${message.type === 'error' ? 'bg-red-900/20 border border-red-700/50' : 'bg-emerald-900/20 border border-emerald-700/50'}`}>
                <p className={`text-sm font-medium ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {message.text}
                </p>
                {message.type === 'error' && (
                  <button
                    type="button"
                    onClick={resetSession}
                    className="mt-2 text-xs font-semibold text-slate-400 hover:text-slate-200 underline"
                  >
                    Reset session
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-300 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    placeholder="Enter your email"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Remember & Reset */}
              <div className="flex items-center justify-between">
                <Link href="/reset" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email.trim() || !password.trim()}
                className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors border-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </button>
            </form>

            {/* Additional Links */}
            <div className="text-center space-y-2 mt-6">
              <p className="text-sm text-slate-400">
                Don't have an account?{' '}
                <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-semibold">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

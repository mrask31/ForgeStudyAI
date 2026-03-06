'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Mail, Lock, ArrowRight, Loader2, CheckCircle, MessageSquare, BookOpen, GraduationCap, Shield, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function SignupClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [canResend, setCanResend] = useState(false)
  const [resending, setResending] = useState(false)
  const router = useRouter()

  // Singleton Supabase client
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const normalizeAppUrl = useCallback((url?: string | null) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    const protocol = url.includes('localhost') || url.includes('127.0.0.1') ? 'http://' : 'https://'
    return `${protocol}${url}`
  }, [])

  const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL)

  // Auth guard: if already signed in, go to /profiles
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('[Signup] Session exists, redirecting to /profiles')
        router.replace('/profiles')
      }
    }

    checkExistingSession()
  }, [router, supabase])

  // Store plan and band parameters from URL in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const plan = params.get('plan')
      if (plan && (plan === 'monthly' || plan === 'semester' || plan === 'annual')) {
        localStorage.setItem('forgenursing-pending-plan', plan)
      }
      const band = params.get('band')
      if (band && (band === 'high' || band === 'middle')) {
        localStorage.setItem('forgestudy-pending-band', band)
      }
    }
  }, [])

  const checkAuthAndRedirect = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      console.log('[Signup] Session found after verification, redirecting to /checkout')
      setIsVerifying(true)
      setMessage({ 
        text: 'Email verified! Redirecting...', 
        type: 'success' 
      })

      setTimeout(() => {
        router.replace('/checkout')
      }, 1000)
    } else {
      console.log('[Signup] No session yet, waiting for verification...')
    }
  }, [router, supabase])

  // Listen for auth state changes and poll for email verification
  useEffect(() => {
    if (!showSuccess) return // Only listen if we're waiting for verification

    let pollInterval: NodeJS.Timeout | null = null

    // Listen for auth state changes (works for same device/tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[Signup] Auth state change: SIGNED_IN, redirecting to /checkout')
        await checkAuthAndRedirect()
      }
    })

    // Also poll every 1.5 seconds to catch cross-device verification more quickly
    pollInterval = setInterval(checkAuthAndRedirect, 1500)

    // Initial check
    checkAuthAndRedirect()

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[Signup] Tab focused, re-checking session')
        checkAuthAndRedirect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [showSuccess, checkAuthAndRedirect, supabase])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!acceptedTerms) {
      setMessage({ text: 'You must accept the Terms of Service and Privacy Policy to create an account.', type: 'error' })
      return
    }
    
    setLoading(true)
    setMessage(null)
    localStorage.setItem('forgestudy-pending-email', email.trim())

    // Get plan from localStorage or URL
    const params = new URLSearchParams(window.location.search)
    const plan = params.get('plan') || localStorage.getItem('forgenursing-pending-plan')

    const allowedPlans = [
      'monthly',
      'semester',
      'annual',
      'individual_monthly',
      'individual_annual',
      'family_monthly',
      'family_annual',
    ]

    // Build callback URL with plan parameter if present
    // Use NEXT_PUBLIC_APP_URL to ensure verification works cross-device
    let baseUrl = appUrl
    if (!baseUrl) {
      console.error('[Signup] NEXT_PUBLIC_APP_URL is missing. Email verification will not work cross-device.')
      setMessage({
        text: 'App URL is not configured. Please contact support.',
        type: 'error',
      })
      return
    }

    // Use /auth/callback (not /auth/confirm) to match ForgeNursing flow
    let callbackUrl = `${baseUrl}/auth/callback`
    if (plan && allowedPlans.includes(plan)) {
      callbackUrl += `?plan=${plan}`
    }

    try {
      console.log('[Signup] Attempting to create account...', { email: email.trim() })
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callbackUrl,
        },
      })
      
      if (error) {
        // Log the error for debugging (remove in production if needed)
        console.log('Signup error:', { 
          message: error.message, 
          code: error.code, 
          status: error.status 
        })
        
        // Check if the error is due to email already being registered
        const errorMessage = error.message?.toLowerCase() || ''
        const isEmailExists = 
          errorMessage.includes('user already registered') ||
          errorMessage.includes('email already registered') ||
          errorMessage.includes('already been registered') ||
          errorMessage.includes('already exists') ||
          errorMessage.includes('user with this email address has already been registered') ||
          error.code === 'signup_disabled' ||
          error.status === 422 || // Unprocessable Entity often means duplicate
          (error.status === 400 && errorMessage.includes('already'))
        
        if (isEmailExists) {
          console.log('[Signup] Email already registered, redirecting to /login?redirect=/profiles')
          router.replace('/login?redirect=/profiles')
          return
        }
        
        // For other errors, show the error message
        throw error
      }
      
      // Check if user was actually created
      // Supabase may return success but not create a user if email already exists
      // In this case, data.user will be null
      if (!data.user) {
        // Log for debugging
        console.log('Signup returned no user:', { 
          hasUser: !!data.user, 
          hasSession: !!data.session 
        })
        console.log('[Signup] No user returned, redirecting to /login?redirect=/profiles')
        router.replace('/login?redirect=/profiles')
        return
      }
      
      // Check if user exists but is unverified (no session)
      // This happens when user signed up before but never verified
      // Supabase logs this as "user_repeated_signup" and WILL send a new email
      if (data.user && !data.session) {
        console.log('User exists but unverified (repeated signup detected)', {
          userId: data.user.id,
          email: data.user.email,
          emailConfirmed: data.user.email_confirmed_at
        })

        // Email confirmation required: show success state and wait for verification
        setShowSuccess(true)
        setIsVerifying(true)
        setMessage({ 
          text: "Check your email for the confirmation link. Once verified, we'll send you to checkout.", 
          type: 'success' 
        })
        return
      }

      console.log('[Signup] Signup successful, redirecting to /checkout')
      router.replace('/checkout')
    } catch (error: any) {
      // Handle other errors
      const errorMessage = error.message || 'An error occurred. Please try again.'
      setMessage({ text: errorMessage, type: 'error' })
    } finally {
      console.log('[Signup] Signup flow complete, stopping loader')
      setLoading(false)
    }
  }

  const handleResendEmail = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    console.log('Resend button clicked, email:', email)
    
    if (!email) {
      console.error('No email available for resend')
      setMessage({ 
        text: 'Email address not found. Please try signing up again.', 
        type: 'error' 
      })
      return
    }
    
    setResending(true)
    setMessage(null)
    
    // Get plan from localStorage
    const plan = localStorage.getItem('forgenursing-pending-plan')
    console.log('Resending email with plan:', plan)
    
    // Build callback URL with plan parameter if present
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    
    // Ensure baseUrl has a protocol
    if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      const protocol = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') ? 'http://' : 'https://'
      baseUrl = `${protocol}${baseUrl}`
    }
    
    let callbackUrl = `${baseUrl}/auth/callback`
    if (plan && (plan === 'monthly' || plan === 'semester' || plan === 'annual')) {
      callbackUrl += `?plan=${plan}`
    }

    try {
      console.log('Calling supabase.auth.resend with:', { email, callbackUrl })
      
      const { data: resendData, error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: callbackUrl,
        },
      })
      
      console.log('Manual resend result:', { 
        resendData: JSON.stringify(resendData, null, 2), 
        resendError: resendError ? {
          message: resendError.message,
          status: resendError.status,
          code: resendError.code
        } : null
      })
      
      if (resendError) {
        console.error('Error resending verification email:', resendError)
        const errorMsg = resendError.message?.toLowerCase() || ''
        if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
          setMessage({ 
            text: `Email was recently sent. Please wait a few minutes before requesting another.`, 
            type: 'error' 
          })
        } else {
          setMessage({ 
            text: `Failed to resend email: ${resendError.message || 'Unknown error'}. Please check your spam folder or try signing in.`, 
            type: 'error' 
          })
        }
      } else {
        console.log('Email resend API call successful!', resendData)
        // Note: Supabase resend() returns void on success, so if there's no error, 
        // the email should be queued for delivery
        setMessage({ 
          text: "Verification email has been sent! Please check your inbox (including spam). If you don't receive it within a few minutes, the email service may be experiencing delays.", 
          type: 'success' 
        })
      }
    } catch (error: any) {
      console.error('Unexpected error resending email:', error)
      const errorMessage = error?.message || error?.toString() || 'Unknown error'
      setMessage({ 
        text: `An error occurred: ${errorMessage}. Please try again or contact support.`, 
        type: 'error' 
      })
    } finally {
      console.log('Resend function finished, setting resending to false')
      setResending(false)
    }
  }

  if (showSuccess) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-slate-950">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[calc(100dvh-4rem)]">
          {/* Left Column */}
          <div className="bg-slate-900 md:border-r border-slate-800 flex flex-col justify-center items-center h-full px-8 text-center">
            <div className="max-w-md space-y-6">
              <div className="w-16 h-16 bg-indigo-600/20 rounded-xl flex items-center justify-center mx-auto">
                <MessageSquare className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-100 leading-tight">
                Unlock their cognitive potential.
              </h2>
              <p className="text-base text-slate-400 leading-relaxed">
                The AI tutor that refuses to cheat.
              </p>
            </div>
          </div>

          {/* Right Column - Success State */}
          <div className="bg-slate-950 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
              <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
                {isVerifying && message?.text.includes('Email verified') ? (
                  <>
                    <div className="w-20 h-20 bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-green-400" />
                    </div>
                    <h1 className="text-2xl font-semibold text-slate-100 mb-3">
                      Email verified!
                    </h1>
                    <p className="text-base text-slate-400 mb-6">
                      Redirecting you now...
                    </p>
                    <div className="flex justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Mail className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-semibold text-slate-100 mb-3">
                      Check your email to continue
                    </h1>
                    <div className="inline-flex items-center justify-center px-3 py-1 bg-amber-900/20 border border-amber-700/50 rounded-full text-xs font-semibold text-amber-400 mb-3">
                      Verify to continue to checkout
                    </div>
                    <p className="text-base text-slate-400 mb-2">
                      Verify your email to unlock checkout. We sent a confirmation link to
                    </p>
                    <p className="text-base font-semibold text-indigo-400 mb-6 break-all">
                      {email}
                    </p>
                    <div className="bg-indigo-900/20 border border-indigo-700/50 rounded-xl p-4 mb-6 text-left">
                      <div className="space-y-2 text-sm text-slate-300">
                        <div className="flex items-start gap-2">
                          <span className="text-indigo-400 mt-0.5">•</span>
                          <span>Check your Spam/Junk folder if you don't see it</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-indigo-400 mt-0.5">•</span>
                          <span>Click the confirmation link (on any device)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-indigo-400 mt-0.5">•</span>
                          <span>This page will automatically refresh when verified</span>
                        </div>
                      </div>
                    </div>
                    {message && (
                      <div className={`p-4 text-sm rounded-xl mb-4 ${
                        message.type === 'error' 
                          ? 'bg-red-900/20 text-red-400 border border-red-700/50' 
                          : 'bg-green-900/20 text-green-400 border border-green-700/50'
                      }`}>
                        {message.text}
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-4">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                      <span>Waiting for verification, then sending you to checkout...</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          await checkAuthAndRedirect()
                          const storedEmail = localStorage.getItem('forgestudy-pending-email')
                          const loginUrl = new URL('/login', window.location.origin)
                          loginUrl.searchParams.set('verified', 'true')
                          loginUrl.searchParams.set('redirect', '/checkout')
                          if (storedEmail) {
                            loginUrl.searchParams.set('email', storedEmail)
                          }
                          window.location.assign(loginUrl.toString())
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                      >
                        <Loader2 className="h-4 w-4" />
                        Refresh after verification
                      </button>
                      <div className="text-xs text-slate-500 text-center">
                        If you verified on another device, reopen this page to finish checkout.
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleResendEmail(e)
                        }}
                        disabled={resending}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-none"
                      >
                        {resending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4" />
                            Resend Verification Email
                          </>
                        )}
                      </button>
                      {appUrl && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                          <p className="text-xs font-semibold text-slate-300 mb-2">
                            Open ForgeStudy on your phone
                          </p>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(appUrl)}`}
                            alt="ForgeStudy QR code"
                            className="mx-auto rounded-lg border border-slate-700 bg-white p-2"
                          />
                          <p className="text-[11px] text-slate-500 mt-2">
                            Scan to open the verification flow on mobile.
                          </p>
                        </div>
                      )}
                      <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-4 py-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                      >
                        Back to Sign In
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-950">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[calc(100dvh-4rem)]">
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
                  <Sparkles className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <div className="font-semibold text-slate-100 text-base mb-1">Visualized Mastery</div>
                  <div className="text-sm text-slate-400">Watch their knowledge grow into a connected universe.</div>
                </div>
              </div>
              <div className="flex items-start gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-indigo-400" />
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

        {/* Right Column - Auth Form */}
        <div className="bg-slate-950 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 order-1 md:order-2">
          <div className="w-full max-w-md">
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
              {/* Header */}
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600/20 rounded-xl mb-4">
                  <Sparkles className="w-7 h-7 text-indigo-400" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-100 mb-2">
                  Start your free preview
                </h1>
                <p className="text-sm text-slate-400">
                  Get set up in minutes. Built for Grades 6–12.
                </p>
              </div>

              {/* Form */}
              {!appUrl && (
                <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-4 text-left mb-6">
                  <p className="text-sm font-semibold text-amber-400 mb-1">
                    Configure your app URL
                  </p>
                  <p className="text-xs text-amber-500">
                    Set <code className="font-semibold">NEXT_PUBLIC_APP_URL</code> so email verification works on all devices.
                  </p>
                </div>
              )}
              <form onSubmit={handleSignup} className="space-y-4 sm:space-y-5">
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input
                      type="password"
                      placeholder="Create a password"
                      className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Use at least 8 characters for your password.
                    </p>
                  </div>
                </div>

                {message && (
                  <div className={`p-4 text-sm rounded-xl ${
                    message.type === 'error' 
                      ? 'bg-red-900/20 text-red-400 border border-red-700/50' 
                      : message.type === 'info'
                      ? 'bg-blue-900/20 text-blue-400 border border-blue-700/50'
                      : 'bg-green-900/20 text-green-400 border border-green-700/50'
                  }`}>
                    <div className="flex flex-col gap-2">
                      <span>{message.text}</span>
                      {message.type === 'error' && message.text.includes('already registered') && (
                        <Link
                          href="/login"
                          className="inline-flex items-center gap-1 text-sm font-medium text-red-400 hover:text-red-300 underline mt-1"
                        >
                          Go to Sign In
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email || !password || !acceptedTerms || !appUrl}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-none min-h-[44px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
                
                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-600 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer bg-slate-950"
                      required
                    />
                    <span className="text-xs text-slate-400 leading-relaxed">
                      I agree to the{' '}
                      <Link href="/terms" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline font-medium">
                        Terms of Service
                      </Link>
                      {' '}and{' '}
                      <Link href="/privacy" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline font-medium">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  <p className="text-xs text-slate-500 text-center">
                    Cancel anytime during your free preview • 7-day free trial included
                  </p>
                </div>
              </form>

              {/* Toggle */}
              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-800 text-center">
                <span className="text-sm text-slate-400">
                  Already have an account?{' '}
                </span>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

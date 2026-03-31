'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { Lock, Mail, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'

type Status = 'verifying' | 'request' | 'ready' | 'expired' | 'done'

export default function ResetPasswordClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowser(), [])
  const hasVerified = useRef(false)

  // Determine initial status synchronously from URL params
  const tokenHash = searchParams.get('token_hash')
  const hasToken = !!(tokenHash && searchParams.get('type') === 'recovery')
  const verified = searchParams.get('verified') === 'true' // Set by /auth/confirm after server-side OTP
  const urlError = searchParams.get('error')

  const [status, setStatus] = useState<Status>(() => {
    if (verified) return 'ready' // Server already verified — show password form
    if (urlError === 'expired_link' || urlError === 'invalid_link') return 'expired'
    if (hasToken) return 'verifying' // Client-side verification needed
    return 'request' // No token — show email form
  })

  const [email, setEmail] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(() => {
    if (urlError === 'expired_link') return { text: 'This reset link has expired or is invalid.', type: 'error' }
    if (urlError === 'invalid_link') return { text: 'Invalid reset link. Please request a new one.', type: 'error' }
    return null
  })

  // Client-side OTP verification — only when token_hash is in URL (direct link, not via /auth/confirm)
  useEffect(() => {
    if (!hasToken || hasVerified.current || verified) return
    hasVerified.current = true

    console.log('[Reset Password] Verifying OTP token_hash client-side...')
    supabase.auth.verifyOtp({ token_hash: tokenHash!, type: 'recovery' })
      .then(({ error }: { error: any }) => {
        if (error) {
          console.error('[Reset Password] verifyOtp failed:', error.message)
          setMessage({ text: 'This reset link has expired or is invalid.', type: 'error' })
          setStatus('expired')
        } else {
          console.log('[Reset Password] verifyOtp succeeded — showing password form')
          setStatus('ready')
        }
      })
  }, [hasToken, tokenHash, supabase, verified])

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendingEmail(true)
    setMessage(null)

    try {
      const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://www.forgestudyai.com'
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/confirm?next=/reset-password`,
      })
      if (error) {
        setMessage({ text: error.message, type: 'error' })
      } else {
        setMessage({ text: 'Check your email for a password reset link.', type: 'success' })
      }
    } catch {
      setMessage({ text: 'Something went wrong. Please try again.', type: 'error' })
    } finally {
      setSendingEmail(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (password.length < 8) {
      setMessage({ text: 'Password must be at least 8 characters.', type: 'error' })
      return
    }
    if (password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match.', type: 'error' })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setMessage({ text: error.message, type: 'error' })
        return
      }
      setMessage({ text: 'Password updated! Redirecting to sign in...', type: 'success' })
      setStatus('done')
      setTimeout(() => router.push('/login'), 2000)
    } catch {
      setMessage({ text: 'Something went wrong. Please try again.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const showEmailForm = status === 'request' || status === 'expired'
  const showPasswordForm = status === 'ready' || status === 'done'
  const Icon = showPasswordForm ? Lock : Mail

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100dvh-4rem)]">
        <div className="hidden lg:flex bg-gradient-to-br from-slate-50 to-white border-r border-slate-200 flex-col justify-center items-center h-full px-8 text-center">
          <div className="max-w-md space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center mx-auto shadow-lg">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {showPasswordForm ? 'Set a new password' : 'Reset your password'}
            </h2>
            <p className="text-base text-slate-600">
              {showPasswordForm ? 'Use a strong password you can remember.' : "We'll send you a link to create a new password."}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 bg-white">
          <div className="w-full max-w-md">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg">
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl mb-4 shadow-lg shadow-teal-500/25">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">
                  {showPasswordForm ? 'Create a new password' : 'Forgot your password?'}
                </h1>
                <p className="text-sm text-slate-600">
                  {showPasswordForm ? 'Enter a new password for your account.' : 'Enter your email to receive a reset link.'}
                </p>
              </div>

              {/* Verifying spinner */}
              {status === 'verifying' && (
                <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Verifying reset link...</span>
                </div>
              )}

              {/* Messages */}
              {message && status !== 'verifying' && (
                <div className={`p-4 text-sm rounded-xl mb-4 ${
                  message.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {message.text}
                  {status === 'expired' && (
                    <> <Link href="/reset-password" className="underline font-medium">Request a new link</Link>.</>
                  )}
                </div>
              )}

              {/* Email request form */}
              {showEmailForm && (
                <form onSubmit={handleSendResetEmail} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="email" placeholder="Enter your email" required
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <button type="submit" disabled={sendingEmail || !email}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-base font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
                    {sendingEmail ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending...</> : <>Send reset link <ArrowRight className="h-5 w-5" /></>}
                  </button>
                </form>
              )}

              {/* Set password form */}
              {showPasswordForm && (
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'} placeholder="New password" required minLength={8}
                      className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'} placeholder="Confirm new password" required minLength={8}
                      className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <button type="submit" disabled={loading || status === 'done'}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-base font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
                    {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Updating...</> : <>Update password <ArrowRight className="h-5 w-5" /></>}
                  </button>
                </form>
              )}

              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                  Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

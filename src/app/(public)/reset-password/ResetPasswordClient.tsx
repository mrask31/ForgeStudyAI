'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Lock, ArrowRight, Loader2 } from 'lucide-react'

export default function ResetPasswordClient() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  const supabase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration is missing.')
    }
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)
    }
    checkSession()
  }, [supabase])

  const handlePasswordReset = async (e: React.FormEvent) => {
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
      setMessage({ text: 'Password updated! You can now sign in.', type: 'success' })
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('[Reset Password] Error updating password:', err)
      setMessage({ text: 'Something went wrong. Please try again.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100dvh-4rem)]">
        <div className="hidden lg:flex bg-gradient-to-br from-slate-50 to-white border-r border-slate-200 flex flex-col justify-center items-center h-full px-8 text-center">
          <div className="max-w-md space-y-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center mx-auto shadow-lg">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                Set a new password
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Use a strong password you can remember.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 bg-white">
          <div className="w-full max-w-md">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg">
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl mb-4 shadow-lg shadow-teal-500/25">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">
                  Create a new password
                </h1>
                <p className="text-sm text-slate-600">
                  Enter a new password for your account.
                </p>
              </div>

              {hasSession === false && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-4">
                  Your reset link has expired. Please request a new password reset.
                </div>
              )}

              {message && (
                <div className={`p-4 text-sm rounded-xl mb-4 ${
                  message.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    placeholder="New password"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || hasSession === false}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-base font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-500/30 hover:shadow-lg hover:shadow-teal-500/40"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      Update password
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

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

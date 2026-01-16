 'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Lock, ArrowRight, Loader2 } from 'lucide-react'

export default function ResetPasswordPage() {
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

  const handleUpdate = async (e: React.FormEvent) => {
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
        setMessage({ text: error.message || 'Failed to update password.', type: 'error' })
        return
      }
      setMessage({ text: 'Password updated. You can sign in now.', type: 'success' })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong.'
      setMessage({ text: errorMessage, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (hasSession === false) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Reset link expired</h1>
          <p className="text-sm text-slate-600 mb-6">
            Please request a new password reset email.
          </p>
          <Link
            href="/reset"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-700 to-teal-600 text-white rounded-xl text-base font-semibold hover:from-teal-800 hover:to-teal-700 transition-all shadow-md shadow-teal-500/30 hover:shadow-lg hover:shadow-teal-500/40"
          >
            Request new link
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2 text-center">
            Create a new password
          </h1>
          <p className="text-sm text-slate-600 mb-6 text-center">
            Choose a secure password to finish resetting your account.
          </p>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                placeholder="New password"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
              />
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
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-700 to-teal-600 text-white rounded-xl text-base font-bold hover:from-teal-800 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-500/30 hover:shadow-lg hover:shadow-teal-500/40 min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Updating…
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
            <Link
              href="/login"
              className="text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

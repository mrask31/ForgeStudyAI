 'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Mail, ArrowRight, Loader2 } from 'lucide-react'

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  const supabase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration is missing.')
    }
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }, [])

  const normalizeAppUrl = (url?: string | null) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    const protocol = url.includes('localhost') || url.includes('127.0.0.1') ? 'http://' : 'https://'
    return `${protocol}${url}`
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const appUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL)
      if (!appUrl) {
        setMessage({ text: 'App URL is not configured. Please contact support.', type: 'error' })
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${appUrl}/auth/reset`,
      })

      if (error) {
        setMessage({ text: error.message || 'Failed to send reset email.', type: 'error' })
        return
      }

      setMessage({
        text: 'Check your email for a password reset link.',
        type: 'success',
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong.'
      setMessage({ text: errorMessage, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg">
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2 text-center">
            Reset your password
          </h1>
          <p className="text-sm text-slate-600 mb-6 text-center">
            We’ll email you a secure link to create a new password.
          </p>

          <form onSubmit={handleReset} className="space-y-4">
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
              disabled={loading || !email}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-700 to-teal-600 text-white rounded-xl text-base font-bold hover:from-teal-800 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-500/30 hover:shadow-lg hover:shadow-teal-500/40 min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  Send reset link
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

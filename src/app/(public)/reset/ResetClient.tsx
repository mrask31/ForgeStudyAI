'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Mail, ArrowRight, Loader2 } from 'lucide-react'

export default function ResetClient() {
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

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setMessage({ text: error.message, type: 'error' })
        return
      }

      setMessage({
        text: 'Check your email for a password reset link.',
        type: 'success',
      })
    } catch (err) {
      console.error('[Reset] Error sending reset email:', err)
      setMessage({
        text: 'Something went wrong. Please try again.',
        type: 'error',
      })
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
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                Reset your password
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                We’ll send you a link to create a new password.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 bg-white">
          <div className="w-full max-w-md">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg">
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl mb-4 shadow-lg shadow-teal-500/25">
                  <Mail className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">
                  Forgot your password?
                </h1>
                <p className="text-sm text-slate-600">
                  Enter your email to receive a reset link.
                </p>
              </div>

              {message && (
                <div className={`p-4 text-sm rounded-xl mb-4 ${
                  message.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {message.text}
                </div>
              )}

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

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-base font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-500/30 hover:shadow-lg hover:shadow-teal-500/40"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
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

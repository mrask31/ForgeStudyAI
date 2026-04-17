'use client'

import { useState, useEffect, useMemo } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react'

export function FoundingSignupForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slotsRemaining, setSlotsRemaining] = useState<number | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowser(), [])

  useEffect(() => {
    async function fetchSlots() {
      const { data } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'founding_slots_remaining')
        .single()
      if (data) {
        setSlotsRemaining(typeof data.value === 'number' ? data.value : Number(data.value))
      }
    }
    fetchSlots()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: name },
        },
      })

      if (authError) {
        if (authError.message.includes('already') || authError.status === 422) {
          router.replace('/login?redirect=/profiles')
          return
        }
        throw authError
      }

      if (!authData.user) {
        throw new Error('Signup failed — no user returned')
      }

      // 2. Claim founding slot via RPC
      const { data: rpcResult, error: rpcError } = await supabase.rpc('claim_founding_slot', {
        p_user_id: authData.user.id,
      })

      if (rpcError) {
        console.error('[Founding] RPC error:', rpcError)
        throw new Error('Failed to claim founding slot')
      }

      const result = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult

      if (!result?.success) {
        // Slots full — redirect to standard signup
        router.replace('/signup?founding=full')
        return
      }

      // 3. Schedule founding welcome email
      try {
        await supabase.from('email_events').insert({
          user_id: authData.user.id,
          template_slug: 'founding_day_1',
          status: 'queued',
          scheduled_for: new Date().toISOString(),
          metadata: {
            parent_first_name: name,
            slot_number: result.slot_number,
            email,
          },
        })
      } catch {
        // Don't fail signup if email scheduling fails
        console.error('[Founding] Email scheduling failed')
      }

      // 4. Redirect to app with welcome context
      router.replace(`/app?welcome=founding&slot=${result.slot_number}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {slotsRemaining !== null && slotsRemaining <= 5 && slotsRemaining > 0 && (
        <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 text-center">
          <p className="text-amber-300 text-sm font-medium">
            Only {slotsRemaining} spot{slotsRemaining !== 1 ? 's' : ''} remaining!
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Your first name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full pl-10 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <button
        type="submit"
        disabled={loading || !name || !email || !password}
        className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Claiming your spot...
          </>
        ) : (
          'Claim Your Founding Spot →'
        )}
      </button>

      <p className="text-xs text-slate-500 text-center">
        No credit card required. 90 days free. Cancel anytime.
      </p>
    </form>
  )
}

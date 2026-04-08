'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { getSupabaseBrowser } from '@/lib/supabase/client'

interface BetaBannerProps {
  userId?: string
}

/**
 * Shows trial/beta countdown on the home screen for non-subscribed users.
 * Hidden for subscribed users.
 */
export function BetaBanner({ userId }: BetaBannerProps) {
  const supabase = useMemo(() => getSupabaseBrowser(), [])
  const [status, setStatus] = useState<{
    type: 'beta' | 'trial' | 'subscribed' | null
    daysRemaining: number
  } | null>(null)

  useEffect(() => {
    if (!userId) return

    async function checkStatus() {
      // Check beta_access
      const { data: access } = await supabase
        .from('beta_access')
        .select('is_beta, beta_expires_at, trial_expires_at')
        .eq('user_id', userId)
        .single()

      if (access?.is_beta && access.beta_expires_at) {
        const days = Math.ceil((new Date(access.beta_expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        if (days > 0) {
          setStatus({ type: 'beta', daysRemaining: days })
          return
        }
      }

      if (!access?.is_beta && access?.trial_expires_at) {
        const days = Math.ceil((new Date(access.trial_expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        if (days > 0) {
          setStatus({ type: 'trial', daysRemaining: days })
          return
        }
      }

      // Check if subscribed
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', userId)
        .single()

      if (profile?.subscription_status === 'active') {
        setStatus({ type: 'subscribed', daysRemaining: 0 })
      } else {
        setStatus(null)
      }
    }

    checkStatus()
  }, [userId, supabase])

  if (!status || status.type === 'subscribed') return null

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl mb-4">
      <span className="text-xs text-indigo-300 font-medium">
        {status.type === 'beta'
          ? `🎓 Beta member — ${status.daysRemaining} day${status.daysRemaining !== 1 ? 's' : ''} remaining`
          : `🎓 Beta trial — ${status.daysRemaining} day${status.daysRemaining !== 1 ? 's' : ''} remaining`}
      </span>
      {status.type === 'trial' && (
        <Link
          href="/checkout"
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
        >
          Upgrade now
        </Link>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowser } from '@/lib/supabase/client'

export function FoundingFamiliesBanner() {
  const [slotsRemaining, setSlotsRemaining] = useState<number | null>(null)

  useEffect(() => {
    async function fetchSlots() {
      try {
        const supabase = getSupabaseBrowser()
        const { data, error } = await supabase
          .from('config')
          .select('value')
          .eq('key', 'founding_slots_remaining')
          .single()
        if (!error && data) {
          setSlotsRemaining(typeof data.value === 'number' ? data.value : Number(data.value))
        }
      } catch {
        // Silently fail — banner just won't show
      }
    }
    fetchSlots()
    const interval = setInterval(fetchSlots, 60000)
    return () => clearInterval(interval)
  }, [])

  if (slotsRemaining === null || slotsRemaining <= 0) {
    if (slotsRemaining === 0) {
      return (
        <div className="w-full bg-slate-800 border-b border-slate-700 py-2 px-4 text-center">
          <span className="text-sm text-slate-400">
            Founding Families is full —{' '}
            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 underline">
              start your 14-day free trial →
            </Link>
          </span>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full bg-gradient-to-r from-amber-600 to-orange-600 py-3 px-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="text-center sm:text-left">
          <p className="text-white text-sm font-medium">
            🚀 Founding Families: 90 days free for the first 20 parents.
          </p>
          <p className="text-amber-100 text-xs">
            No credit card. Shape a product built for kids, not advertisers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-bold">
            {slotsRemaining} of 20 left
          </span>
          <Link
            href="/founding"
            className="px-4 py-1.5 bg-white text-amber-700 rounded-lg text-sm font-semibold hover:bg-amber-50 transition-colors"
          >
            Claim Your Spot →
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * Full-width beta banner for the public landing page.
 * Shows remaining spots or waitlist if full.
 */
export function LandingBetaBanner() {
  const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/beta')
      .then(res => res.json())
      .then(data => setSpotsRemaining(data.spotsRemaining ?? 0))
      .catch(() => setSpotsRemaining(null))
  }, [])

  if (spotsRemaining === null) return null

  if (spotsRemaining === 0) {
    return (
      <div className="w-full bg-[#08080F] border-b border-slate-800 py-3 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-3 text-center">
          <span className="text-sm text-slate-300">
            🎓 Beta is full — join the waitlist
          </span>
          <Link
            href="/signup"
            className="px-4 py-1.5 bg-[#c9a96e] text-[#08080F] rounded-lg text-xs font-bold hover:bg-[#d4b87a] transition-colors"
          >
            Join waitlist →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-[#08080F] border-b border-slate-800 py-3 px-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
        <span className="text-sm text-slate-200">
          {spotsRemaining <= 5 ? '⚡' : '🎓'} Free Beta — <span className="text-[#c9a96e] font-bold">{spotsRemaining}</span> spot{spotsRemaining !== 1 ? 's' : ''} remaining out of 20
        </span>
        <span className="text-xs text-slate-500 hidden sm:inline">
          Get 90 days free while spots last. No credit card required.
        </span>
        <Link
          href="/signup"
          className="px-4 py-1.5 bg-[#c9a96e] text-[#08080F] rounded-lg text-xs font-bold hover:bg-[#d4b87a] transition-colors"
        >
          Claim your spot →
        </Link>
      </div>
    </div>
  )
}

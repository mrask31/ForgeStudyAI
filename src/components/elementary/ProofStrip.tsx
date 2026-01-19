'use client'

import { useEffect, useState } from 'react'

type Mode = 'spelling' | 'reading' | 'homework'

interface ProofStripProps {
  profileId: string
  mode: Mode
}

export default function ProofStrip({ profileId, mode }: ProofStripProps) {
  const [streak, setStreak] = useState(0)
  const [timeToday, setTimeToday] = useState(0)
  const [proof, setProof] = useState<Record<string, number>>({})

  useEffect(() => {
    const loadSummary = async () => {
      const response = await fetch(`/api/elementary/summary?profileId=${profileId}&mode=${mode}`)
      if (!response.ok) return
      const payload = await response.json()
      setStreak(payload?.streak || 0)
      setTimeToday(payload?.timeToday || 0)
      setProof(payload?.proof || {})
    }
    loadSummary()
  }, [profileId, mode])

  const minutes = Math.max(1, Math.round(timeToday / 60))

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-xs text-slate-500">Streak</p>
        <p className="text-lg font-semibold text-slate-900">{streak} days</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-xs text-slate-500">Time today</p>
        <p className="text-lg font-semibold text-slate-900">{minutes} min</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-xs text-slate-500">{mode === 'homework' ? 'Completed' : 'Mastered'}</p>
        <p className="text-lg font-semibold text-slate-900">
          {mode === 'homework' ? proof.completed || 0 : proof.mastered || proof.passages || 0}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-xs text-slate-500">Review</p>
        <p className="text-lg font-semibold text-slate-900">
          {mode === 'homework' ? proof.pending || 0 : proof.review || proof.checks || 0}
        </p>
      </div>
    </div>
  )
}

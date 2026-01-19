'use client'

import { useEffect, useMemo, useState } from 'react'

type Mode = 'spelling' | 'reading' | 'homework'

const MISSION_STEPS: Record<Mode, string[]> = {
  spelling: ['Learn 5 words', 'Quick check', 'Save missed words for tomorrow'],
  reading: ['Read a short passage', 'Answer 2–3 questions', 'Summarize in one sentence'],
  homework: ['List what is due', 'Pick the first task', 'Start one small step'],
}

const MISSION_PROMPTS: Record<Mode, string> = {
  spelling: 'Give me 5 spelling words and a quick check.',
  reading: 'Give me a short passage and 3 questions.',
  homework: 'Help me plan my homework steps for tonight.',
}

interface MissionPanelProps {
  profileId: string
  mode: Mode
  onStart: (prompt: string) => void
}

export default function MissionPanel({ profileId, mode, onStart }: MissionPanelProps) {
  const [missionId, setMissionId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('active')
  const [streak, setStreak] = useState(0)
  const [timeSpent, setTimeSpent] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const steps = MISSION_STEPS[mode]

  useEffect(() => {
    const loadMission = async () => {
      const response = await fetch(`/api/elementary/missions?profileId=${profileId}&mode=${mode}`)
      if (!response.ok) return
      const payload = await response.json()
      setMissionId(payload?.mission?.id || null)
      setStatus(payload?.mission?.status || 'active')
      setTimeSpent(payload?.mission?.time_spent_seconds || 0)
      setStreak(payload?.streak || 0)
    }
    loadMission()
  }, [profileId, mode])

  const totalMinutes = useMemo(() => Math.max(1, Math.round(timeSpent / 60)), [timeSpent])

  const handleStart = () => {
    if (!startedAt) {
      setStartedAt(Date.now())
    }
    onStart(MISSION_PROMPTS[mode])
  }

  const handleComplete = async () => {
    if (!missionId) return
    const elapsed = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0
    const response = await fetch('/api/elementary/missions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        missionId,
        status: 'completed',
        timeSpentSeconds: timeSpent + elapsed,
      }),
    })
    if (!response.ok) return
    const payload = await response.json()
    setStatus(payload?.mission?.status || 'completed')
    setTimeSpent(payload?.mission?.time_spent_seconds || timeSpent + elapsed)
    setStartedAt(null)
  }

  return (
    <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Today’s Mission (5 minutes)</p>
          <h3 className="text-lg font-semibold text-slate-900 mt-1">Small steps, big wins.</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Streak</p>
          <p className="text-lg font-semibold text-slate-900">{streak} days</p>
        </div>
      </div>
      <ol className="mt-4 space-y-2 text-sm text-slate-700">
        {steps.map((step) => (
          <li key={step} className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">•</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleStart}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          Start mission
        </button>
        <button
          type="button"
          onClick={handleComplete}
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          {status === 'completed' ? 'Completed' : 'Mark complete'}
        </button>
        <span className="ml-auto text-xs text-slate-500">Time today: {totalMinutes} min</span>
      </div>
    </div>
  )
}

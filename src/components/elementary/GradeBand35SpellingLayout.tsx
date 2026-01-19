'use client'

import { useEffect, useMemo, useState } from 'react'
import MissionPanel from '@/components/elementary/MissionPanel'
import ProofStrip from '@/components/elementary/ProofStrip'
import SpellingEnginePanel from '@/components/elementary/SpellingEnginePanel'

interface GradeBand35SpellingLayoutProps {
  profileId: string
  hasSession: boolean
  onStartSession: (prompt: string) => void
}

type Step = 1 | 2 | 3

export default function GradeBand35SpellingLayout({
  profileId,
  hasSession,
  onStartSession,
}: GradeBand35SpellingLayoutProps) {
  const [hasList, setHasList] = useState(false)
  const [manualStep, setManualStep] = useState<Step | null>(null)

  const derivedStep = useMemo<Step>(() => {
    if (hasSession) return 3
    if (hasList) return 2
    return 1
  }, [hasSession, hasList])

  const step = manualStep ?? derivedStep

  useEffect(() => {
    if (hasSession) {
      setManualStep(null)
    }
  }, [hasSession])

  const handleChangeWords = () => {
    setManualStep(1)
  }

  const handleStartMission = (prompt: string) => {
    setManualStep(null)
    onStartSession(prompt)
  }

  return (
    <div className="w-full max-w-2xl text-left space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Spelling Coach</p>
        <h2 className="text-2xl font-semibold text-slate-900 mt-2">Let’s practice spelling.</h2>
        <p className="text-sm text-slate-600 mt-2">One step at a time, then a quick win.</p>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Choose your words</h3>
            <SpellingEnginePanel
              profileId={profileId}
              onStartSession={onStartSession}
              onListStatusChange={({ hasList: nextHasList }) => setHasList(nextHasList)}
              showContinueCard={hasList}
              showEnterList
              showUseLastListButton={hasList}
              showWordGroups={false}
              showPracticeModes={false}
              startButtonLabel="Start (5 words)"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <MissionPanel profileId={profileId} mode="spelling" onStart={handleStartMission} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleChangeWords}
              className="text-sm text-emerald-700 hover:underline"
            >
              Change words
            </button>
          </div>
          <ProofStrip profileId={profileId} mode="spelling" onStartSession={onStartSession} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Practice in progress</p>
            <p className="text-xs text-slate-500">Keep going until the quick check is done.</p>
          </div>
          <ProofStrip profileId={profileId} mode="spelling" onStartSession={onStartSession} />
        </div>
      )}

      {step >= 2 && (
        <SpellingEnginePanel
          profileId={profileId}
          onStartSession={onStartSession}
          onListStatusChange={({ hasList: nextHasList }) => setHasList(nextHasList)}
          showContinueCard={false}
          showEnterList={false}
          showWordGroups
          showPracticeModes
          wordGroupsLabel="Word groups (tap to see)"
          practiceModesTitle="Want to do more?"
          practiceModesDescription="Extra practice options if you want another round."
        />
      )}
    </div>
  )
}

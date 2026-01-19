'use client'

import ProofStrip from '@/components/elementary/ProofStrip'
import SpellingEnginePanel from '@/components/elementary/SpellingEnginePanel'

interface GradeBand35SpellingLayoutProps {
  profileId: string
  hasSession: boolean
  onStartSession: (prompt: string) => void
}

export default function GradeBand35SpellingLayout({
  profileId,
  onStartSession,
}: GradeBand35SpellingLayoutProps) {
  return (
    <div className="w-full max-w-3xl text-left space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Spelling Coach</p>
        <h2 className="text-2xl font-semibold text-slate-900 mt-2">Let’s practice spelling.</h2>
        <p className="text-sm text-slate-600 mt-2">Pick a list to study or create a new one.</p>
      </div>

      <SpellingEnginePanel
        profileId={profileId}
        onStartSession={onStartSession}
        showListLibrary
        showContinueCard={false}
        showUseLastListButton={false}
        showEnterList
        startButtonLabel="Save list"
        showWordGroups
        showPracticeModes
        wordGroupsLabel="Word groups (tap to see)"
        practiceModesTitle="Practice this list"
        practiceModesDescription="Pick a mode to study your selected words."
      />
      <ProofStrip profileId={profileId} mode="spelling" onStartSession={onStartSession} />
    </div>
  )
}

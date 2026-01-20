'use client'

import { useEffect, useMemo, useState } from 'react'
import ProofStrip from '@/components/elementary/ProofStrip'
import ReadingEnginePanel from '@/components/elementary/ReadingEnginePanel'

interface GradeBand35ReadingLayoutProps {
  profileId: string
  hasSession: boolean
  onStartSession: (prompt: string) => void
}

type Step = 1 | 2 | 3

export default function GradeBand35ReadingLayout({
  profileId,
  hasSession,
  onStartSession,
}: GradeBand35ReadingLayoutProps) {
  const [hasPassage, setHasPassage] = useState(false)
  const [passageContent, setPassageContent] = useState<string | null>(null)
  const [passageTitle, setPassageTitle] = useState<string | null>(null)
  const [manualStep, setManualStep] = useState<Step | null>(null)

  const derivedStep = useMemo<Step>(() => {
    if (hasSession) return 3
    if (hasPassage) return 2
    return 1
  }, [hasSession, hasPassage])

  const step = manualStep ?? derivedStep

  useEffect(() => {
    if (hasSession) {
      setManualStep(null)
    }
  }, [hasSession])

  const sendWithPassage = (prompt: string) => {
    if (!passageContent) {
      onStartSession(prompt)
      return
    }
    onStartSession(`${prompt}\n\nPassage:\n${passageContent}`)
  }

  const handleStartMission = () => {
    setManualStep(3)
    sendWithPassage('Let’s start the reading mission. Ask me to read the passage, fix hard words, then ask for the main idea and 2 questions.')
  }

  const handleChangePassage = () => {
    setManualStep(1)
  }

  return (
    <div className="w-full max-w-2xl text-left space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Reading Coach</p>
        <h2 className="text-2xl font-semibold text-slate-900 mt-2">Let’s read together.</h2>
        <p className="text-sm text-slate-600 mt-2">Choose a short passage, then we coach it step-by-step.</p>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          {hasPassage && (
            <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase text-slate-500 font-semibold">Continue last session</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {passageTitle || 'Last saved passage'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => sendWithPassage('Continue with the passage and ask 2 quick questions.')}
                  className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Choose a passage</h3>
            <ReadingEnginePanel
              profileId={profileId}
              onStartSession={onStartSession}
              onPassageStatusChange={({ hasPassage: nextHasPassage, passage }) => {
                setHasPassage(nextHasPassage)
                setPassageContent(passage?.content || null)
                setPassageTitle(passage?.title || null)
              }}
              showContinueCard={false}
              showReadingTools={false}
              showFluencyCoach={false}
              passagePlaceholder="Paste 3–8 sentences"
              saveButtonLabel="Start reading"
              quickStartOptions={[
                {
                  label: 'Give me a short story (Level 1)',
                  prompt: 'Give me a short reading passage for grades 3–5 (Level 1), then wait for me to say I’m ready for questions.',
                },
                {
                  label: 'Give me a short story (Level 2)',
                  prompt: 'Give me a short reading passage for grades 3–5 (Level 2), then wait for me to say I’m ready for questions.',
                },
                {
                  label: 'Give me a short story (Level 3)',
                  prompt: 'Give me a short reading passage for grades 3–5 (Level 3), then wait for me to say I’m ready for questions.',
                },
              ]}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Today’s Reading Mission (5 minutes)</p>
                <h3 className="text-lg font-semibold text-slate-900 mt-1">Let’s do this together.</h3>
              </div>
            </div>
            <ol className="mt-4 space-y-2 text-sm text-slate-700">
              {[
                'Read the passage',
                'Fix hard words',
                'Main idea (one sentence)',
                'Answer 2 questions',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleStartMission}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Start mission
              </button>
              <button
                type="button"
                onClick={handleChangePassage}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Change passage
              </button>
            </div>
          </div>
          <ProofStrip profileId={profileId} mode="reading" onStartSession={onStartSession} showStreak={false} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Coach tools</p>
            <p className="text-xs text-slate-500">Tap a tool to get help right away.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => sendWithPassage('List the 3 hardest words in this passage and help me sound them out.')}
              className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Hard words helper
            </button>
            <button
              type="button"
              onClick={() => sendWithPassage('What is the main idea in ONE sentence? Then ask me to say it back.')}
              className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Main idea
            </button>
            <button
              type="button"
              onClick={() => sendWithPassage('Ask me 2 comprehension questions (1 easy, 1 a bit harder).')}
              className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Ask 2 questions
            </button>
            <button
              type="button"
              onClick={() => sendWithPassage('Pick 2 words and teach them with kid-friendly definitions and example sentences.')}
              className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Vocabulary check
            </button>
          </div>
          <ProofStrip profileId={profileId} mode="reading" onStartSession={onStartSession} showStreak={false} />
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Hard words box</p>
            <p className="text-xs text-slate-500">
              Ask the Hard words helper and we will list the tricky words here.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Nice work!</p>
            <p className="text-xs text-slate-500">Hard words saved for next time.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setManualStep(1)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Finish
              </button>
              <button
                type="button"
                onClick={() => setManualStep(1)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Read another short passage
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

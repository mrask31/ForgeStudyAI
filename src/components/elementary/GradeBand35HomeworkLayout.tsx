'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import HomeworkEnginePanel from '@/components/elementary/HomeworkEnginePanel'

interface GradeBand35HomeworkLayoutProps {
  profileId: string
  hasSession: boolean
  onStartSession: (prompt: string) => void
  helpContent?: ReactNode
}

type Step = 1 | 2 | 3

export default function GradeBand35HomeworkLayout({
  profileId,
  hasSession,
  onStartSession,
  helpContent,
}: GradeBand35HomeworkLayoutProps) {
  const router = useRouter()
  const [hasList, setHasList] = useState(false)
  const [activeTaskTitle, setActiveTaskTitle] = useState<string | null>(null)
  const [manualStep, setManualStep] = useState<Step | null>(null)

  const derivedStep = useMemo<Step>(() => {
    if (hasSession || activeTaskTitle) return 3
    if (hasList) return 2
    return 1
  }, [hasSession, activeTaskTitle, hasList])

  const step = manualStep ?? derivedStep

  useEffect(() => {
    if (hasSession) {
      setManualStep(null)
    }
  }, [hasSession])

  return (
    <div className="w-full max-w-2xl text-left space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Tonight’s Homework Coach</p>
        <h2 className="text-2xl font-semibold text-slate-900 mt-2">Let’s make a simple plan.</h2>
        <p className="text-sm text-slate-600 mt-2">One task, one problem, one win.</p>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <HomeworkEnginePanel
            profileId={profileId}
            onStartSession={onStartSession}
            onListStatusChange={({ hasList: nextHasList }) => setHasList(nextHasList)}
            showContinueCard={false}
            showListInput
            showTaskPicker={false}
            showStepsPanel={false}
            listTitle="Tonight’s list"
            listHelperText="Add tasks or paste directions. Keep it simple."
            listPlaceholder="Paste directions or one problem."
            primaryListButtonLabel="Make my plan"
            primaryListMode="plan"
            showQuickAddRow
            showTaskChecklist
          />
          <button
            type="button"
            onClick={() => router.push('/classes')}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Upload a worksheet (from Uploads)
          </button>
        </div>
      )}

      {step === 2 && (
        <HomeworkEnginePanel
          profileId={profileId}
          onStartSession={onStartSession}
          onListStatusChange={({ hasList: nextHasList }) => setHasList(nextHasList)}
          onActiveTaskChange={(task) => setActiveTaskTitle(task?.title || null)}
          showContinueCard={false}
          showListInput={false}
          showTaskPicker
          showStepsPanel={false}
          taskPickerTitle="Pick the first task"
          taskPickerMode="coach"
        />
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">We are doing: {activeTaskTitle || 'Your first task'}</p>
            <p className="text-xs text-slate-500">Step: 1 of 3</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onStartSession('Break this problem into 3 tiny steps. Ask me to do Step 1.')}
              className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Break into tiny steps
            </button>
            <button
              type="button"
              onClick={() => onStartSession('Give me one small hint (not the answer).')}
              className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Give me ONE hint
            </button>
            <button
              type="button"
              onClick={() => onStartSession('I’ll show my work. Tell me if Step 1 is correct and what to fix.')}
              className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Check my work
            </button>
            <button
              type="button"
              onClick={() => onStartSession('Ask me 1 quick practice question like this to make sure I understand.')}
              className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Quick check
            </button>
          </div>
          <HomeworkEnginePanel
            profileId={profileId}
            onStartSession={onStartSession}
            onListStatusChange={({ hasList: nextHasList }) => setHasList(nextHasList)}
            onActiveTaskChange={(task) => setActiveTaskTitle(task?.title || null)}
            showContinueCard={false}
            showListInput={false}
            showTaskPicker={false}
            showStepsPanel
            stepsTitle="One problem at a time"
            stepsHelperText="Stay on this task and work it in tiny steps."
            startStepButtonLabel="Start this task"
          />
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Nice work — you finished your first step!</p>
            <p className="text-xs text-slate-500">Stop point reached.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setManualStep(1)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Finish for tonight
              </button>
              <button
                type="button"
                onClick={() => setManualStep(2)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Do one more small task
              </button>
            </div>
          </div>
        </div>
      )}

      {helpContent && (
        <details className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">Help</summary>
          <div className="mt-3">{helpContent}</div>
        </details>
      )}
    </div>
  )
}

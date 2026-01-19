'use client'

import { useEffect, useMemo, useState } from 'react'

interface ReadingEnginePanelProps {
  profileId: string
  onStartSession: (prompt: string) => void
}

type Passage = { id: string; title: string | null; content: string }

export default function ReadingEnginePanel({ profileId, onStartSession }: ReadingEnginePanelProps) {
  const [passageInput, setPassageInput] = useState('')
  const [passages, setPassages] = useState<Passage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [fluencyPasses, setFluencyPasses] = useState([false, false, false])
  const [isSaving, setIsSaving] = useState(false)

  const activePassage = passages[0]

  useEffect(() => {
    const loadPassages = async () => {
      const response = await fetch(`/api/elementary/reading/passages?profileId=${profileId}`)
      if (!response.ok) return
      const payload = await response.json()
      setPassages(payload?.passages || [])
    }
    loadPassages()
  }, [profileId])

  const handleSavePassage = async () => {
    if (!passageInput.trim()) return
    setIsSaving(true)
    const response = await fetch('/api/elementary/reading/passages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, content: passageInput }),
    })
    setIsSaving(false)
    if (!response.ok) return
    setPassageInput('')
    const refreshed = await fetch(`/api/elementary/reading/passages?profileId=${profileId}`)
    const payload = await refreshed.json()
    setPassages(payload?.passages || [])

    if (payload?.passages?.[0]?.id) {
      const sessionRes = await fetch('/api/elementary/reading/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, passageId: payload.passages[0].id }),
      })
      const sessionPayload = await sessionRes.json()
      setSessionId(sessionPayload?.session?.id || null)
    }
  }

  const handleTool = (prompt: string) => {
    if (!activePassage) {
      onStartSession(prompt)
      return
    }
    onStartSession(`${prompt}\n\nPassage:\n${activePassage.content}`)
  }

  const readingScore = useMemo(() => {
    const completed = fluencyPasses.filter(Boolean).length
    return Math.min(3, completed)
  }, [fluencyPasses])

  const handleSaveFluency = async () => {
    if (!sessionId) return
    const score = fluencyPasses.filter(Boolean).length
    await fetch('/api/elementary/reading/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId,
        sessionId,
        checkType: 'fluency',
        score,
        notes: `Fluency passes completed: ${score}`,
      }),
    })
  }

  return (
    <div className="space-y-4">
      {activePassage && (
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Continue reading</p>
              <p className="text-sm font-semibold text-slate-900">
                {activePassage.title || 'Last saved passage'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTool('Continue with the passage and ask 2 quick questions.')}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Continue
            </button>
          </div>
        </div>
      )}
      <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Paste a passage</h3>
        <p className="text-sm text-slate-600 mb-4">Paste a paragraph or ask for a short story.</p>
        <textarea
          value={passageInput}
          onChange={(event) => setPassageInput(event.target.value)}
          placeholder="Paste a short passage here..."
          className="w-full min-h-[110px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSavePassage}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save passage'}
          </button>
          <button
            type="button"
            onClick={() => handleTool('Give me a short story for grade 3-5 with 3 questions.')}
            className="px-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Give me a short story
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3">Reading tools</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleTool('Find the hard words and explain them simply.')}
            className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          >
            Hard words helper
          </button>
          <button
            type="button"
            onClick={() => handleTool('What is the main idea?')}
            className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          >
            Main idea finder
          </button>
          <button
            type="button"
            onClick={() => handleTool('Ask me to write a one-sentence summary.')}
            className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          >
            1-sentence summary
          </button>
          <button
            type="button"
            onClick={() => handleTool('Ask me 3 quick questions.')}
            className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          >
            3 quick questions
          </button>
          <button
            type="button"
            onClick={() => handleTool('Give me 3 vocabulary questions.')}
            className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          >
            Vocabulary builder
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">Fluency coach</h3>
            <p className="text-sm text-slate-600">1-minute reread plan: read once, then smoother, then faster.</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Reading score</p>
            <p className="text-lg font-semibold text-slate-900">{'⭐'.repeat(readingScore)}{'☆'.repeat(3 - readingScore)}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          {['First read', 'Smoother read', 'Fast read'].map((label, index) => (
            <label key={label} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={fluencyPasses[index]}
                onChange={(event) => {
                  const next = [...fluencyPasses]
                  next[index] = event.target.checked
                  setFluencyPasses(next)
                }}
              />
              {label}
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={handleSaveFluency}
          className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          Save fluency check
        </button>
      </div>
    </div>
  )
}

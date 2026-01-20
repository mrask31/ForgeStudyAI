'use client'

import { useEffect, useState } from 'react'

type Mode = 'spelling' | 'reading' | 'homework'

interface ProofStripProps {
  profileId: string
  mode: Mode
  onStartSession?: (prompt: string) => void
  showStreak?: boolean
}

export default function ProofStrip({ profileId, mode, onStartSession, showStreak = true }: ProofStripProps) {
  const [streak, setStreak] = useState(0)
  const [timeToday, setTimeToday] = useState(0)
  const [proof, setProof] = useState<Record<string, number>>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'mastered' | 'review' | null>(null)
  const [modalWords, setModalWords] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

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

  const loadWords = async (type: 'mastered' | 'review') => {
    setIsModalOpen(true)
    setModalType(type)
    setIsLoading(true)
    const endpoint = type === 'mastered'
      ? `/api/elementary/spelling/mastered?profileId=${profileId}`
      : `/api/elementary/spelling/missed?profileId=${profileId}`
    const response = await fetch(endpoint)
    if (response.ok) {
      const payload = await response.json()
      setModalWords(payload?.words || [])
    } else {
      setModalWords([])
    }
    setIsLoading(false)
  }

  const handleReviewStart = () => {
    if (!onStartSession || modalWords.length === 0) return
    onStartSession(`Practice only these missed words: ${modalWords.join(', ')}. Then quiz me.`)
    setIsModalOpen(false)
  }

  const isSpelling = mode === 'spelling'
  const columns = showStreak ? 'sm:grid-cols-4' : 'sm:grid-cols-3'

  return (
    <>
      <div className={`grid gap-3 ${columns}`}>
      {showStreak && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Streak</p>
          <p className="text-lg font-semibold text-slate-900">{streak} days</p>
        </div>
      )}
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Time today</p>
          <p className="text-lg font-semibold text-slate-900">{minutes} min</p>
        </div>
        <button
          type="button"
          onClick={isSpelling ? () => loadWords('mastered') : undefined}
          className={`rounded-xl border border-slate-200 bg-white px-4 py-3 text-left ${
            isSpelling ? 'hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors' : ''
          }`}
        >
          <p className="text-xs text-slate-500">{mode === 'homework' ? 'Completed' : 'Mastered'}</p>
          <p className="text-lg font-semibold text-slate-900">
            {mode === 'homework' ? proof.completed || 0 : proof.mastered || proof.passages || 0}
          </p>
        </button>
        <button
          type="button"
          onClick={isSpelling ? () => loadWords('review') : undefined}
          className={`rounded-xl border border-slate-200 bg-white px-4 py-3 text-left ${
            isSpelling ? 'hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors' : ''
          }`}
        >
          <p className="text-xs text-slate-500">Review</p>
          <p className="text-lg font-semibold text-slate-900">
            {mode === 'homework' ? proof.pending || 0 : proof.review || proof.checks || 0}
          </p>
        </button>
      </div>

      {isModalOpen && modalType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {modalType === 'mastered' ? 'Mastered words' : 'Review words'}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {modalType === 'mastered'
                ? 'These are words the student spelled correctly most recently.'
                : 'These are words marked missed on the latest checks.'}
            </p>
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : modalWords.length > 0 ? (
              <div className="text-sm text-slate-700 flex flex-wrap gap-2">
                {modalWords.map((word) => (
                  <span key={word} className="px-2 py-1 rounded-lg bg-slate-100">
                    {word}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No words yet.</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-600"
              >
                Close
              </button>
              {modalType === 'review' && modalWords.length > 0 && onStartSession && (
                <button
                  type="button"
                  onClick={handleReviewStart}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white"
                >
                  Practice these
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

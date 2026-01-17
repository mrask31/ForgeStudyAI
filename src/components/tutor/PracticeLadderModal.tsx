'use client'

import { useEffect, useState } from 'react'
import { X, ListChecks } from 'lucide-react'

interface PracticeLadderModalProps {
  isOpen: boolean
  onClose: () => void
  messageContent: string
  chatId?: string | null
  messageId?: string | null
  profileId?: string | null
}

export default function PracticeLadderModal({
  isOpen,
  onClose,
  messageContent,
  chatId,
  messageId,
  profileId,
}: PracticeLadderModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [levels, setLevels] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let isMounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      setLevels(null)
      try {
        const response = await fetch('/api/practice/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            messageContent,
            chatId,
            messageId,
            profileId,
          }),
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to generate practice')
        }
        if (isMounted) {
          setLevels(payload.levels || [])
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to generate practice')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [isOpen, messageContent, chatId, messageId, profileId])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-200 max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Practice Ladder</h2>
            </div>
            <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-700" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {isLoading && <p className="text-sm text-slate-600">Generating practice...</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!isLoading && !error && levels && levels.length === 0 && (
              <p className="text-sm text-slate-600">No practice items generated.</p>
            )}
            {levels?.map((level) => (
              <div key={level.level} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900 mb-2">
                  Level {level.level}: {level.label}
                </div>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                  {(level.items || []).map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

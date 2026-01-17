'use client'

import { useEffect, useState } from 'react'
import { ListChecks } from 'lucide-react'
import ToolPanel from '@/components/ui/tool-panel'

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
    <ToolPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Practice Ladder"
      icon={<ListChecks className="w-5 h-5 text-emerald-600" />}
    >
      <div className="space-y-4">
        {!isLoading && !error && (
          <p className="text-sm text-slate-600">
            Start at Level 1 and move down the ladder as you gain confidence.
          </p>
        )}
        {isLoading && <p className="text-sm text-slate-600">Generating practice ladder...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!isLoading && !error && levels && levels.length === 0 && (
          <p className="text-sm text-slate-600">No practice ladder available yet.</p>
        )}
        {levels?.map((level) => (
          <div key={level.level} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                {level.level}
              </span>
              <span>Level {level.level}: {level.label}</span>
            </div>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
              {(level.items || []).map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ToolPanel>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { X, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface ExamSheetModalProps {
  isOpen: boolean
  onClose: () => void
  messageContent: string
  chatId?: string | null
  messageId?: string | null
  profileId?: string | null
  topic?: string | null
}

export default function ExamSheetModal({
  isOpen,
  onClose,
  messageContent,
  chatId,
  messageId,
  profileId,
  topic,
}: ExamSheetModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let isMounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      setMarkdown(null)
      try {
        const response = await fetch('/api/exam-sheet/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            messageContent,
            chatId,
            messageId,
            profileId,
            topic,
          }),
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to generate exam sheet')
        }
        if (isMounted) {
          setMarkdown(payload?.examSheet?.sheet_markdown || '')
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to generate exam sheet')
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
  }, [isOpen, messageContent, chatId, messageId, profileId, topic])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-200 max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Exam Sheet</h2>
            </div>
            <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-700" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {isLoading && <p className="text-sm text-slate-600">Building exam sheet...</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!isLoading && !error && markdown && (
              <div className="prose prose-slate max-w-none text-sm text-slate-700">
                <ReactMarkdown>{markdown}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import ReactMarkdown, { type Components } from 'react-markdown'
import ToolPanel from '@/components/ui/tool-panel'

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
  const normalizedMarkdown = useMemo(() => {
    if (!markdown) return ''
    let value = markdown.replace(/\r\n/g, '\n')
    const trimmed = value.trim()
    const fenceMatch = trimmed.match(/^```(?:\w+)?\s*\n([\s\S]*?)\n```$/)
    if (fenceMatch?.[1]) {
      value = fenceMatch[1]
    }
    return value
      .replace(/\t/g, '    ')
      .replace(/^ {4}/gm, '')
      .trim()
  }, [markdown])
  const markdownComponents: Components = {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-base font-semibold text-slate-900 mb-4 mt-2">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2 mt-6 first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-sm font-semibold text-slate-900 mb-2 mt-4 first:mt-0">{children}</h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="text-sm text-slate-700 leading-relaxed mb-3 last:mb-0">{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-slate-900">{children}</strong>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-4 border-indigo-200 bg-indigo-50/60 px-4 py-3 rounded-lg text-sm text-slate-700">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-4 border-slate-200" />,
  }

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
    <ToolPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Exam Sheet"
      icon={<FileText className="w-5 h-5 text-indigo-600" />}
    >
      <div className="space-y-4">
        {isLoading && <p className="text-sm text-slate-600">Generating exam sheet...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!isLoading && !error && !markdown && (
          <p className="text-sm text-slate-600">No exam sheet available yet.</p>
        )}
        {!isLoading && !error && markdown && (
          <>
            {topic && (
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800">
                Topic: {topic}
              </div>
            )}
            <div className="max-w-none text-sm text-slate-700">
              <ReactMarkdown components={markdownComponents}>{normalizedMarkdown}</ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </ToolPanel>
  )
}

'use client'

import { X, Map } from 'lucide-react'
import { useDensity } from '@/contexts/DensityContext'
import { getDensityTokens } from '@/lib/density-tokens'
import ReactMarkdown from 'react-markdown'

interface StudyMapPanelProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  mapMarkdown: string | null
  clarifyingQuestion?: string | null
}

export default function StudyMapPanel({
  isOpen,
  onClose,
  title,
  mapMarkdown,
  clarifyingQuestion,
}: StudyMapPanelProps) {
  const { density } = useDensity()
  const tokens = getDensityTokens(density)

  if (!isOpen) return null

  const parseSections = (markdown: string) => {
    const sections: { header: string; content: string }[] = []
    const lines = markdown.split('\n')
    let currentHeader = ''
    let currentContent: string[] = []

    for (const line of lines) {
      if (line.startsWith('### ')) {
        if (currentHeader) {
          sections.push({ header: currentHeader, content: currentContent.join('\n') })
        }
        currentHeader = line.replace('### ', '').trim()
        currentContent = []
      } else if (line.trim()) {
        currentContent.push(line)
      }
    }

    if (currentHeader) {
      sections.push({ header: currentHeader, content: currentContent.join('\n') })
    }

    return sections
  }

  const sections = mapMarkdown ? parseSections(mapMarkdown) : []

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-200 max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-teal-600" />
              <h2 className={`${tokens.heading} font-semibold text-slate-900`}>
                {title || 'Study Map'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-500 hover:text-slate-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {!mapMarkdown ? (
              <p className={`${tokens.bodyText} text-slate-600`}>No map available yet.</p>
            ) : (
              <div className="space-y-4">
                {sections.map((section, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <h3 className={`${tokens.subheading} font-semibold text-slate-900 mb-2`}>
                      {section.header}
                    </h3>
                    <div className="prose prose-slate max-w-none text-sm text-slate-700">
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {clarifyingQuestion && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <span className="font-semibold">Clarifying question:</span> {clarifyingQuestion}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

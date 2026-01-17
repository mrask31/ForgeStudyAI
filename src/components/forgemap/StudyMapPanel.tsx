'use client'

import { Map } from 'lucide-react'
import { useDensity } from '@/contexts/DensityContext'
import { getDensityTokens } from '@/lib/density-tokens'
import ReactMarkdown from 'react-markdown'
import ToolPanel from '@/components/ui/tool-panel'

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
    <ToolPanel
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'Reset Map'}
      icon={<Map className="w-5 h-5 text-teal-600" />}
    >
      {!mapMarkdown ? (
        <p className="text-sm text-slate-600">No reset map available yet.</p>
      ) : (
        <div className="space-y-4">
          {clarifyingQuestion && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-1">
                Try this first
              </div>
              <span className="font-semibold">Clarifying question:</span> {clarifyingQuestion}
            </div>
          )}
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
        </div>
      )}
    </ToolPanel>
  )
}

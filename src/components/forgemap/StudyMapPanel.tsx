'use client'

import { useState } from 'react'
import { Map, FolderPlus } from 'lucide-react'
import { useDensity } from '@/contexts/DensityContext'
import { getDensityTokens } from '@/lib/density-tokens'
import ReactMarkdown from 'react-markdown'
import ToolPanel from '@/components/ui/tool-panel'
import SaveToTopicModal from '@/components/study-topics/SaveToTopicModal'
import { useActiveProfileSummary } from '@/hooks/useActiveProfileSummary'

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
  const { summary: activeProfile } = useActiveProfileSummary()
  const [isSaveOpen, setIsSaveOpen] = useState(false)

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

  const canSaveToTopic = !!activeProfile && (activeProfile.gradeBand === 'middle' || activeProfile.gradeBand === 'high')
  const mapSaveText = mapMarkdown
    ? `${mapMarkdown}${clarifyingQuestion ? `\n\nClarifying question: ${clarifyingQuestion}` : ''}`
    : ''

  return (
    <>
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
            {canSaveToTopic && (
              <button
                type="button"
                onClick={() => setIsSaveOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                Save to Study Topics
              </button>
            )}
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
      {canSaveToTopic && activeProfile && mapMarkdown && (
        <SaveToTopicModal
          isOpen={isSaveOpen}
          onClose={() => setIsSaveOpen(false)}
          profileId={activeProfile.id}
          itemType="map"
          itemRef={null}
          sourceText={mapSaveText}
        />
      )}
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Map } from 'lucide-react'
import { useDensity } from '@/contexts/DensityContext'
import { getDensityTokens } from '@/lib/density-tokens'
import ReactMarkdown from 'react-markdown'

interface ForgeMapPanelProps {
  isOpen: boolean
  onClose: () => void
  messageContent: string
  chatId: string | null
  mode: 'notes' | 'reference' | 'mixed'
  selectedDocIds: string[]
  mapType?: 'topic' | 'confusion' | 'instant'
}

export default function ForgeMapPanel({
  isOpen,
  onClose,
  messageContent,
  chatId,
  mode,
  selectedDocIds,
  mapType = 'topic',
}: ForgeMapPanelProps) {
  const { density } = useDensity()
  const tokens = getDensityTokens(density)
  const [mapMarkdown, setMapMarkdown] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clarifyingQuestion, setClarifyingQuestion] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && messageContent) {
      loadOrGenerateMap()
    }
  }, [isOpen, messageContent, chatId, mode, selectedDocIds])

  const loadOrGenerateMap = async () => {
    setIsLoading(true)
    setError(null)
    setClarifyingQuestion(null)

    try {
      const response = await fetch('/api/forgemap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageContent,
          chatId,
          mode,
          selectedDocIds,
          mapType,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = payload?.error || 'Failed to generate concept map. Please try again.'
        throw new Error(errorMessage)
      }

      const mapMarkdownValue =
        payload?.map?.map_markdown || payload?.mapMarkdown || payload?.map
      const clarifying =
        payload?.clarifyingQuestion || payload?.map?.clarifying_question || null

      if (!mapMarkdownValue) {
        throw new Error('No map content returned. Please try again.')
      }

      setMapMarkdown(mapMarkdownValue)
      if (clarifying) {
        setClarifyingQuestion(String(clarifying))
      }
    } catch (err: any) {
      console.error('ForgeMap error:', err)
      setError(err?.message || 'Failed to generate concept map. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  // Parse markdown to extract sections
  const parseMapSections = (markdown: string) => {
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

  const sections = mapMarkdown ? parseMapSections(mapMarkdown) : []

  // Section styling based on header type
  const getSectionStyle = (header: string) => {
    if (header.includes('Cause → Effect')) {
      return 'bg-blue-50/50 border-blue-200'
    } else if (header.includes('Risks') || header.includes('Complications')) {
      return 'bg-amber-50/50 border-amber-200'
    } else if (header.includes('Priorities')) {
      return 'bg-red-50/50 border-red-200'
    } else if (header.includes('Interventions')) {
      return 'bg-green-50/50 border-green-200'
    } else if (header.includes('Monitoring')) {
      return 'bg-purple-50/50 border-purple-200'
    } else {
      return 'bg-slate-50/50 border-slate-200'
    }
  }

  return (
    <>
      {/* Mobile: Bottom Sheet */}
      <div className={`md:hidden fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-lg shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-clinical-primary" />
              <h2 className={`${tokens.heading} font-semibold text-clinical-text-primary`}>
                Clinical Concept Map
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="animate-spin text-clinical-primary w-8 h-8 mb-4" />
                <p className={`${tokens.bodyText} text-clinical-text-secondary`}>Generating concept map...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className={`${tokens.bodyText} text-red-600`}>{error}</p>
              </div>
            ) : sections.length === 0 ? (
              <div className="text-center py-12">
                <p className={`${tokens.bodyText} text-clinical-text-secondary`}>No concept map available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map((section, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getSectionStyle(section.header)}`}
                  >
                    <h3 className={`${tokens.subheading} font-semibold text-clinical-text-primary mb-2`}>
                      {section.header}
                    </h3>
                    <div className={`${tokens.bodyText} text-clinical-text-secondary prose prose-slate max-w-none`}>
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {clarifyingQuestion && (
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">Clarifying question:</span>{' '}
                    {clarifyingQuestion}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: Side Panel */}
      <div className={`hidden md:block fixed right-0 top-0 bottom-0 w-96 bg-white border-l border-slate-200 shadow-xl z-40 transform transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-clinical-primary" />
            <h2 className={`${tokens.heading} font-semibold text-clinical-text-primary`}>
              Concept Map
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

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100dvh-4rem)] p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-clinical-primary w-8 h-8 mb-4" />
              <p className={`${tokens.bodyText} text-clinical-text-secondary`}>Generating concept map...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className={`${tokens.bodyText} text-red-600`}>{error}</p>
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center py-12">
              <p className={`${tokens.bodyText} text-clinical-text-secondary`}>No concept map available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getSectionStyle(section.header)}`}
                >
                  <h3 className={`${tokens.subheading} font-semibold text-clinical-text-primary mb-2`}>
                    {section.header}
                  </h3>
                  <div className={`${tokens.bodyText} text-clinical-text-secondary prose prose-slate max-w-none`}>
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {clarifyingQuestion && (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Clarifying question:</span>{' '}
                  {clarifyingQuestion}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}


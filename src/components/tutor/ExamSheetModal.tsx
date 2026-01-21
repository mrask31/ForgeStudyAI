'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, FolderPlus, Download, Printer } from 'lucide-react'
import ReactMarkdown, { type Components } from 'react-markdown'
import ToolPanel from '@/components/ui/tool-panel'
import SaveToTopicModal from '@/components/study-topics/SaveToTopicModal'
import { useActiveProfileSummary } from '@/hooks/useActiveProfileSummary'

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
  const [isDownloading, setIsDownloading] = useState(false)
  const { summary: activeProfile } = useActiveProfileSummary()
  const [isSaveOpen, setIsSaveOpen] = useState(false)
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
  const parsedContent = useMemo(() => {
    const result = { title: '', sections: [] as Array<{ title: string; content: string }> }
    if (!normalizedMarkdown) return result

    const lines = normalizedMarkdown.split('\n')
    let currentTitle = ''
    let currentLines: string[] = []

    const pushSection = () => {
      if (!currentTitle) return
      result.sections.push({ title: currentTitle, content: currentLines.join('\n').trim() })
      currentLines = []
    }

    for (const line of lines) {
      if (line.startsWith('# ') && !result.title) {
        result.title = line.replace(/^#\s+/, '').trim()
        continue
      }
      if (line.startsWith('## ')) {
        if (currentTitle) {
          pushSection()
        }
        currentTitle = line.replace(/^##\s+/, '').trim()
        continue
      }
      currentLines.push(line)
    }

    pushSection()
    return result
  }, [normalizedMarkdown])
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
  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')

  const getSectionComponents = (isChecklist: boolean): Components => {
    if (!isChecklist) return markdownComponents
    return {
      ...markdownComponents,
      ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="space-y-2 text-sm text-slate-700">{children}</ul>
      ),
      li: ({ children }: { children?: React.ReactNode }) => (
        <li className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border border-slate-300 bg-white text-[10px] text-slate-400">
            ✓
          </span>
          <span className="leading-relaxed">{children}</span>
        </li>
      ),
    }
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

  const canSaveToTopic = !!activeProfile && !!profileId && (activeProfile.gradeBand === 'middle' || activeProfile.gradeBand === 'high')
  const sheetText = normalizedMarkdown || markdown || ''
  const handlePrint = () => {
    if (!sheetText) return
    const newWindow = window.open('', '_blank', 'width=900,height=700')
    if (!newWindow) return
    newWindow.document.write(`
      <html>
        <head>
          <title>Exam Sheet</title>
          <style>
            body { font-family: "Inter", Arial, sans-serif; color: #0f172a; margin: 32px; }
            h1, h2, h3 { color: #0f172a; margin-top: 20px; }
            p { line-height: 1.6; }
            ul { padding-left: 20px; }
            li { margin-bottom: 6px; }
          </style>
        </head>
        <body>
          <div>${sheetText.replace(/\n/g, '<br/>')}</div>
        </body>
      </html>
    `)
    newWindow.document.close()
    newWindow.focus()
    newWindow.print()
  }

  const handleDownload = async () => {
    if (!sheetText) return
    setIsDownloading(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const temp = document.createElement('div')
      temp.style.width = '816px'
      temp.style.padding = '32px'
      temp.style.background = '#ffffff'
      temp.style.color = '#0f172a'
      temp.style.position = 'fixed'
      temp.style.left = '-9999px'
      temp.innerHTML = sheetText.replace(/\n/g, '<br/>')
      document.body.appendChild(temp)
      const canvas = await html2canvas(temp, {
        backgroundColor: '#ffffff',
        scale: 2,
        windowWidth: temp.scrollWidth,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'letter' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const imgHeight = (canvas.height * pageWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
      heightLeft -= pdf.internal.pageSize.getHeight()
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
        heightLeft -= pdf.internal.pageSize.getHeight()
      }
      pdf.save('exam-sheet.pdf')
      document.body.removeChild(temp)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  {isDownloading ? 'Preparing...' : 'Download PDF'}
                </button>
                {canSaveToTopic && sheetText && (
                  <button
                    type="button"
                    onClick={() => setIsSaveOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <FolderPlus className="w-4 h-4" />
                    Save to Study Topics
                  </button>
                )}
              </div>
              {topic && (
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800">
                  Topic: {topic}
                </div>
              )}
              {parsedContent.title && (
                <h1 className="text-base font-semibold text-slate-900">{parsedContent.title}</h1>
              )}
              {parsedContent.sections.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                      Contents
                    </p>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {parsedContent.sections.map((section) => {
                        const id = slugify(section.title)
                        return (
                          <li key={id}>
                            <a href={`#${id}`} className="hover:text-slate-900">
                              {section.title}
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  {parsedContent.sections.map((section) => {
                    const id = slugify(section.title)
                    const isChecklist = /must[-\s]?know/i.test(section.title)
                    return (
                      <section key={id} id={id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                          {section.title}
                        </h2>
                        <div className="max-w-none text-sm text-slate-700">
                          <ReactMarkdown components={getSectionComponents(isChecklist)}>
                            {section.content}
                          </ReactMarkdown>
                        </div>
                      </section>
                    )
                  })}
                </div>
              ) : (
                <div className="max-w-none text-sm text-slate-700">
                  <ReactMarkdown components={markdownComponents}>{normalizedMarkdown}</ReactMarkdown>
                </div>
              )}
            </>
          )}
        </div>
      </ToolPanel>
      {canSaveToTopic && activeProfile && sheetText && (
        <SaveToTopicModal
          isOpen={isSaveOpen}
          onClose={() => setIsSaveOpen(false)}
          profileId={activeProfile.id}
          itemType="exam"
          itemRef={messageId || null}
          sourceText={sheetText}
        />
      )}
    </>
  )
}

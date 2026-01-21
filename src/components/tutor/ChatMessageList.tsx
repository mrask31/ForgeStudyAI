'use client'

import { FileIcon, ClipboardCheck, Map, Bookmark, Star, AlertCircle, CheckCircle2, FolderPlus } from 'lucide-react'
import { useTutorContext } from './TutorContext'
import { createBrowserClient } from '@supabase/ssr'
import { setTopicSummaryAndStudiedAt } from '@/lib/api/notebook'
import clsx from 'clsx'
import type { TutorEvidenceItem } from './TutorEvidencePanel'
import FollowUpPrompts from './FollowUpPrompts'
import { useState, useEffect } from 'react'
import MessageWithMedicalTerms from './MessageWithMedicalTerms'
import SaveToTopicModal from '@/components/study-topics/SaveToTopicModal'
import { useActiveProfileSummary } from '@/hooks/useActiveProfileSummary'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  evidence?: TutorEvidenceItem[]
}

interface ChatMessageListProps {
  messages: ChatMessage[]
  selectedMessageId?: string | null
  onSelectMessage?: (id: string) => void
  isLoading?: boolean
  chatId?: string
  strictMode?: boolean
  onSaveToNotebook?: (messageId: string) => void
  savingToNotebook?: string | null
  onSaveClip?: (messageId: string, content: string) => void // New prop for saving clips
  onShowMap?: (messageId: string, content: string) => void // New prop for showing concept map
  onShowConfusionMap?: (messageId: string, content: string) => void
  onShowPracticeLadder?: (messageId: string, content: string) => void
  onShowExamSheet?: (messageId: string, content: string) => void
  onSendMessage?: (message: string) => void // Callback to send a follow-up prompt
}

// Helper to detect if message likely used binder context
const detectBinderUsage = (content: string): boolean => {
  const binderIndicators = [
    'from your',
    'your uploaded',
    'your materials',
    'your binder',
    'your document',
  ]
  return binderIndicators.some(indicator => 
    content.toLowerCase().includes(indicator)
  )
}

export default function ChatMessageList({
  messages,
  selectedMessageId,
  onSelectMessage,
  isLoading = false,
  chatId,
  strictMode = false,
  onSaveToNotebook,
  savingToNotebook,
  onSaveClip,
  onShowMap,
  onShowConfusionMap,
  onShowPracticeLadder,
  onShowExamSheet,
  onSendMessage,
}: ChatMessageListProps) {
  const tutorContext = useTutorContext()
  const { summary: activeProfile } = useActiveProfileSummary()
  const [isTogglingHelp, setIsTogglingHelp] = useState<boolean>(false)
  const [savedClipId, setSavedClipId] = useState<string | null>(null)
  const [showMapId, setShowMapId] = useState<string | null>(null)
  const [saveToTopicPayload, setSaveToTopicPayload] = useState<{ messageId: string; content: string } | null>(null)

  const canSaveToTopic = !!activeProfile && (activeProfile.gradeBand === 'middle' || activeProfile.gradeBand === 'high')

  // Track which messages are flagged (per message, not per chat)
  const [flaggedMessages, setFlaggedMessages] = useState<Set<string>>(new Set())

  // Load flagged messages from chat metadata
  useEffect(() => {
    if (!chatId) return

    const loadFlaggedMessages = async () => {
      try {
        const response = await fetch(`/api/chats/metadata?chatId=${chatId}`, {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          const flaggedMessageIds = data.metadata?.flaggedMessages || []
          setFlaggedMessages(new Set(flaggedMessageIds))
        }
      } catch (error) {
        console.error('[ChatMessageList] Error loading flagged messages:', error)
      }
    }

    loadFlaggedMessages()
  }, [chatId])

  const handleToggleNeedsHelp = async (messageId: string) => {
    if (!chatId || isTogglingHelp) return

    setIsTogglingHelp(true)
    const isCurrentlyFlagged = flaggedMessages.has(messageId)
    const newFlaggedSet = new Set(flaggedMessages)
    
    if (isCurrentlyFlagged) {
      newFlaggedSet.delete(messageId)
    } else {
      newFlaggedSet.add(messageId)
    }

    try {
      const response = await fetch('/api/chats/metadata', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          chatId,
          metadata: { flaggedMessages: Array.from(newFlaggedSet) }
        })
      })

      if (response.ok) {
        setFlaggedMessages(newFlaggedSet)
      } else {
        console.error('[ChatMessageList] Failed to update flagged messages')
      }
    } catch (error) {
      console.error('[ChatMessageList] Error toggling flagged messages:', error)
    } finally {
      setIsTogglingHelp(false)
    }
  }

  const handleSaveToNotebook = async (messageId: string, content: string) => {
    if (!tutorContext.selectedTopicId || savingToNotebook === messageId) return
    
    if (onSaveToNotebook) {
      onSaveToNotebook(messageId)
    }
    
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('[ChatMessageList] User not authenticated')
        return
      }

      const paragraphs = content.split('\n\n').filter(p => p.trim())
      let summary = paragraphs.slice(0, 3).join('\n\n')
      if (summary.length > 400) {
        summary = summary.substring(0, 400) + '...'
      } else if (summary.length === 0 && content.length > 0) {
        summary = content.substring(0, 400) + (content.length > 400 ? '...' : '')
      }

      await setTopicSummaryAndStudiedAt(user.id, tutorContext.selectedTopicId, summary)
    } catch (error) {
      console.error('[ChatMessageList] Error saving to notebook:', error)
    }
  }

  return (
    <div className="h-full">
      <div className="mx-auto max-w-2xl space-y-4 pt-2">
        {messages.map((m, index) => {
        if (m.role === 'assistant') {
          const hasBinderContext = detectBinderUsage(m.content)
          const hasEvidence = m.evidence && m.evidence.length > 0
          const isSelected = selectedMessageId === m.id
          const prevMessage = index > 0 ? messages[index - 1] : null
          const showDivider = prevMessage && prevMessage.role === 'assistant'
          // Show follow-up prompts only on the last assistant message
          const isLastMessage = index === messages.length - 1 || 
            (index < messages.length - 1 && messages[index + 1]?.role === 'user')

          return (
            <div key={m.id} data-message-id={m.id}>
              {showDivider && (
                <div className="mb-6 md:mb-8 pt-4 border-t border-slate-200"></div>
              )}

              <article
                className={clsx(
                  "tutor-card transition-colors",
                  hasEvidence && "cursor-pointer",
                  isSelected && "border-sky-400 ring-1 ring-sky-200"
                )}
                onClick={() => {
                  if (hasEvidence && onSelectMessage) {
                    onSelectMessage(m.id)
                  }
                }}
              >
                {/* Grounding Indicator Strip + Actions */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    {hasBinderContext ? (
                      <div className="flex items-center gap-2">
                        <FileIcon className="w-4 h-4 text-teal-600" />
                        <span className="text-xs text-teal-700 font-medium">
                          ✅ Using: {(() => {
                            const filenameMatches = m.content.match(/From\s+["']?([^"'\n]+\.(pdf|docx?|txt))["']?/gi)
                            if (filenameMatches && filenameMatches.length > 0) {
                              const filenames = filenameMatches
                                .map(match => match.replace(/From\s+["']?/i, '').replace(/["']?/g, ''))
                                .filter((f, i, arr) => arr.indexOf(f) === i)
                                .slice(0, 3)
                              return filenames.join(', ') + (filenameMatches.length > 3 ? '...' : '')
                            }
                            const patternMatches = m.content.match(/([A-Z][a-zA-Z0-9_\-]+\.(pdf|docx?|txt))/g)
                            if (patternMatches && patternMatches.length > 0) {
                              const filenames = patternMatches
                                .filter((f, i, arr) => arr.indexOf(f) === i)
                                .slice(0, 3)
                              return filenames.join(', ') + (patternMatches.length > 3 ? '...' : '')
                            }
                            return 'your uploaded materials'
                          })()}
                        </span>
                      </div>
                    ) : (
                      <>
                        <ClipboardCheck className="w-4 h-4 text-[var(--tutor-text-muted)]" />
                        <span className="text-xs text-[var(--tutor-text-muted)] font-medium">Guided Learning</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (onSaveClip) {
                          onSaveClip(m.id, m.content)
                          setSavedClipId(m.id)
                          setTimeout(() => setSavedClipId(null), 3000)
                        }
                      }}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all duration-200 ${
                        savedClipId === m.id
                          ? 'text-emerald-600 bg-emerald-50'
                          : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      title="Save this explanation to your Learning Library (accessible from sidebar)"
                    >
                      {savedClipId === m.id ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3 h-3" />
                          <span>Save</span>
                        </>
                      )}
                    </button>
                    {canSaveToTopic && activeProfile && (
                      <button
                        onClick={() => {
                          setSaveToTopicPayload({ messageId: m.id, content: m.content })
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200"
                        title="Save to Study Topics"
                      >
                        <FolderPlus className="w-3 h-3" />
                        <span>Topic</span>
                      </button>
                    )}
                    {chatId && (
                      <button
                        onClick={() => handleToggleNeedsHelp(m.id)}
                        disabled={isTogglingHelp}
                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all duration-200 ${
                          flaggedMessages.has(m.id)
                            ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 font-medium'
                            : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                        } disabled:opacity-50`}
                        title={flaggedMessages.has(m.id) ? 'Flagged for review - Click to remove. This appears in your Dashboard under "Flagged for Review"' : 'Flag this Q&A pair for focused review (appears in Dashboard)'}
                      >
                        <AlertCircle className="w-3 h-3" />
                        <span>{flaggedMessages.has(m.id) ? 'Flagged' : 'Flag'}</span>
                      </button>
                    )}
                    {tutorContext.selectedTopicId && !hasBinderContext && (
                      <button
                        onClick={() => handleSaveToNotebook(m.id, m.content)}
                        disabled={savingToNotebook === m.id}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors disabled:opacity-50"
                        title="Save to Notebook"
                      >
                        <Star className={`w-3 h-3 ${savingToNotebook === m.id ? 'animate-spin' : ''}`} />
                        <span>{savingToNotebook === m.id ? 'Saving...' : 'Save to Notebook'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Document Content */}
                <div className="prose prose-slate prose-lg max-w-3xl">
                  <MessageWithMedicalTerms
                    content={m.content}
                    markdownComponents={{
                      p: ({children}) => <p className="mb-3 last:mb-0 text-sm sm:text-base text-slate-700 leading-relaxed">{children}</p>,
                      ul: ({children}) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
                      li: ({children}) => <li className="my-1 text-slate-700">{children}</li>,
                      strong: ({children}) => <strong className="font-semibold text-slate-900">{children}</strong>,
                      code: ({children}) => <code className="bg-slate-50 px-1.5 py-0.5 rounded text-xs font-mono text-slate-900 border border-slate-200">{children}</code>,
                      pre: ({children}) => (
                        <pre className="max-w-full overflow-x-auto bg-slate-50 p-4 rounded-lg border border-slate-200 my-4">
                          {children}
                        </pre>
                      ),
                      table: ({children}) => (
                        <div className="max-w-full overflow-x-auto my-4">
                          <table className="min-w-full border-collapse border border-slate-300">
                            {children}
                          </table>
                        </div>
                      ),
                      h1: ({children}) => <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mb-3 mt-6 first:mt-0">{children}</h1>,
                      h2: ({children}) => <h2 className="text-xl font-semibold tracking-tight text-slate-900 mb-2 mt-5 first:mt-0">{children}</h2>,
                      h3: ({children, ...props}: { children: React.ReactNode; [key: string]: any }) => {
                        const isSnapshot = typeof children === 'string' && children.trim() === 'Snapshot'
                        return (
                          <h3 
                            className={`text-lg font-semibold tracking-tight text-slate-900 mb-2 mt-6 first:mt-0 ${isSnapshot ? 'font-bold text-[var(--tutor-primary)] mb-3' : ''}`}
                            {...props}
                          >
                            {children}
                          </h3>
                        )
                      },
                      blockquote: ({children}) => (
                        <blockquote className="border-l-4 border-[var(--tutor-primary)] bg-teal-50 text-slate-700 not-italic rounded-r pl-4 pr-4 py-3 my-4 text-sm sm:text-base leading-relaxed">
                          {children}
                        </blockquote>
                      ),
                    }}
                  />
                </div>

                {/* Mobile evidence button */}
                {hasEvidence && (
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 xl:hidden"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onSelectMessage) {
                        onSelectMessage(m.id)
                      }
                    }}
                  >
                    🔍 View evidence from your binder
                  </button>
                )}

                {/* Follow-up prompts - only on last assistant message */}
                {onSendMessage && (
                  <FollowUpPrompts
                    messageContent={m.content}
                    onPromptClick={onSendMessage}
                    isLastMessage={isLastMessage}
                    gradeBand={activeProfile?.gradeBand}
                  />
                )}
              </article>
            </div>
          )
        } else {
          // User message - right-aligned bubble
          return (
            <div key={m.id} className="flex justify-end">
              <div className="ml-auto max-w-[70%]">
                <div className="inline-block rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-all duration-200 leading-relaxed">
                  {m.content}
                </div>
              </div>
            </div>
          )
        }
      })}

        {isLoading && (
          <div className="flex justify-center">
            <div className="tutor-card">
              <p className="text-slate-600">Thinking...</p>
            </div>
          </div>
        )}
      </div>

      {canSaveToTopic && activeProfile && saveToTopicPayload && (
        <SaveToTopicModal
          isOpen={!!saveToTopicPayload}
          onClose={() => setSaveToTopicPayload(null)}
          profileId={activeProfile.id}
          itemType="chat"
          itemRef={saveToTopicPayload.messageId}
          sourceText={saveToTopicPayload.content}
        />
      )}
    </div>
  )
}


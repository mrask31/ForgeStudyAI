'use client'

import { useChat } from '@ai-sdk/react'
import { Send, BookOpenCheck, User, Brain, FileText, Pill, Paperclip, FileIcon, ClipboardCheck, Bookmark, Map, Star, AlertCircle } from 'lucide-react'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import MessageWithMedicalTerms from '../tutor/MessageWithMedicalTerms'
import { useDensity } from '@/contexts/DensityContext'
import { getDensityTokens } from '@/lib/density-tokens'
import SaveClipModal from '@/components/clips/SaveClipModal'
import ForgeMapPanel from '@/components/forgemap/ForgeMapPanel'
import StudyMapPanel from '@/components/forgemap/StudyMapPanel'
import PracticeLadderModal from '@/components/tutor/PracticeLadderModal'
import ExamSheetModal from '@/components/tutor/ExamSheetModal'
import ArchivedChatBanner from '@/components/chat/ArchivedChatBanner'
import SuggestedPrompts from '@/components/tutor/SuggestedPrompts'
import ChatMessageList, { type ChatMessage } from '@/components/tutor/ChatMessageList'
import { useTutorContext } from '@/components/tutor/TutorContext'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { useActiveProfileSummary } from '@/hooks/useActiveProfileSummary'
import { setTopicSummaryAndStudiedAt } from '@/lib/api/notebook'
import { createBrowserClient } from '@supabase/ssr'
import FollowUpPrompts from '@/components/tutor/FollowUpPrompts'

// Helper to validate UUID format
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Helper to generate a stable chat ID
const generateChatId = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('forgenursing-chat-id');
    if (saved && isValidUUID(saved)) {
      return saved;
    }
    const newId = crypto.randomUUID();
    localStorage.setItem('forgenursing-chat-id', newId);
    return newId;
  }
  return '';
};

// Helper to detect if message likely used binder context
// This is a simple heuristic - can be enhanced with API metadata later
const detectBinderUsage = (content: string): boolean => {
  // Simple check: if content mentions specific file patterns or binder-related terms
  // This is a placeholder - ideally API would return metadata
  const binderIndicators = [
    'from your',
    'your uploaded',
    'your materials',
    'your binder',
    'your document',
  ];
  return binderIndicators.some(indicator => 
    content.toLowerCase().includes(indicator)
  );
};

interface ClinicalTutorWorkspaceProps {
  strictMode?: boolean
  chatId?: string
  filterMode?: 'notes' | 'reference' | 'mixed'
  selectedDocIds?: string[]
  mode?: 'tutor' | 'notes' | 'reflections'
  onSendMessage?: (message: string) => Promise<void>
  attachedFiles?: { id: string, name: string, document_type: string | null }[]
  selectedMessageId?: string | null
  onSelectMessage?: (id: string) => void
  onMessagesChange?: (messages: any[]) => void
  scrollToMessageId?: string
  scrollContainerRef?: React.RefObject<HTMLDivElement>
}

export default function ClinicalTutorWorkspace({ 
  strictMode = false, 
  chatId: providedChatId, 
  filterMode = 'mixed', 
  selectedDocIds = [], 
  mode = 'tutor', 
  onSendMessage, 
  attachedFiles = [],
  selectedMessageId,
  onSelectMessage,
  onMessagesChange,
  scrollToMessageId,
  scrollContainerRef,
}: ClinicalTutorWorkspaceProps) {
  const [customError, setCustomError] = useState('')
  const tutorContext = useTutorContext()
  const { activeProfileId } = useActiveProfile()
  const { summary: activeProfileSummary } = useActiveProfileSummary()
  const [savingToNotebook, setSavingToNotebook] = useState<string | null>(null) // messageId being saved
  const [flaggedMessages, setFlaggedMessages] = useState<Set<string>>(new Set())
  const [isTogglingHelp, setIsTogglingHelp] = useState<boolean>(false)
  
  // If selection props are provided, we'll use ChatMessageList for rendering
  const useMessageList = !!selectedMessageId || !!onSelectMessage
  
  // Check if we have topic context to avoid landing page flash
  const hasTopic = Boolean(tutorContext?.selectedTopicId || tutorContext?.selectedTopic)
  
  // CRITICAL: Use providedChatId directly and update when it changes
  // This ensures Notes Mode chatId is used, not a cached tutor chatId
  // DO NOT generate a new chatId if providedChatId is missing - wait for resolution
  const chatId = providedChatId && isValidUUID(providedChatId) ? providedChatId : null
  
  // Update localStorage when chatId changes (for Notes Mode)
  useEffect(() => {
    if (chatId && typeof window !== 'undefined' && isValidUUID(chatId)) {
      localStorage.setItem('forgenursing-chat-id', chatId)
      console.log('[ClinicalTutorWorkspace] Using chatId:', chatId, 'mode:', mode, 'filterMode:', filterMode, 'selectedDocIds:', selectedDocIds.length)
    } else if (!chatId) {
      console.log('[ClinicalTutorWorkspace] Waiting for chatId resolution...', 'mode:', mode)
    }
  }, [chatId, mode, filterMode, selectedDocIds.length])
  const [initialMessages, setInitialMessages] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [chatStatus, setChatStatus] = useState<'active' | 'archived'>('active')
  const [chatSummary, setChatSummary] = useState<string | null>(null)
  const [saveClipModal, setSaveClipModal] = useState<{ isOpen: boolean; messageId: string; content: string }>({ isOpen: false, messageId: '', content: '' })
  const [forgeMapPanel, setForgeMapPanel] = useState<{ isOpen: boolean; messageContent: string }>({ isOpen: false, messageContent: '' })
  const [confusionMap, setConfusionMap] = useState<{ isOpen: boolean; mapMarkdown: string; clarifyingQuestion?: string | null }>({
    isOpen: false,
    mapMarkdown: '',
    clarifyingQuestion: null,
  })
  const [practiceModal, setPracticeModal] = useState<{ isOpen: boolean; messageId: string; content: string }>({
    isOpen: false,
    messageId: '',
    content: '',
  })
  const [examSheetModal, setExamSheetModal] = useState<{ isOpen: boolean; messageId: string; content: string }>({
    isOpen: false,
    messageId: '',
    content: '',
  })
  const { density } = useDensity()
  const tokens = getDensityTokens(density)

  // Debug: Log attachedFiles prop received by ClinicalTutorWorkspace
  useEffect(() => {
    console.log('🔍 ClinicalTutorWorkspace received files:', {
      count: attachedFiles.length,
      files: attachedFiles.map(f => ({ id: f.id, name: f.name, document_type: f.document_type })),
    });
  }, [attachedFiles]);

  // Load chat history
  useEffect(() => {
    if (!chatId) return;

    console.log('[ClinicalTutorWorkspace] Loading history for chatId:', chatId, 'mode:', mode)

    const loadHistory = async () => {
      try {
        const historyUrl = `/api/history?id=${chatId}`
        console.log('[ClinicalTutorWorkspace] Calling /api/history:', historyUrl)
        const response = await fetch(historyUrl);
        const data = await response.json();
        // Handle both old format (array) and new format (object)
        if (Array.isArray(data)) {
          if (data.length > 0) {
            setInitialMessages(data);
          }
        } else {
          if (data.messages && data.messages.length > 0) {
            setInitialMessages(data.messages);
          }
          if (data.chatStatus) {
            setChatStatus(data.chatStatus);
          }
          if (data.chatSummary) {
            setChatSummary(data.chatSummary);
          } else if (data.chatStatus === 'archived') {
            // Generate summary if archived but missing
            try {
              await fetch('/api/chats/archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId }),
              });
              // Reload to get summary
              const summaryResponse = await fetch(`/api/history?id=${chatId}`);
              const summaryData = await summaryResponse.json();
              if (summaryData.chatSummary) {
                setChatSummary(summaryData.chatSummary);
              }
            } catch (error) {
              console.error('[Chat] Error generating summary:', error);
            }
          }
        }
      } catch (error) {
        console.error('[Chat] Error loading history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [chatId]);
  
  // Get topic context for warm start
  const topicTitle = tutorContext.selectedTopic?.title
  const className = tutorContext.selectedClass ? `${tutorContext.selectedClass.code} — ${tutorContext.selectedClass.name}` : undefined
  const selectedClassName = tutorContext.selectedClass?.name || undefined
  
  const requestBody = useMemo(() => {
    // CRITICAL: Always send array, never 'none' or undefined
    const attachedFileIds = Array.isArray(attachedFiles) && attachedFiles.length > 0
      ? attachedFiles.map(f => f.id).filter(id => id) // Filter out any falsy IDs
      : [];
    
    console.log('[ChatInterface] Submitting with files:', {
      attachedFilesCount: attachedFiles.length,
      attachedFileIds: attachedFileIds,
      fileNames: attachedFiles.map(f => f.name),
    });
    
    return {
      chatId, 
      strictMode, 
      filterMode, 
      selectedDocIds, 
      mode,
      topicTitle,
      className,
      selectedClassName,
      attachedFileIds, // Always an array, never 'none'
      activeProfileId,
    };
  }, [chatId, strictMode, filterMode, selectedDocIds, mode, topicTitle, className, selectedClassName, attachedFiles, activeProfileId]);
  
  const { messages, append, isLoading, setMessages } = useChat({
    api: '/api/chat',
    initialMessages: initialMessages,
    body: requestBody,
    onError: (err) => {
      console.error("Chat Error:", err)
      setCustomError(err.message || "Failed to connect to AI")
    },
    onFinish: async (message) => {
      if (message.role === 'assistant' && chatId && message.content) {
        try {
          await fetch('/api/chat/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId,
              role: 'assistant',
              content: message.content,
            }),
          });
        } catch (error) {
          console.error('[Chat] Error saving message:', error);
        }
      }
    },
  });

  useEffect(() => {
    if (initialMessages.length > 0 && !isLoadingHistory) {
      if (messages.length === 0 || 
          (messages.length !== initialMessages.length && 
           JSON.stringify(messages) !== JSON.stringify(initialMessages))) {
        setMessages(initialMessages);
      }
    }
  }, [initialMessages, isLoadingHistory, setMessages]);

  // Load flagged messages from chat metadata
  useEffect(() => {
    if (!chatId) {
      setFlaggedMessages(new Set())
      return
    }

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
        console.error('[ClinicalTutorWorkspace] Error loading flagged messages:', error)
      }
    }

    loadFlaggedMessages()
  }, [chatId])

  // Scroll to specific message if scrollToMessageId is provided
  useEffect(() => {
    if (!scrollToMessageId || !scrollContainerRef?.current) return
    
    let attempts = 0
    const maxAttempts = 30 // Try for up to 3 seconds (30 * 100ms)
    
    const tryScroll = () => {
      attempts++
      const container = scrollContainerRef.current
      if (!container) return
      
      // Find the message element by data attribute
      const messageElement = container.querySelector(`[data-message-id="${scrollToMessageId}"]`) as HTMLElement
      if (messageElement) {
        // Scroll to the message with some offset from top
        const containerRect = container.getBoundingClientRect()
        const elementRect = messageElement.getBoundingClientRect()
        const scrollTop = container.scrollTop + elementRect.top - containerRect.top - 100 // 100px offset from top
        
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        })
        
        // Temporarily highlight the message
        messageElement.style.transition = 'background-color 0.3s'
        messageElement.style.backgroundColor = 'rgba(99, 102, 241, 0.1)' // indigo-50
        setTimeout(() => {
          messageElement.style.backgroundColor = ''
        }, 2000)
      } else if (attempts < maxAttempts) {
        // Message not found yet, try again
        setTimeout(tryScroll, 100)
      }
    }
    
    // Start trying after messages have a chance to load
    setTimeout(tryScroll, 300)
  }, [scrollToMessageId, scrollContainerRef, messages.length]) // Retry when messages change

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
        console.error('[ClinicalTutorWorkspace] Failed to update flagged messages')
      }
    } catch (error) {
      console.error('[ClinicalTutorWorkspace] Error toggling flagged messages:', error)
    } finally {
      setIsTogglingHelp(false)
    }
  }

  // Define handleSendMessage with useCallback after append is available
  const handleSendMessage = useCallback(async (messageText: string, sessionId?: string) => {
    if (!messageText.trim()) return;
    
    setCustomError(''); 
    const trimmedMessage = messageText.trim();
    
    // Use provided sessionId or fall back to chatId
    const effectiveChatId = sessionId || chatId;
    
    try {
      // Save the message to the database FIRST (before sending to AI)
      if (effectiveChatId) {
        try {
          const saveResponse = await fetch('/api/chat/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: effectiveChatId,
              role: 'user',
              content: trimmedMessage,
            }),
          });
          
          if (!saveResponse.ok) {
            console.error('[Chat] Error saving user message:', await saveResponse.text());
            throw new Error('Failed to save message');
          }
        } catch (error) {
          console.error('[Chat] Error saving user message:', error);
          throw error; // Re-throw to prevent sending to AI if save failed
        }
      }
      
      if (!append) {
        throw new Error("Chat initialization failed");
      }
      await append({ role: 'user', content: trimmedMessage });
    } catch (e: any) {
      console.error("Send failed:", e);
      setCustomError(e.message || "Message failed to send.");
    }
  }, [chatId, append]);

  // Track processed messages to prevent duplicates (persist across re-renders)
  const processedMessagesRef = useRef<Set<string>>(new Set())
  
  // Listen for messages from ChatInterface (after handleSendMessage is defined)
  // This listener should catch messages even if chatId changes (e.g., when session is created)
  useEffect(() => {
    if (!append) return
    
    const handleMessage = async (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string; sessionId: string }>
      const { message, sessionId: eventSessionId } = customEvent.detail
      
      // Create a unique key for this message to prevent duplicates
      const messageKey = `${eventSessionId}:${message}`
      if (processedMessagesRef.current.has(messageKey)) {
        console.log('[ClinicalTutorWorkspace] Ignoring duplicate message:', messageKey)
        return
      }
      
      // If chatId matches OR if we don't have a chatId yet (session just created), handle the message
      // This allows the message to be processed even during component re-initialization
      if (message && (eventSessionId === chatId || (!chatId && eventSessionId))) {
        processedMessagesRef.current.add(messageKey)
        
        // If chatId doesn't match yet but we have a sessionId, wait a bit for component to update
        if (eventSessionId !== chatId && eventSessionId) {
          // Wait for chatId to update, then send
          setTimeout(async () => {
            if (eventSessionId === chatId || chatId === eventSessionId) {
              await handleSendMessage(message, eventSessionId)
            }
          }, 100)
        } else {
          await handleSendMessage(message, eventSessionId)
        }
      }
    }
    
    window.addEventListener('tutor-send-message', handleMessage)
    return () => {
      window.removeEventListener('tutor-send-message', handleMessage)
    }
  }, [chatId, append, handleSendMessage])
  
  // Check for prefilled prompt from landing page and auto-send if needed
  // Use a ref to track if we've already processed the auto-send to prevent duplicates
  const autoSendProcessedRef = useRef(false)
  
  useEffect(() => {
    if (!chatId || !append) {
      console.log('[ClinicalTutorWorkspace] Auto-send check skipped:', { chatId: !!chatId, append: !!append })
      return
    }
    
    // Wait for history to finish loading before checking
    if (isLoadingHistory) {
      console.log('[ClinicalTutorWorkspace] Auto-send check skipped - history still loading')
      return
    }
    
    // Check if there's a prefilled message that should be auto-sent
    if (typeof window !== 'undefined' && !autoSendProcessedRef.current) {
      const prefill = localStorage.getItem('forgenursing-tutor-prefill')
      const shouldAutoSend = localStorage.getItem('forgenursing-tutor-auto-send') === 'true'
      
      console.log('[ClinicalTutorWorkspace] Auto-send check:', { 
        hasPrefill: !!prefill, 
        shouldAutoSend, 
        messagesCount: messages.length,
        alreadyProcessed: autoSendProcessedRef.current 
      })
      
      if (prefill && shouldAutoSend) {
        // Mark as processed immediately to prevent duplicate sends
        autoSendProcessedRef.current = true
        
        // Clear the flags immediately
        localStorage.removeItem('forgenursing-tutor-prefill')
        localStorage.removeItem('forgenursing-tutor-auto-send')
        
        // Check if message was already sent (might be in messages from history)
        const userMessageIndex = messages.findIndex(m => 
          m.role === 'user' && m.content.trim() === prefill.trim()
        )
        const messageAlreadySent = userMessageIndex !== -1
        
        // Check if there's already an assistant response after this user message
        let hasAssistantResponse = false
        if (messageAlreadySent) {
          // Check if there's an assistant message after this user message
          hasAssistantResponse = messages.slice(userMessageIndex + 1).some(m => m.role === 'assistant')
        }
        
        console.log('[ClinicalTutorWorkspace] Auto-send decision:', {
          messageAlreadySent,
          hasAssistantResponse,
          willSend: !messageAlreadySent || (messageAlreadySent && !hasAssistantResponse),
          prefillPreview: prefill.substring(0, 50)
        })
        
        // Only send if message wasn't already sent OR if it was sent but no assistant response yet
        if (!messageAlreadySent || (messageAlreadySent && !hasAssistantResponse)) {
          console.log('[ClinicalTutorWorkspace] Auto-sending prefilled message:', prefill.substring(0, 50))
          // Auto-send the message after a short delay to ensure chat is ready
          setTimeout(() => {
            console.log('[ClinicalTutorWorkspace] Executing auto-send now')
            handleSendMessage(prefill, chatId)
          }, 500)
        } else {
          console.log('[ClinicalTutorWorkspace] Skipping auto-send - message already processed with response')
        }
      }
    }
  }, [chatId, append, isLoadingHistory, messages, handleSendMessage])
  
  // Reset the ref when chatId changes (new chat session)
  useEffect(() => {
    autoSendProcessedRef.current = false
  }, [chatId])
  // The user must explicitly press Send to submit the message

  // Note: Scrolling is now handled by TutorSession component
  // This ensures proper scrolling within the chat container, not the entire page

  const handleQuickStart = (prompt: string) => {
    // Trigger send directly (no input to fill)
    handleSendMessage(prompt)
  }

  const quickStartCards = [
    {
      icon: Brain,
      title: 'Explain a concept',
      description: 'Break down a topic step by step.',
      prompt: 'Help me understand this concept: ',
    },
    {
      icon: BookOpenCheck,
      title: 'Work through an example',
      description: 'Practice step-by-step reasoning.',
      prompt: "Let's work through a practice example. ",
    },
    {
      icon: FileText,
      title: 'Review a weak area',
      description: 'Focus where you struggle most.',
      prompt: 'What should I focus on based on my past questions? ',
    },
    {
      icon: Pill,
      title: 'Use my uploaded materials',
      description: 'Study using your program content.',
      prompt: 'Use my uploaded materials to review: ',
    },
  ]

  // Filter to only assistant messages for document blocks
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  const userMessages = messages.filter(m => m.role === 'user');
  
  // Check if we have non-system messages (real conversation history)
  const hasNonSystemHistory = Array.isArray(messages) && messages.some((m) => m.role !== 'system');
  
  // Determine if we should show landing page
  // Only show landing if we do NOT have a topic and do NOT have history
  const hasHistory = hasNonSystemHistory;
  const hasActiveSession = Boolean(chatId);
  const showLanding = !hasTopic && !hasHistory && !hasActiveSession && !isLoadingHistory;
  
  // Defensive deduplication: if last two messages are identical user messages, remove one
  const normalizedMessages = useMemo(() => {
    if (messages.length >= 2) {
      const a = messages[messages.length - 1];
      const b = messages[messages.length - 2];
      if (a.role === 'user' && b.role === 'user' && a.content === b.content) {
        console.log('[ClinicalTutorWorkspace] Removing duplicate user message:', a.content);
        return messages.slice(0, -1);
      }
    }
    return messages;
  }, [messages]);

  return (
    <div className="flex flex-col min-h-full">
      {/* Error Banner */}
      {customError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-center gap-2">
          <span className="font-medium">Error:</span> {customError}
        </div>
      )}

      {/* Archived Chat Banner */}
      {chatStatus === 'archived' && (
        <ArchivedChatBanner summary={chatSummary} />
      )}

      {/* Canvas Area - Document Blocks */}
      <div className="flex flex-col gap-4">
        {isLoadingHistory ? (
          <div className="h-full flex flex-col items-center justify-center text-[#4A5568] space-y-4">
            <BookOpenCheck className="w-12 h-12 animate-pulse text-[#4A5568]" />
            <p className="text-sm">Loading session...</p>
          </div>
        ) : showLanding ? (
          /* Zero State */
          <div className="h-full flex flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg space-y-6">
              <div className="text-center space-y-2">
                <h2 className="font-semibold tracking-tight text-slate-900">
                  Clinical Tutor Ready
                </h2>
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                  How would you like to begin your study session?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickStartCards.map((card, index) => {
                  const Icon = card.icon
                  return (
                    <button
                      key={index}
                      onClick={() => handleQuickStart(card.prompt)}
                      className="bg-[var(--tutor-surface)] border border-[var(--tutor-border-subtle)] rounded-lg p-4 text-left hover:shadow-sm hover:border-[var(--tutor-primary)]/30 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--tutor-primary)]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--tutor-primary)]/20 transition-colors">
                          <Icon className="w-5 h-5 text-[var(--tutor-primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold tracking-tight text-slate-900 mb-1">
                            {card.title}
                          </h3>
                          <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                            {card.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}

        {/* Render conversation - use ChatMessageList if selection is enabled, otherwise use original rendering */}
        {useMessageList ? (
          <ChatMessageList
            messages={normalizedMessages as ChatMessage[]}
            selectedMessageId={selectedMessageId ?? undefined}
            onSelectMessage={onSelectMessage}
            isLoading={isLoading}
            chatId={chatId || undefined}
            strictMode={strictMode}
            onSaveToNotebook={(id) => setSavingToNotebook(id)}
            savingToNotebook={savingToNotebook}
            onSaveClip={(messageId, content) => {
              setSaveClipModal({ isOpen: true, messageId, content })
            }}
            onShowMap={(messageId, content) => {
              setForgeMapPanel({ isOpen: true, messageContent: content })
            }}
            onShowConfusionMap={async (messageId, content) => {
              try {
                const response = await fetch('/api/study-map/confusion', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    messageContent: content,
                    chatId,
                    messageId,
                    profileId: activeProfileId || null,
                  }),
                })
                const payload = await response.json()
                if (response.ok) {
                  setConfusionMap({
                    isOpen: true,
                    mapMarkdown: payload?.map?.map_markdown || '',
                    clarifyingQuestion: payload?.map?.clarifying_question || payload?.clarifyingQuestion || null,
                  })
                } else {
                  console.error('[Confusion Map] Error:', payload?.error)
                }
              } catch (error) {
                console.error('[Confusion Map] Error:', error)
              }
            }}
            onShowPracticeLadder={(messageId, content) => {
              setPracticeModal({ isOpen: true, messageId, content })
            }}
            onShowExamSheet={(messageId, content) => {
              setExamSheetModal({ isOpen: true, messageId, content })
            }}
            onSendMessage={async (message) => {
              await handleSendMessage(message, chatId || undefined)
            }}
          />
        ) : (
          normalizedMessages.map((m, index) => {
          if (m.role === 'assistant') {
            const hasBinderContext = detectBinderUsage(m.content);
            const prevMessage = index > 0 ? normalizedMessages[index - 1] : null;
            const showDivider = prevMessage && prevMessage.role === 'assistant';
            
            // Detect welcome message: first message, contains "Welcome to" pattern
            const isWelcomeMessage = index === 0 && 
              (m.content.includes('Welcome to') || m.content.includes('👋')) &&
              (m.content.includes('study materials') || m.content.includes('I can help you'));
            
            // Show follow-up prompts only on the last assistant message
            const isLastMessage = index === normalizedMessages.length - 1 || 
              (index < normalizedMessages.length - 1 && normalizedMessages[index + 1]?.role === 'user');

            return (
              <div key={m.id} data-message-id={m.id}>
                {/* Subtle divider between document blocks */}
                {showDivider && (
                  <div className="mb-6 md:mb-8 pt-4 border-t border-slate-200"></div>
                )}

                {/* Document Block */}
                <article className={`tutor-card ${isWelcomeMessage ? 'bg-gradient-to-br from-indigo-50/50 to-sky-50/30 border-indigo-200/50' : ''}`}>
                  {/* Grounding Indicator Strip + Actions */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      {hasBinderContext ? (
                        <div className="flex items-center gap-2">
                          <FileIcon className="w-4 h-4 text-teal-600" />
                          <span className="text-xs text-teal-700 font-medium">
                            ✅ Using: {(() => {
                              // Try to extract filenames from message content
                              const filenameMatches = m.content.match(/From\s+["']?([^"'\n]+\.(pdf|docx?|txt))["']?/gi);
                              if (filenameMatches && filenameMatches.length > 0) {
                                const filenames = filenameMatches
                                  .map(match => match.replace(/From\s+["']?/i, '').replace(/["']?/g, ''))
                                  .filter((f, i, arr) => arr.indexOf(f) === i) // dedupe
                                  .slice(0, 3); // max 3
                                return filenames.join(', ') + (filenameMatches.length > 3 ? '...' : '');
                              }
                              // Fallback: check for common patterns
                              const patternMatches = m.content.match(/([A-Z][a-zA-Z0-9_\-]+\.(pdf|docx?|txt))/g);
                              if (patternMatches && patternMatches.length > 0) {
                                const filenames = patternMatches
                                  .filter((f, i, arr) => arr.indexOf(f) === i)
                                  .slice(0, 3);
                                return filenames.join(', ') + (patternMatches.length > 3 ? '...' : '');
                              }
                              return 'your uploaded materials';
                            })()}
                          </span>
                        </div>
                      ) : (
                        <>
                          <ClipboardCheck className="w-4 h-4 text-[var(--tutor-text-muted)]" />
                          <span className="text-xs text-[var(--tutor-text-muted)] font-medium">NCLEX Reasoning (Learning Only)</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setForgeMapPanel({ isOpen: true, messageContent: m.content })}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                        title="Show Concept Map"
                      >
                        <Map className="w-3 h-3" />
                        <span>Concept Map</span>
                      </button>
                      <button
                        onClick={async () => {
                          // Generate deterministic message_id using Web Crypto API
                          const encoder = new TextEncoder()
                          const data = encoder.encode((chatId || '') + m.content)
                          const hashBuffer = await crypto.subtle.digest('SHA-256', data)
                          const hashArray = Array.from(new Uint8Array(hashBuffer))
                          const messageId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
                          setSaveClipModal({ isOpen: true, messageId, content: m.content })
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                        title="Save Learning Moment"
                      >
                        <Bookmark className="w-3 h-3" />
                        <span>Save</span>
                      </button>
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
                          onClick={async () => {
                            if (!tutorContext.selectedTopicId || savingToNotebook === m.id) return
                            
                            setSavingToNotebook(m.id)
                            try {
                              // Get user ID
                              const supabase = createBrowserClient(
                                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                              )
                              const { data: { user } } = await supabase.auth.getUser()
                              if (!user) {
                                console.error('[ClinicalTutorWorkspace] User not authenticated')
                                return
                              }

                              // Extract summary: first 2-3 paragraphs or up to 400 characters
                              const paragraphs = m.content.split('\n\n').filter(p => p.trim())
                              let summary = paragraphs.slice(0, 3).join('\n\n')
                              if (summary.length > 400) {
                                summary = summary.substring(0, 400) + '...'
                              } else if (summary.length === 0 && m.content.length > 0) {
                                // Fallback: take first 400 chars
                                summary = m.content.substring(0, 400) + (m.content.length > 400 ? '...' : '')
                              }

                              await setTopicSummaryAndStudiedAt(user.id, tutorContext.selectedTopicId, summary)
                              
                              // Show brief success feedback
                              setTimeout(() => {
                                setSavingToNotebook(null)
                              }, 2000)
                            } catch (error) {
                              console.error('[ClinicalTutorWorkspace] Error saving to notebook:', error)
                              setSavingToNotebook(null)
                            }
                          }}
                          disabled={savingToNotebook === m.id}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-all duration-200 disabled:opacity-50"
                          title="Save to Notebook"
                        >
                          <Star className={`w-3 h-3 ${savingToNotebook === m.id ? 'animate-spin' : ''}`} />
                          <span>{savingToNotebook === m.id ? 'Saving...' : 'Save to Notebook'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Document Content - Customized Clinical Typography */}
                  {/* Text content constrained for readability, but tables/code can use full width */}
                  <div className="prose prose-slate prose-lg max-w-3xl tutor-content">
                    <MessageWithMedicalTerms
                      content={m.content}
                      markdownComponents={{
                        p: ({children}) => <p className="mb-3 last:mb-0 text-base text-slate-700 leading-relaxed tutor-content">{children}</p>,
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
                              className={`text-lg font-bold tracking-tight text-indigo-900 mb-2 mt-6 first:mt-0 ${isSnapshot ? 'font-bold text-indigo-900 mb-3' : ''}`}
                              {...props}
                            >
                              {children}
                            </h3>
                          )
                        },
                        blockquote: ({children}) => (
                          <blockquote className="border-l-4 border-teal-600 bg-teal-50 text-slate-700 not-italic rounded-xl pl-4 pr-4 py-3 my-4 text-sm sm:text-base leading-relaxed">
                            {children}
                          </blockquote>
                        ),
                      }}
                    />
                  </div>

                  {/* Follow-up prompts - only on last assistant message */}
                  {onSendMessage && (
                    <FollowUpPrompts
                      messageContent={m.content}
                      onPromptClick={async (prompt) => {
                        await onSendMessage(prompt)
                      }}
                      isLastMessage={isLastMessage}
                      gradeBand={activeProfileSummary?.gradeBand}
                    />
                  )}
                </article>
              </div>
            );
          } else {
            // User message - right-aligned bubble
            return (
              <div key={m.id} data-message-id={m.id} className="flex justify-end">
                <div className="ml-auto max-w-[70%]">
                  <div className="inline-block rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-all duration-200 leading-relaxed">
                    {m.content}
                  </div>
                </div>
              </div>
            );
          }
          })
        )}
        
        {isLoading && !useMessageList && (
          <div className="flex justify-center">
            <div className="tutor-card">
              <p className="text-slate-600">Thinking...</p>
            </div>
          </div>
        )}
      </div>

      {/* Save Clip Modal */}
      <SaveClipModal
        isOpen={saveClipModal.isOpen}
        onClose={() => setSaveClipModal({ isOpen: false, messageId: '', content: '' })}
        onSave={async ({ title, folder, tags }) => {
          const safeMessageId = saveClipModal.messageId && isValidUUID(saveClipModal.messageId)
            ? saveClipModal.messageId
            : null
          const response = await fetch('/api/clips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              title,
              content: saveClipModal.content,
              folder,
              tags,
              classId: tutorContext.selectedClassId || null,
              chatId: chatId || null,
              messageId: safeMessageId,
            }),
          })
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to save clip')
          }
          // Close modal on success
          setSaveClipModal({ isOpen: false, messageId: '', content: '' })
        }}
        defaultTitle={saveClipModal.content.substring(0, 50) + (saveClipModal.content.length > 50 ? '...' : '')}
      />

      {/* ForgeMap Panel */}
      <ForgeMapPanel
        isOpen={forgeMapPanel.isOpen}
        onClose={() => setForgeMapPanel({ isOpen: false, messageContent: '' })}
        messageContent={forgeMapPanel.messageContent}
        chatId={chatId}
        mode={filterMode}
        selectedDocIds={
          // In tutor mode, use attachedFiles IDs; otherwise use selectedDocIds prop
          mode === 'tutor' && attachedFiles.length > 0
            ? attachedFiles.map(f => f.id).filter(id => id)
            : selectedDocIds
        }
      />

      <StudyMapPanel
        isOpen={confusionMap.isOpen}
        onClose={() => setConfusionMap({ isOpen: false, mapMarkdown: '', clarifyingQuestion: null })}
        title="Reset Map"
        mapMarkdown={confusionMap.mapMarkdown}
        clarifyingQuestion={confusionMap.clarifyingQuestion || null}
      />

      <PracticeLadderModal
        isOpen={practiceModal.isOpen}
        onClose={() => setPracticeModal({ isOpen: false, messageId: '', content: '' })}
        messageContent={practiceModal.content}
        chatId={chatId}
        messageId={practiceModal.messageId}
        profileId={activeProfileId || null}
      />

      <ExamSheetModal
        isOpen={examSheetModal.isOpen}
        onClose={() => setExamSheetModal({ isOpen: false, messageId: '', content: '' })}
        messageContent={examSheetModal.content}
        chatId={chatId}
        messageId={examSheetModal.messageId}
        profileId={activeProfileId || null}
        topic={tutorContext.selectedTopic?.title || null}
      />

      {/* NO INPUT HERE - ChatInterface in TutorSession handles input */}
    </div>
  )
}


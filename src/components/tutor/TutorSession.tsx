'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, BookOpenCheck } from 'lucide-react'
import ClinicalTutorWorkspace from '@/components/chat/ClinicalTutorWorkspace'
import ChatInterface from '@/components/tutor/ChatInterface'
import TutorEmptyState from '@/components/tutor/TutorEmptyState'
import ChatMessageList, { type ChatMessage } from '@/components/tutor/ChatMessageList'
import { useTutorContext } from '@/components/tutor/TutorContext'
import { listNotebookTopics } from '@/lib/api/notebook'
import { NotebookTopic } from '@/lib/types'
import { getSupabaseBrowser } from '@/lib/supabase/client'

interface TutorSessionProps {
  sessionId?: string // Optional - will be created on first message if missing
  strictMode: boolean
  onStrictModeChange: (strict: boolean) => void
  onSessionCreated?: (sessionId: string) => void // Callback when session is created
  attachedFiles?: { id: string, name: string, document_type: string | null }[] // Attached files from parent
  onDetachFile?: (fileId: string) => void // Callback to detach a file
  messages?: ChatMessage[] // Messages from parent for evidence derivation
  onMessagesChange?: (messages: ChatMessage[]) => void // Callback to update messages in parent
  onTopicsChange?: (topics: NotebookTopic[]) => void // Callback to update topics in parent for header
  scrollToMessageId?: string // Optional message ID to scroll to when messages load
  gradeBand?: 'middle' | 'high'
  mode?: 'tutor' | 'spelling' | 'reading' | 'homework'
}

export default function TutorSession({
  sessionId: propSessionId,
  strictMode,
  onStrictModeChange,
  onSessionCreated,
  attachedFiles: propAttachedFiles = [],
  onDetachFile,
  messages: propMessages = [],
  onMessagesChange: propOnMessagesChange,
  onTopicsChange,
  scrollToMessageId,
  gradeBand,
  mode = 'tutor',
}: TutorSessionProps) {
  const router = useRouter()
  const tutorContext = useTutorContext()
  // Use prop attachedFiles if provided, otherwise use local state
  const [localAttachedFiles, setLocalAttachedFiles] = useState<{ id: string, name: string, document_type: string | null }[]>([])
  const [isLoadingAttachedFiles, setIsLoadingAttachedFiles] = useState(false)
  // Merge prop and local: prop takes precedence for display, but we keep local for updates
  const attachedFiles = propAttachedFiles.length > 0 ? propAttachedFiles : localAttachedFiles
  
  // Evidence state management - use prop messages if provided, otherwise local state
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const messages = propMessages.length > 0 ? propMessages : localMessages
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [savingToNotebook, setSavingToNotebook] = useState<string | null>(null)
  
  // Debug: Log attachedFiles prop flow
  useEffect(() => {
    console.log('🔍 TutorSession attachedFiles state:', {
      propAttachedFilesCount: propAttachedFiles.length,
      localAttachedFilesCount: localAttachedFiles.length,
      finalAttachedFilesCount: attachedFiles.length,
      finalAttachedFiles: attachedFiles.map(f => ({ id: f.id, name: f.name })),
    });
  }, [propAttachedFiles, localAttachedFiles, attachedFiles]);
  
  const [localSessionId, setLocalSessionId] = useState<string | undefined>(propSessionId)
  const [activeChunkCount, setActiveChunkCount] = useState<number>(0)
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState<boolean>(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [availableTopics, setAvailableTopics] = useState<NotebookTopic[]>([])
  const lastLoadedClassIdRef = useRef<string | undefined>(undefined) // Prevent duplicate loads
  const [openerMessage, setOpenerMessage] = useState<string | null>(null)
  const openerSetRef = useRef(false)
  
  // Update localSessionId when prop changes
  useEffect(() => {
    if (propSessionId) {
      setLocalSessionId(propSessionId)
    }
  }, [propSessionId])
  
  // Hide file banner when topic or exam context is active
  const hasStructuredContext = !!(tutorContext.selectedTopicId || tutorContext.activeExamId)
  
  // Use localSessionId for rendering (will be updated when session is created)
  const sessionId = localSessionId
  const hideChatInput = mode === 'spelling'
  const deEmphasizeChatInput = false

  // Check for active binder files
  useEffect(() => {
    const checkActiveFiles = async () => {
      try {
        const response = await fetch('/api/binder', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          const activeFiles = data.files?.filter((f: any) => f.isActive !== false) || []
          setActiveChunkCount(activeFiles.length)
        }
      } catch (error) {
        console.error('[TutorSession] Error checking active files:', error)
      }
    }
    
    checkActiveFiles()
  }, [])

  // Check if user has seen onboarding
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('forgestudy-has-seen-tutor-onboarding')
      setHasSeenOnboarding(seen === 'true')
    }
  }, [])

  // Mark onboarding as seen when files are added
  useEffect(() => {
    if (activeChunkCount > 0 && !hasSeenOnboarding && typeof window !== 'undefined') {
      localStorage.setItem('forgestudy-has-seen-tutor-onboarding', 'true')
      setHasSeenOnboarding(true)
    }
  }, [activeChunkCount, hasSeenOnboarding])

  // Load topics when class is selected
  useEffect(() => {
    const loadTopics = async () => {
      // Prevent duplicate loads for the same classId
      if (lastLoadedClassIdRef.current === tutorContext.selectedClassId) {
        return
      }

      if (!tutorContext.selectedClassId) {
        setAvailableTopics([])
        if (onTopicsChange) {
          onTopicsChange([])
        }
        lastLoadedClassIdRef.current = undefined
        return
      }

      // Mark that we're loading this classId
      lastLoadedClassIdRef.current = tutorContext.selectedClassId

      try {
        const supabase = getSupabaseBrowser()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const topics = await listNotebookTopics(user.id, tutorContext.selectedClassId)
          setAvailableTopics(topics)
          if (onTopicsChange) {
            onTopicsChange(topics)
          }
        }
      } catch (error) {
        console.error('[TutorSession] Failed to load topics:', error)
        setAvailableTopics([])
        if (onTopicsChange) {
          onTopicsChange([])
        }
        // Reset ref on error so we can retry
        lastLoadedClassIdRef.current = undefined
      }
    }

    loadTopics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorContext.selectedClassId]) // Removed onTopicsChange to prevent infinite loops - it's just a callback

  // Stable callback for handling attached files changes
  const handleAttachedFilesChange = useCallback((files: { id: string, name: string, document_type: string | null }[]) => {
    // If we have prop files, we can't update them locally (parent controls them)
    // But we can still update local state for cases where prop is not provided
    if (propAttachedFiles.length === 0) {
      setLocalAttachedFiles(files)
    }
  }, [propAttachedFiles.length])

  // Load attached files from metadata (only if sessionId exists)
  // Note: If propAttachedFiles is provided, we don't load from metadata (parent controls it)
  useEffect(() => {
    if (!sessionId || propAttachedFiles.length > 0) {
      // If parent provides files, don't override them
      if (propAttachedFiles.length === 0) {
        setLocalAttachedFiles([])
      }
      return
    }

    let isCancelled = false
    setIsLoadingAttachedFiles(true)
    fetch(`/api/chats/metadata?chatId=${sessionId}`, {
      credentials: 'include'
    })
      .then(async (metadataRes) => {
        if (isCancelled) return
        if (metadataRes.ok) {
          const metadata = await metadataRes.json()
          
          if (metadata.metadata?.attachedFiles && Array.isArray(metadata.metadata.attachedFiles)) {
            const attachedFilesList: { id: string, name: string, document_type: string | null }[] = 
              metadata.metadata.attachedFiles.map((f: any) => ({
                id: f.id || f.canonicalId || String(f.id || ''),
                name: f.name || f.filename || 'Unknown file',
                document_type: f.document_type !== undefined ? f.document_type : null
              }))
            
            if (!isCancelled && (attachedFilesList.length > 0 || propAttachedFiles.length === 0)) {
              setLocalAttachedFiles(attachedFilesList)
            }
          } else if (metadata.metadata?.attachedFileIds && Array.isArray(metadata.metadata.attachedFileIds)) {
            const allFilesRes = await fetch('/api/binder', { credentials: 'include' })
            if (isCancelled) return
            if (allFilesRes.ok) {
              const allFilesData = await allFilesRes.json()
              const allFiles = allFilesData.files || []
              
              const attachedFilesList: { id: string, name: string, document_type: string | null }[] = 
                metadata.metadata.attachedFileIds
                  .map((id: string) => {
                    const file = allFiles.find((f: any) => f.canonicalId === id || f.id === id)
                    if (file) {
                      return {
                        id: file.canonicalId || file.id,
                        name: file.filename || file.name || 'Unknown file',
                        document_type: file.document_type !== undefined ? file.document_type : null
                      }
                    }
                    return null
                  })
                  .filter((f: any) => f !== null)
              
              if (!isCancelled && (attachedFilesList.length > 0 || propAttachedFiles.length === 0)) {
                setLocalAttachedFiles(attachedFilesList)
              }
            }
          }
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error('[TutorSession] Failed to load attached files:', error)
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingAttachedFiles(false)
        }
      })
    
    return () => {
      isCancelled = true
    }
  }, [sessionId, propAttachedFiles.length]) // Fixed: use propAttachedFiles.length instead of attachedFiles

  // Helper to generate a title for a session based on context
  const generateSessionTitle = async (currentSessionId: string): Promise<string> => {
    try {
      // Prefer topic name if available
      if (tutorContext.selectedTopic?.title) {
        const classInfo = tutorContext.selectedClass
          ? ` — ${tutorContext.selectedClass.code}`
          : ''
        return `${tutorContext.selectedTopic.title}${classInfo}`
      }

      // Fetch messages to get first user message
      const historyResponse = await fetch(`/api/history?id=${currentSessionId}`, {
        credentials: 'include'
      })
      
      if (historyResponse.ok) {
        const messages = await historyResponse.json()
        if (Array.isArray(messages) && messages.length > 0) {
          // Find first user message
          const firstUserMessage = messages.find((msg: any) => msg.role === 'user')
          if (firstUserMessage?.content) {
            // Truncate to 50 chars for title
            const title = firstUserMessage.content.trim().slice(0, 50)
            return title || 'Untitled Session'
          }
        }
      }
    } catch (error) {
      console.error('[TutorSession] Error generating title:', error)
    }
    
    return 'Untitled Session'
  }

  // Handler for starting a new session
  const handleStartNewSession = async () => {
    try {
      // Step A: Archive current session if it has messages
      if (sessionId) {
        try {
          // Check if session has messages
          const historyResponse = await fetch(`/api/history?id=${sessionId}`, {
            credentials: 'include'
          })
          
          if (historyResponse.ok) {
            const messages = await historyResponse.json()
            if (Array.isArray(messages) && messages.length > 0) {
              // Generate and update title
              const newTitle = await generateSessionTitle(sessionId)
              await fetch('/api/chats/update-title', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  chatId: sessionId,
                  title: newTitle
                })
              })
            }
          }
        } catch (error) {
          console.error('[TutorSession] Error archiving session:', error)
          // Continue anyway - don't block new session creation
        }
      }

      // Step B: Create a new session
      const intent = 'new_question'
      
      const payload: any = { intent }
      
      // Include context if available
      if (tutorContext.selectedClassId) {
        payload.classId = tutorContext.selectedClassId
      }
      if (tutorContext.selectedTopicId) {
        payload.topicId = tutorContext.selectedTopicId
      }
      if (tutorContext.activeExamId) {
        payload.examId = tutorContext.activeExamId
      }
      if (tutorContext.selectedTopicFileIds && tutorContext.selectedTopicFileIds.length > 0) {
        payload.fileIds = tutorContext.selectedTopicFileIds
      }
      if (attachedFiles.length > 0) {
        payload.attachedFileIds = attachedFiles.map(f => f.id)
      }
      
      const resolveResponse = await fetch('/api/chats/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      
      if (!resolveResponse.ok) {
        console.error('[TutorSession] Failed to create new session')
        alert('Failed to start new session. Please try again.')
        return
      }
      
      const { chatId } = await resolveResponse.json()
      if (!chatId) {
        console.error('[TutorSession] No chatId returned from resolve')
        alert('Failed to start new session. Please try again.')
        return
      }
      
      // Step C: Reset UI state
      setLocalSessionId(chatId)
      
      // Update URL to include new sessionId
      const params = new URLSearchParams(window.location.search)
      params.set('sessionId', chatId)
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
      
      // Notify parent that session was created
      if (onSessionCreated) {
        onSessionCreated(chatId)
      }
    } catch (error) {
      console.error('[TutorSession] Failed to start new session:', error)
      alert('Failed to start new session. Please try again.')
    }
  }

  // Track file loading in a ref so handleSend can check it without closure staling
  const isLoadingFilesRef = useRef(false);
  isLoadingFilesRef.current = isLoadingAttachedFiles;

  const handleSend = async (message: string) => {
    if (!message.trim()) return

    // Wait for attached files to finish loading before sending
    if (isLoadingFilesRef.current) {
      console.log('[TutorSession] Waiting for attached files to load...');
      await new Promise<void>(resolve => {
        const check = setInterval(() => {
          if (!isLoadingFilesRef.current) { clearInterval(check); resolve(); }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 3000);
      });
    }

    let effectiveSessionId = sessionId
    const scrollToBottom = () => {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    }

    // Create session if it doesn't exist
    if (!effectiveSessionId) {
      try {
        // Determine intent based on mode
        const intent = 'new_question'
        
        // Build payload with context
        const payload: any = { intent }
        
        // Include context if available
        if (tutorContext.selectedClassId) {
          payload.classId = tutorContext.selectedClassId
        }
        if (tutorContext.selectedTopicId) {
          payload.topicId = tutorContext.selectedTopicId
        }
        if (tutorContext.activeExamId) {
          payload.examId = tutorContext.activeExamId
        }
        // Include topic fileIds if available (from attached materials in notebook)
        if (tutorContext.selectedTopicFileIds && tutorContext.selectedTopicFileIds.length > 0) {
          payload.fileIds = tutorContext.selectedTopicFileIds
        }
        if (attachedFiles.length > 0) {
          payload.attachedFileIds = attachedFiles.map(f => f.id)
        }
        
        
        const resolveResponse = await fetch('/api/chats/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        
        if (!resolveResponse.ok) {
          console.error('[TutorSession] Failed to create session')
          alert('Failed to create session. Please try again.')
          throw new Error('Failed to create session')
        }
        
        const { chatId } = await resolveResponse.json()
        if (!chatId) {
          console.error('[TutorSession] No chatId returned from resolve')
          alert('Failed to create session. Please try again.')
          throw new Error('No chatId returned')
        }
        
        effectiveSessionId = chatId
        
        // Update local state immediately so UI re-renders with the new session
        setLocalSessionId(chatId)
        
        // Update URL to include sessionId (without reload)
        const params = new URLSearchParams(window.location.search)
        params.set('sessionId', chatId)
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
        
        // Notify parent that session was created
        if (onSessionCreated) {
          onSessionCreated(chatId)
        }
      } catch (error) {
        console.error('[TutorSession] Failed to create session:', error)
        throw error // Re-throw so ChatInterface can handle it
      }
    }

    // Dispatch the event to trigger AI response
    // ClinicalTutorWorkspace will handle saving the message
    // If session was just created, wait longer for ClinicalTutorWorkspace to re-initialize
    const delay = !sessionId ? 500 : 100 // Longer delay if session was just created
    
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('tutor-send-message', { 
        detail: { 
          message: message.trim(), 
          sessionId: effectiveSessionId,
          // classId and topicId will be available via TutorContext in the chat API
        } 
      }))
    }, delay)

    setTimeout(scrollToBottom, Math.max(150, delay))
  }

  // Auto-send opening message when session is empty on mount
  useEffect(() => {
    if (sessionId) return // existing session — history will load
    if (openerSetRef.current) return // already set

    const topicTitle = tutorContext.selectedTopic?.title || tutorContext.selectedTopicTitle
    const topicId = tutorContext.selectedTopicId

    if (topicId && !topicTitle) return // wait for title to load

    openerSetRef.current = true

    if (topicId && topicTitle) {
      setOpenerMessage(
        `You're working on "${topicTitle}" — let's dig in. What's your current understanding of this topic? Walk me through the key concepts you've covered so far.`
      )
    } else {
      setOpenerMessage(
        "What would you like to study today? You can ask me about anything from your classes, or tell me what you're working on and we'll figure it out together."
      )
    }
  }, [sessionId, tutorContext.selectedTopicId, tutorContext.selectedTopicTitle, tutorContext.selectedTopic])

  const hasMessages = !!sessionId

  // Calculate attached context for ChatInterface
  const attachedFilesCount = attachedFiles.length
  const attachedTypes = attachedFiles
    .map(f => f.document_type)
    .filter((dt): dt is string => dt !== null && dt !== undefined) as string[]
  
  let attachedContext: 'none' | 'syllabus' | 'textbook' | 'mixed' = 'none'
  if (attachedFilesCount > 0) {
    const uniqueTypes = Array.from(new Set(attachedTypes))
    if (uniqueTypes.length === 1 && uniqueTypes[0] === 'syllabus') {
      attachedContext = 'syllabus'
    } else if (uniqueTypes.length === 1 && (uniqueTypes[0] === 'textbook' || uniqueTypes[0] === 'reference')) {
      attachedContext = 'textbook'
    } else if (uniqueTypes.length > 1) {
      attachedContext = 'mixed'
    } else if (uniqueTypes.length === 0) {
      attachedContext = 'textbook'
    }
  }

  // Scroll to specific message if scrollToMessageId is provided
  // This effect tries multiple times to find the message element as messages load asynchronously
  useEffect(() => {
    if (!scrollToMessageId || !scrollContainerRef.current) return
    
    let attempts = 0
    const maxAttempts = 20 // Try for up to 2 seconds (20 * 100ms)
    
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
    
    // Start trying after a short delay to allow initial render
    setTimeout(tryScroll, 200)
  }, [scrollToMessageId, sessionId]) // Use sessionId as dependency to retry when session changes

  // Auto-scroll to bottom when messages change (unless scrollToMessageId is set)
  useEffect(() => {
    if (scrollToMessageId) return
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [messages.length, scrollToMessageId, sessionId])

  // Listen for scroll events to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100

      // Show button if user has scrolled up
      setShowScrollToBottom(!isNearBottom)
    }

    container.addEventListener('scroll', handleScroll)
    // Check initial state
    handleScroll()

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Force scroll to bottom when a send event fires
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleForceScroll = (event: Event) => {
      const container = scrollContainerRef.current
      if (!container) return
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    }

    window.addEventListener('tutor-scroll-to-bottom', handleForceScroll as EventListener)
    return () => {
      window.removeEventListener('tutor-scroll-to-bottom', handleForceScroll as EventListener)
    }
  }, [])

  const handleScrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
      {/* Scrollable messages OR landing */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pr-1 min-h-0">
        {hasMessages ? (
          <>
            <ClinicalTutorWorkspace
              key={sessionId}
              strictMode={strictMode}
              chatId={sessionId}
              filterMode="mixed"
              mode="tutor"
              attachedFiles={attachedFiles}
              selectedMessageId={selectedMessageId}
              onSelectMessage={setSelectedMessageId}
              scrollToMessageId={scrollToMessageId}
              scrollContainerRef={scrollContainerRef}
              onMessagesChange={(msgs) => {
                const chatMessages = msgs as ChatMessage[]
                if (propOnMessagesChange) {
                  // Parent manages messages
                  propOnMessagesChange(chatMessages)
                } else if (propMessages.length === 0) {
                  // Local state management
                  setLocalMessages(chatMessages)
                }
              }}
            />
            <div ref={bottomRef} />
          </>
        ) : openerMessage ? (
          <div className="flex flex-col gap-4 p-4 pt-8">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <BookOpenCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 leading-relaxed">
                {openerMessage}
              </div>
            </div>
          </div>
        ) : activeChunkCount === 0 && !sessionId && !tutorContext.selectedClassId ? (
          // Only show empty state if there's no active session, no files, AND no class selected
          // If a class is selected, the landing page will show the welcome message instead
          <TutorEmptyState
            activeChunkCount={activeChunkCount}
            hasSeenOnboarding={hasSeenOnboarding}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-slate-600 text-sm">
                What would you like to study today?
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Scroll to bottom button - appears when user scrolls up */}
      {showScrollToBottom && (
        <button
          onClick={handleScrollToBottom}
          className="absolute bottom-24 right-6 z-20 p-2.5 rounded-full bg-white/90 backdrop-blur-sm border border-slate-300 shadow-lg text-slate-500 hover:text-emerald-600 hover:bg-white hover:border-emerald-400 hover:shadow-xl transition-all duration-200 opacity-70 hover:opacity-100"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Chat input docked at bottom */}
      {!hideChatInput && (
        <div className={`flex-shrink-0 ${deEmphasizeChatInput ? 'opacity-80' : ''}`}>
          <ChatInterface
            sessionId={sessionId}
            onSend={handleSend}
            initialPrompt={(() => {
              if (tutorContext.selectedTopic) {
                const classInfo = tutorContext.selectedClass
                  ? ` from ${tutorContext.selectedClass.code} — ${tutorContext.selectedClass.name}`
                  : ''
                return `I want to study ${tutorContext.selectedTopic.title}${classInfo}. Please explain it step by step at my level and then quiz me with practice questions.`
              }
              if (tutorContext.selectedTopicTitle) {
                return `I want to study ${tutorContext.selectedTopicTitle}. Please explain it step by step at my level and then quiz me with practice questions.`
              }
              return undefined
            })()}
            attachedFiles={attachedFiles}
            attachedContext={attachedContext}
            onDetach={onDetachFile}
          />
        </div>
      )}
    </div>
  )
}


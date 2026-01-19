'use client'

import TutorLanding from '@/components/tutor/TutorLanding'
import TutorSession from '@/components/tutor/TutorSession'
import TutorHeader from '@/components/tutor/TutorHeader'
import ChatInterface from '@/components/tutor/ChatInterface'
import { TutorProvider, useTutorContext } from '@/components/tutor/TutorContext'
import { useDensity } from '@/contexts/DensityContext'
import { getDensityTokens } from '@/lib/density-tokens'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { ChatMessage } from '@/components/tutor/ChatMessageList'
import { useActiveProfileSummary } from '@/hooks/useActiveProfileSummary'

// Component that uses useSearchParams - must be wrapped in Suspense
function TutorPageContent() {
  // ============================================
  // ALL HOOKS FIRST - No conditionals above this
  // ============================================
  const tutorContext = useTutorContext()
  const { density } = useDensity()
  const tokens = getDensityTokens(density)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { summary: activeProfileSummary } = useActiveProfileSummary()
  
  // State hooks
  const [strictMode, setStrictMode] = useState(false)
  const [resolvedChatId, setResolvedChatId] = useState<string | null>(null)
  const [sessionType, setSessionType] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [instantInputValue, setInstantInputValue] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<{ id: string, name: string, document_type: string | null }[]>([])
  const [isLoadingAttachedFiles, setIsLoadingAttachedFiles] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  
  // Refs
  const prevTopicIdRef = useRef<string | undefined>(undefined)
  const prevExamIdRef = useRef<string | undefined>(undefined)
  const isResolvingRef = useRef(false) // Prevent infinite loops from router.replace
  const lastResolvedParamsRef = useRef<string>('') // Track last resolved params to prevent re-resolution
  const skipAutoResumeRef = useRef(false) // Track if we should skip auto-resume (e.g., after "New Chat" click)
  const hasManualToneRef = useRef(false)
  
  // URL params
  const intentParam = searchParams.get('intent')
  const sessionIdParam = searchParams.get('sessionId') || searchParams.get('chatId') || searchParams.get('id')
  const classIdParam = searchParams.get('classId') // Get classId from URL
  const messageIdParam = searchParams.get('messageId') // Get messageId from URL for scrolling
  const modeParam = searchParams.get('mode')

  const entryMode = modeParam && ['spelling', 'reading', 'homework'].includes(modeParam)
    ? (modeParam as 'spelling' | 'reading' | 'homework')
    : null
  const entryPrompt = useMemo(() => {
    if (!entryMode) return ''
    const prefillMap: Record<typeof entryMode, string> = {
      spelling: 'Help me practice spelling words. Start with 5 words and a quick check.',
      reading: 'Help me practice reading comprehension with a short passage and 2-3 questions.',
      homework: 'Help me plan my homework steps and get started with the first problem.',
    }
    return prefillMap[entryMode]
  }, [entryMode])
  const isEntryMode = !!entryMode
  const isElementarySpelling = activeProfileSummary?.gradeBand === 'elementary' && entryMode === 'spelling'
  
  // Note: classId sync is handled by TutorContext itself (see TutorContext.tsx useEffect)
  // No need to sync here - it would create infinite loops
  
  // Callbacks - MUST be defined before any returns
  const handleAttachedFilesChange = useCallback((files: { id: string, name: string, document_type: string | null }[]) => {
    console.log("🔍 [TutorPage] Setting attached files:", {
      count: files.length,
      files: files.map(f => ({ id: f.id, name: f.name, document_type: f.document_type }))
    })
    setAttachedFiles(files)
  }, [])

  const handleStrictModeChange = useCallback((next: boolean) => {
    hasManualToneRef.current = true
    setStrictMode(next)
  }, [])

  // Handler to detach a single file
  const handleDetachFile = useCallback((fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])
  
  const handleSessionCreated = useCallback((newSessionId: string) => {
    // Update resolvedChatId so we don't flip back to landing
    setResolvedChatId(newSessionId)
  }, [])
  
  const buildTutorUrl = useCallback((chatId?: string) => {
    const params = new URLSearchParams()
    if (entryMode) {
      params.set('mode', entryMode)
    }
    if (chatId) {
      params.set('sessionId', chatId)
    }
    if (tutorContext.selectedClassId) {
      params.set('classId', tutorContext.selectedClassId)
    }
    return `/tutor?${params.toString()}`
  }, [entryMode, tutorContext.selectedClassId])

  const handleNewSession = useCallback(async () => {
    const intent = 'new_question'

    try {
      const resolveResponse = await fetch('/api/chats/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ intent }),
      })

      if (!resolveResponse.ok) {
        console.error('[TutorPage] Failed to create session')
        setError('Failed to create session. Please try again.')
        return
      }

      const { chatId } = await resolveResponse.json()
      if (!chatId) {
        console.error('[TutorPage] No chatId returned from resolve')
        setError('Failed to create session. Please try again.')
        return
      }

      // Navigate to the new session
      router.push(buildTutorUrl(chatId))
    } catch (error) {
      console.error('[TutorPage] Failed to create new session:', error)
      setError('Failed to create session. Please try again.')
    }
  }, [router, buildTutorUrl])
  
  const handleInstantStart = useCallback(async (message: string) => {
    if (!message.trim()) return

    const intent = 'new_question'

    try {
      // Step 1: Create the session
      const resolveResponse = await fetch('/api/chats/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          intent,
          // Include attachedFileIds if any are selected
          ...(attachedFiles.length > 0 && { attachedFileIds: attachedFiles.map(f => f.id) }),
          // Include classId and topicId if present (for Notebook context)
          ...(tutorContext.selectedClassId && { classId: tutorContext.selectedClassId }),
          ...(tutorContext.selectedTopicId && { topicId: tutorContext.selectedTopicId }),
        }),
      })

      if (!resolveResponse.ok) {
        console.error('[TutorPage] Failed to create session')
        setError('Failed to create session. Please try again.')
        return
      }

      const { chatId } = await resolveResponse.json()
      if (!chatId) {
        console.error('[TutorPage] No chatId returned from resolve')
        setError('Failed to create session. Please try again.')
        return
      }

      // Step 2: Wait a moment to ensure welcome message (if any) is committed
      // This is especially important when classId is present and a welcome message was seeded
      if (tutorContext.selectedClassId) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // Step 3: Store message in localStorage for the chat to pick up and auto-send
      // Don't save the message here - let handleSendMessage do it to ensure proper flow
      if (typeof window !== 'undefined') {
        localStorage.setItem('forgenursing-tutor-prefill', message.trim())
        localStorage.setItem('forgenursing-tutor-auto-send', 'true')
      }
      
      router.push(buildTutorUrl(chatId))
    } catch (error) {
      console.error('[TutorPage] Failed to start session:', error)
      setError('Failed to start session. Please try again.')
    }
  }, [attachedFiles, tutorContext.selectedClassId, tutorContext.selectedTopicId, router, buildTutorUrl])

  // Unified send handler for both landing and session states
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return

    if (resolvedChatId) {
      // We have a session - dispatch event for TutorSession to handle
      window.dispatchEvent(new CustomEvent('tutor-send-message', { 
        detail: { 
          message: message.trim(), 
          sessionId: resolvedChatId,
        } 
      }))
    } else {
      // No session yet - use handleInstantStart
      await handleInstantStart(message)
    }
  }, [resolvedChatId, handleInstantStart])
  
  // Computed values (derived from state, not hooks)
  const attachedFilesCount = attachedFiles.length
  const hasAttachedFiles = attachedFilesCount > 0
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
  
  const hasStructuredContext = !!(tutorContext.selectedClassId || tutorContext.selectedTopicId || tutorContext.activeExamId)
  
  // Effect hooks - all defined before any returns
  useEffect(() => {
    console.log("[Tutor Page] attachedFiles changed:", {
      count: attachedFiles.length,
      files: attachedFiles.map(f => ({ id: f.id, name: f.name, document_type: f.document_type })),
      attachedTypes,
      attachedContext,
      hasAttachedFiles
    })
  }, [attachedFiles, attachedContext, attachedTypes, hasAttachedFiles])

  useEffect(() => {
    if (hasManualToneRef.current) return
    if (!activeProfileSummary?.gradeBand) return

    if (activeProfileSummary.gradeBand === 'high') {
      setStrictMode(true)
    } else {
      setStrictMode(false)
    }
  }, [activeProfileSummary?.gradeBand])

  useEffect(() => {
    if (searchParams.get('mode') === 'notes') {
      router.replace('/tutor')
    }
  }, [router, searchParams])

  const prevClassIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const currentTopicId = tutorContext.selectedTopicId
    const currentExamId = tutorContext.activeExamId
    const currentClassId = tutorContext.selectedClassId

    // If topic, exam, or class changed, clear session to start fresh
    if (
      (currentTopicId && currentTopicId !== prevTopicIdRef.current) ||
      (currentExamId && currentExamId !== prevExamIdRef.current) ||
      (currentClassId !== prevClassIdRef.current) // Class changed
    ) {
      console.log('[Tutor] Context changed (topic, exam, or class), resetting session', {
        topicId: currentTopicId,
        examId: currentExamId,
        classId: currentClassId,
        prevTopicId: prevTopicIdRef.current,
        prevExamId: prevExamIdRef.current,
        prevClassId: prevClassIdRef.current,
      })
      
      // Clear resolved session to force fresh start
      setResolvedChatId(null)
      setAttachedFiles([]) // Clear attached files when context changes
      
      // Update refs
      prevTopicIdRef.current = currentTopicId
      prevExamIdRef.current = currentExamId
      prevClassIdRef.current = currentClassId
    } else {
      // Update refs even if no change (for initial mount)
      prevTopicIdRef.current = currentTopicId
      prevExamIdRef.current = currentExamId
      prevClassIdRef.current = currentClassId
    }
  }, [tutorContext.selectedTopicId, tutorContext.activeExamId, tutorContext.selectedClassId])

  useEffect(() => {
    const resolveSession = async () => {
      // Create a unique key for this resolution attempt (include classId to detect class changes)
      const paramsKey = `${intentParam || ''}-${sessionIdParam || ''}-${tutorContext.selectedClassId || ''}`
      
      // Prevent infinite loops: if we're already resolving the same params, skip
      if (isResolvingRef.current && lastResolvedParamsRef.current === paramsKey) {
        console.log('[Tutor] Already resolving with same params, skipping:', paramsKey)
        return
      }
      
      // Prevent re-resolution of the same params (only if we have a resolved chatId)
      if (lastResolvedParamsRef.current === paramsKey && resolvedChatId && sessionIdParam && resolvedChatId === sessionIdParam) {
        console.log('[Tutor] Already resolved these params, skipping:', paramsKey)
        return
      }
      
      isResolvingRef.current = true
      lastResolvedParamsRef.current = paramsKey
      setIsResolving(true)
      setError(null)
      
      console.log('[Tutor] Resolve Session - Params:', {
        intent: intentParam,
        sessionId: sessionIdParam,
        topicId: tutorContext.selectedTopicId,
        examId: tutorContext.activeExamId,
        classId: tutorContext.selectedClassId,
      })

      // PRIORITY 0: If intent is new_question, create a new chat (skip auto-resume)
      if (intentParam === 'new_question') {
        console.log('[Tutor] New chat intent detected, will create fresh chat on first message')
        setResolvedChatId(null)
        setIsResolving(false)
        isResolvingRef.current = false
        skipAutoResumeRef.current = true // Set flag to skip auto-resume after clearing intent
        // Clear intent from URL to prevent re-triggering
        const params = new URLSearchParams(searchParams.toString())
        params.delete('intent')
        // Update paramsKey to mark this as resolved so auto-resume doesn't trigger
        lastResolvedParamsRef.current = `${''}-${''}-${tutorContext.selectedClassId || ''}`
        router.replace(`/tutor?${params.toString()}`)
        return
      }

      // PRIORITY 0.5: If entry mode is set, start fresh without auto-resume
      if (entryMode && !sessionIdParam && !intentParam) {
        setResolvedChatId(null)
        setIsResolving(false)
        isResolvingRef.current = false
        return
      }

      // PRIORITY 0.75: If topicId or examId is present but no sessionId, start fresh (don't auto-resume)
      // But still render TutorSession (it will create session on first message)
      if ((tutorContext.selectedTopicId || tutorContext.activeExamId) && !sessionIdParam && !intentParam) {
        console.log('[Tutor] Topic/exam context active, starting fresh (session will be created on first message)')
        setResolvedChatId(null)
        setIsResolving(false)
        isResolvingRef.current = false
        return
      }

      // PRIORITY 1: If explicit sessionId provided, verify it matches current class context
      if (sessionIdParam) {
        // First, check if the sessionId's class matches the current class context
        // We need to fetch the chat metadata to verify
        try {
          const metadataRes = await fetch(`/api/chats/metadata?chatId=${sessionIdParam}`, {
            credentials: 'include'
          })
          
          if (metadataRes.ok) {
            const metadata = await metadataRes.json()
            const chatClassId = metadata.metadata?.classId || metadata.metadata?.class_id
            // Use classId from URL first (from navigation), then fall back to context
            const urlClassId = classIdParam || undefined
            const contextClassId = tutorContext.selectedClassId || undefined
            const currentClassId = urlClassId || contextClassId
            
            // Normalize both to undefined for comparison
            const normalizedChatClassId = chatClassId || undefined
            const normalizedCurrentClassId = currentClassId || undefined
            
            // Use URL classId as the source of truth when present (from navigation)
            // This prevents race conditions with context syncing
            const effectiveClassId = urlClassId || contextClassId
            
            // Check if chat's class matches the effective class (URL or context)
            // Match if: both are undefined/null (General Tutor), or both have the same classId
            const normalizedEffectiveClassId = effectiveClassId || undefined
            const classMatches = normalizedChatClassId === normalizedEffectiveClassId
            
            if (!classMatches) {
              console.log('[Tutor] SessionId class mismatch - updating URL to match chat', {
                sessionId: sessionIdParam,
                chatClassId: chatClassId || 'General',
                urlClassId: urlClassId || 'General',
                contextClassId: contextClassId || 'General',
                effectiveClassId: effectiveClassId || 'General'
              })
              
              // Update URL to match chat's classId (if URL doesn't already have it)
              // This will trigger context sync naturally without clearing sessionId
              const newParams = new URLSearchParams(searchParams.toString())
              if (normalizedChatClassId) {
                newParams.set('classId', normalizedChatClassId)
              } else {
                newParams.delete('classId')
              }
              
              // Update paramsKey to prevent re-resolution
              lastResolvedParamsRef.current = `${intentParam || ''}-${sessionIdParam || ''}-${normalizedChatClassId || ''}`
              router.replace(`/tutor?${newParams.toString()}`)
              setIsResolving(false)
              isResolvingRef.current = false
              return
            }
          }
        } catch (error) {
          console.error('[Tutor] Error checking session metadata, proceeding anyway:', error)
          // Continue with normal flow if metadata check fails
        }
        
        console.log('[Tutor] Using explicit sessionId:', sessionIdParam)
        setResolvedChatId(sessionIdParam)
        
        // Load attached files from chat metadata (non-blocking)
        // Only load if we're not currently in the middle of a user-initiated attachment
        setIsLoadingAttachedFiles(true)
        fetch(`/api/chats/metadata?chatId=${sessionIdParam}`, {
          credentials: 'include'
        })
          .then(async (metadataRes) => {
            if (metadataRes.ok) {
              const metadata = await metadataRes.json()
              
              console.log('[Tutor Page] Raw metadata from API:', metadata)
              
              // PRIORITY: Use attachedFiles directly from metadata if available (has document_type)
              if (metadata.metadata?.attachedFiles && Array.isArray(metadata.metadata.attachedFiles)) {
                const attachedFilesList: { id: string, name: string, document_type: string | null }[] = 
                  metadata.metadata.attachedFiles.map((f: any) => ({
                    id: f.id || f.canonicalId || String(f.id || ''),
                    name: f.name || f.filename || 'Unknown file',
                    document_type: f.document_type !== undefined ? f.document_type : null
                  }))
                
                console.log('[Tutor Page] Loaded attachedFiles directly from metadata:', {
                  count: attachedFilesList.length,
                  files: attachedFilesList.map(f => ({ id: f.id, name: f.name, document_type: f.document_type }))
                })
                
                // Only update if we have files (don't overwrite with empty array if user just attached)
                if (attachedFilesList.length > 0 || attachedFiles.length === 0) {
                  setAttachedFiles(attachedFilesList)
                } else {
                  console.log('[Tutor Page] Skipping metadata load - user has local changes')
                }
              } 
              // FALLBACK: If only attachedFileIds exist, fetch full objects from Binder API
              else if (metadata.metadata?.attachedFileIds && Array.isArray(metadata.metadata.attachedFileIds)) {
                console.log('[Tutor Page] Fallback: Loading from attachedFileIds (legacy)')
                const allFilesRes = await fetch('/api/binder', { credentials: 'include' })
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
                  
                  // Only update if we have files (don't overwrite with empty array if user just attached)
                  if (attachedFilesList.length > 0 || attachedFiles.length === 0) {
                    setAttachedFiles(attachedFilesList)
                  }
                }
              } else {
                console.log('[Tutor Page] No attached files in metadata')
                // Only set empty if we don't have local state
                if (attachedFiles.length === 0) {
                  setAttachedFiles([])
                }
              }
            }
          })
          .catch((error) => {
            console.error('[Tutor] Failed to load attached files:', error)
          })
          .finally(() => {
            setIsLoadingAttachedFiles(false)
          })
        
        setIsResolving(false)
        isResolvingRef.current = false
        return
      }

      // PRIORITY 2: Handle intent-based resolution
      if (intentParam) {
        try {
          // Get payload from sessionStorage if available
          let payload: any = {}
          if (typeof window !== 'undefined') {
            const reflectionText = sessionStorage.getItem('forgenursing-reflection-text')
            const snapshotText = sessionStorage.getItem('forgenursing-snapshot-text')
            if (reflectionText) {
              payload.reflectionText = reflectionText
              sessionStorage.removeItem('forgenursing-reflection-text')
            }
            if (snapshotText) {
              payload.snapshotText = snapshotText
              sessionStorage.removeItem('forgenursing-snapshot-text')
            }
          }

          // Include classId and topicId from context or URL if present
          // Check both context and URL param (context might not be synced yet)
          const effectiveClassId = tutorContext.selectedClassId || classIdParam
          const effectiveTopicId = tutorContext.selectedTopicId
          
          if (effectiveClassId) {
            payload.classId = effectiveClassId
            console.log('[Tutor] Including classId in resolve:', effectiveClassId)
          }
          if (effectiveTopicId) {
            payload.topicId = effectiveTopicId
          }

          const response = await fetch('/api/chats/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ intent: intentParam, ...payload }),
          })

          if (!response.ok) {
            const data = await response.json()
            console.error('[Tutor] Resolve API error:', data)
            
            // For resume_last, if no sessions exist, show empty state
            if (intentParam === 'resume_last' && data.requiresEmptyState) {
            setResolvedChatId(null)
            setError(null) // No error, just no sessions
            setIsResolving(false)
            isResolvingRef.current = false
            return
          }
          
          setError('Failed to load session. Please try again.')
          setIsResolving(false)
          isResolvingRef.current = false
          return
          }

          const { chatId, mode, session_type } = await response.json()
          
          if (!chatId) {
          // No chat found (e.g., resume_last with no sessions)
          setResolvedChatId(null)
          setSessionType(null)
          setError(null)
          setIsResolving(false)
          isResolvingRef.current = false
          return
          }

          // Store session type if provided
          if (session_type) {
            setSessionType(session_type)
          }

          // Redirect to sessionId-based URL for clean state
          console.log('[Tutor] Resolved to chatId:', chatId, 'Redirecting...')
          isResolvingRef.current = false // Reset before redirect
          router.replace(buildTutorUrl(chatId))
          // The redirect will trigger this effect again with sessionId, but the guard will prevent re-resolution
          return
        } catch (error) {
          console.error('[Tutor] Failed to resolve intent:', error)
          setError('Failed to load session. Please try again.')
          setIsResolving(false)
          isResolvingRef.current = false
          return
        }
      }

      // PRIORITY 3: Auto-resume most recent active session for current mode
      // Only if no explicit sessionId, intent, or notes params
      // Now supports both General Tutor and class-specific chats
      // Skip auto-resume if flag is set (user clicked "New Chat")
      if (skipAutoResumeRef.current) {
        console.log('[Tutor] Skipping auto-resume - user requested new chat')
        setResolvedChatId(null)
        setIsResolving(false)
        isResolvingRef.current = false
        skipAutoResumeRef.current = false // Reset flag after skipping
        return
      }
      
      try {
        console.log('[Tutor] No session specified, attempting auto-resume for classId:', tutorContext.selectedClassId || 'General Tutor')
        
        // Build API URL - for General Tutor, explicitly request null classId
        // For class-specific, filter by classId
        const listUrl = tutorContext.selectedClassId 
          ? `/api/chats/list?classId=${tutorContext.selectedClassId}`
          : '/api/chats/list?classId=null' // Explicitly request General Tutor chats
        
        const response = await fetch(listUrl, {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          const chats = data.chats || []
          
          // Tutor mode: general, question, snapshot (or null/undefined)
          let filteredChats = chats.filter((chat: any) => 
            !chat.session_type || 
            chat.session_type === 'general' || 
            chat.session_type === 'question' || 
            chat.session_type === 'snapshot'
          )
          
          // Filter chats by class context
          if (tutorContext.selectedClassId) {
            // For class-specific: only show chats for this class
            filteredChats = filteredChats.filter((chat: any) => {
              const chatClassId = chat.metadata?.classId || chat.metadata?.class_id
              return chatClassId === tutorContext.selectedClassId
            })
          } else {
            // For General Tutor: only show chats without a classId
            filteredChats = filteredChats.filter((chat: any) => {
              const chatClassId = chat.metadata?.classId || chat.metadata?.class_id
              return !chatClassId
            })
          }
          
          // Get most recent active chat for this mode and class context
          if (filteredChats.length > 0) {
            // Chats are already sorted by updated_at desc from API
            const mostRecent = filteredChats[0]
            console.log('[Tutor] Auto-resuming most recent session for mode:', {
              chatId: mostRecent.id,
              session_type: mostRecent.session_type,
              title: mostRecent.title,
              classId: tutorContext.selectedClassId || 'General Tutor'
            })
            // Update paramsKey to prevent re-resolution
            lastResolvedParamsRef.current = `${intentParam || ''}-${mostRecent.id}-${tutorContext.selectedClassId || ''}`
            isResolvingRef.current = false // Reset before redirect
            router.replace(buildTutorUrl(mostRecent.id))
            return // Will trigger effect again with sessionId, but the guard will prevent re-resolution
          } else {
            // No chat found for this context - show empty state
            console.log('[Tutor] No chat found for context:', tutorContext.selectedClassId || 'General Tutor')
            setResolvedChatId(null)
            setIsResolving(false)
            isResolvingRef.current = false
            return
          }
        }
        
        // No active sessions found for this mode, show empty state
        console.log('[Tutor] No active sessions found, showing empty state')
        setResolvedChatId(null)
        setSessionType(null)
        setError(null)
        setIsResolving(false)
        isResolvingRef.current = false
      } catch (error) {
        console.error('[Tutor] Auto-resume error:', error)
        // On error, show empty state (don't block user)
        setResolvedChatId(null)
        setSessionType(null)
        setError(null)
        setIsResolving(false)
        isResolvingRef.current = false
      }
    }

    // Only resolve if params actually changed
    // Include classIdParam in the check to prevent loops when URL classId changes
    const currentParams = `${intentParam || ''}-${sessionIdParam || ''}-${classIdParam || ''}`
    if (lastResolvedParamsRef.current !== currentParams || !resolvedChatId) {
      resolveSession()
    }
            // eslint-disable-next-line react-hooks/exhaustive-deps
          }, [intentParam, sessionIdParam, classIdParam, entryMode]) // Use classIdParam from URL instead of context to prevent loops

  useEffect(() => {
    if (resolvedChatId && !isResolving) {
      const fetchMetadata = async () => {
        try {
          const response = await fetch(`/api/chats/metadata?sessionId=${resolvedChatId}`, {
            credentials: 'include',
          })
          if (response.ok) {
            const data = await response.json()
            setSessionType(data.session_type || null)
          }
        } catch (error) {
          console.error('[Tutor] Failed to fetch session metadata:', error)
        }
      }
      fetchMetadata()
    }
  }, [resolvedChatId, isResolving])

  // For entry modes, we prefill the input instead of auto-sending.

  // ============================================
  // SINGLE RETURN - Conditional rendering only
  // ============================================
  
  // Determine what to render
  const showLoading = isResolving
  const showError = error && !isResolving
  // Show landing when there's no resolved chat (allows welcome message for both General Tutor and class-specific)
  // Only show session if there's an active resolvedChatId (not just structured context)
  const showLanding = (!resolvedChatId && !isResolving && !error) || (isEntryMode && !isResolving && !error)
  // Show session only if there's an active resolved chat
  const showSession = !!resolvedChatId && !isResolving && !error

  if (showLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <p className={`${tokens.bodyText} text-slate-600`}>Loading session...</p>
        </div>
      </div>
    )
  }

  if (showError) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-100">
        <div className="text-center max-w-md">
          <p className={`${tokens.bodyText} text-slate-700 mb-4`}>{error}</p>
          <Button
            onClick={() => {
              setError(null)
              router.push('/tutor')
            }}
            className="bg-clinical-primary text-white hover:bg-clinical-secondary"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Derive evidence from most recent assistant message with evidence
  const assistantWithEvidence = messages
    .filter((m) => m.role === 'assistant' && m.evidence && m.evidence.length > 0)
    .at(-1)
  const evidence = assistantWithEvidence?.evidence ?? []

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Main chat column - centered with proper spacing */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-3 sm:px-4 md:px-6 min-h-0 overflow-hidden">
        {/* Header - Fixed */}
        {!isElementarySpelling && (
          <div className="flex-shrink-0 bg-slate-50 pt-safe-t pb-2 z-40">
            <TutorHeader
              strictMode={strictMode}
              onStrictModeChange={handleStrictModeChange}
              currentSessionId={resolvedChatId}
              hidePracticeControls={isElementarySpelling}
              hideNewChat={isElementarySpelling}
              onStartNewSession={async () => {
                // Clear the resolved session to show landing page
                setResolvedChatId(null)
                setAttachedFiles([])
                // Clear sessionId from URL and add intent=new_question to prevent auto-resume
                const params = new URLSearchParams(searchParams.toString())
                params.delete('sessionId')
                params.delete('chatId')
                params.delete('id')
                // Add intent to signal we want a NEW chat, not auto-resume
                params.set('intent', 'new_question')
                router.replace(`/tutor?${params.toString()}`)
              }}
            />
          </div>
        )}

        {/* Chat area with scrollable messages and fixed input */}
        <div className="flex-1 flex flex-col min-h-0 mt-2 sm:mt-4 overflow-hidden">
          {isEntryMode ? (
            <>
              <div className="flex-1 overflow-y-auto">
                <TutorLanding
                  onStartSession={handleInstantStart}
                  attachedFiles={attachedFiles}
                  attachedContext={attachedContext}
                  selectedClassId={tutorContext.selectedClassId}
                  selectedClass={tutorContext.selectedClass}
                  gradeBand={activeProfileSummary?.gradeBand}
                  mode={entryMode ?? 'tutor'}
                  profileId={activeProfileSummary?.id ?? null}
                  sessionActive={showSession}
                />
                {showSession && (
                  <div className="mt-6">
                    <TutorSession
                      sessionId={resolvedChatId || undefined}
                      strictMode={strictMode}
                      onStrictModeChange={handleStrictModeChange}
                      onSessionCreated={handleSessionCreated}
                      attachedFiles={attachedFiles}
                      onDetachFile={handleDetachFile}
                      messages={messages}
                      onMessagesChange={setMessages}
                      scrollToMessageId={messageIdParam || undefined}
                      gradeBand={activeProfileSummary?.gradeBand}
                      mode={entryMode ?? 'tutor'}
                    />
                  </div>
                )}
              </div>
              {!showSession && !isElementarySpelling && (
                <div className="flex-shrink-0 pt-4 sm:pt-6 bg-slate-50">
                  <ChatInterface
                    key={`landing-${entryMode ?? 'tutor'}`}
                    sessionId={undefined}
                    onSend={handleInstantStart}
                    initialPrompt={entryPrompt}
                    attachedFiles={attachedFiles}
                    attachedContext={attachedContext}
                    onDetach={handleDetachFile}
                    messages={[]}
                  />
                  <p className="text-[9px] text-slate-400 text-center mt-2 pb-2">
                    Educational use only. Not a medical device.
                  </p>
                </div>
              )}
            </>
          ) : showLanding ? (
            <>
              <div className="flex-1 overflow-y-auto">
                <TutorLanding
                  onStartSession={handleInstantStart}
                  attachedFiles={attachedFiles}
                  attachedContext={attachedContext}
                  selectedClassId={tutorContext.selectedClassId}
                  selectedClass={tutorContext.selectedClass}
                  gradeBand={activeProfileSummary?.gradeBand}
                  mode={entryMode ?? 'tutor'}
                  profileId={activeProfileSummary?.id ?? null}
                />
              </div>
              <div className="flex-shrink-0 pt-4 sm:pt-6 bg-slate-50">
                <ChatInterface
                  key={`landing-${entryMode ?? 'tutor'}`}
                  sessionId={undefined}
                  onSend={handleInstantStart}
                  initialPrompt={entryPrompt}
                  attachedFiles={attachedFiles}
                  attachedContext={attachedContext}
                  onDetach={handleDetachFile}
                  messages={[]}
                />
                <p className="text-[9px] text-slate-400 text-center mt-2 pb-2">
                  Educational use only. Not a medical device.
                </p>
              </div>
            </>
          ) : showSession ? (
            <TutorSession
              sessionId={resolvedChatId || undefined}
              strictMode={strictMode}
              onStrictModeChange={handleStrictModeChange}
              onSessionCreated={handleSessionCreated}
              attachedFiles={attachedFiles}
              onDetachFile={handleDetachFile}
              messages={messages}
              onMessagesChange={setMessages}
              scrollToMessageId={messageIdParam || undefined}
              gradeBand={activeProfileSummary?.gradeBand}
              mode={entryMode ?? 'tutor'}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function TutorPageClient() {
  return (
    <TutorProvider>
      <TutorPageContent />
    </TutorProvider>
  )
}


'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { StudentClass, NotebookTopic } from '@/lib/types'
import { listClasses } from '@/lib/api/classes'
import { listNotebookTopics } from '@/lib/api/notebook'
import { createBrowserClient } from '@supabase/ssr'

interface TutorContextState {
  selectedClassId?: string
  selectedTopicId?: string
  activeExamId?: string
  selectedClass?: StudentClass | null
  selectedTopic?: NotebookTopic | null
  selectedTopicTitle?: string
  selectedTopicFileIds?: string[]
  mode: 'tutor' | 'reflections'
  classes: StudentClass[]
  loading: boolean
  setSelectedClassId: (id: string | undefined) => void
  setSelectedTopicId: (id: string | undefined) => void
  setActiveExamId: (id: string | undefined) => void
  clearTopic: () => void
}

const TutorContext = createContext<TutorContextState | undefined>(undefined)

export function TutorProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedClassId, setSelectedClassIdState] = useState<string | undefined>(
    searchParams.get('classId') || undefined
  )
  const [selectedTopicId, setSelectedTopicIdState] = useState<string | undefined>(
    searchParams.get('topicId') || undefined
  )
  const [activeExamId, setActiveExamIdState] = useState<string | undefined>(
    searchParams.get('examId') || undefined
  )
  const [selectedClass, setSelectedClass] = useState<StudentClass | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<NotebookTopic | null>(null)
  const [selectedTopicTitle, setSelectedTopicTitle] = useState<string | undefined>(undefined)
  const [selectedTopicFileIds, setSelectedTopicFileIds] = useState<string[] | undefined>(undefined)
  const [classes, setClasses] = useState<StudentClass[]>([])
  const [loading, setLoading] = useState(true)
  const mode = (searchParams.get('mode') || 'tutor') as 'tutor' | 'reflections'

  // Get user ID
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
      } else {
        setLoading(false)
      }
    })
  }, [])

  // Load classes
  useEffect(() => {
    if (userId) {
      loadClasses()
    }
  }, [userId])

  // Load selected class and topic
  useEffect(() => {
    if (userId && selectedClassId && classes.length > 0) {
      loadSelectedClass()
    } else {
      setSelectedClass(null)
    }
  }, [userId, selectedClassId, classes.length]) // Fixed: use classes.length to avoid infinite loop

  useEffect(() => {
    if (userId && selectedTopicId && selectedClassId) {
      loadSelectedTopic()
    } else {
      setSelectedTopic(null)
    }
  }, [userId, selectedTopicId, selectedClassId])

  const loadClasses = async () => {
    if (!userId) return
    const classList = await listClasses(userId)
    setClasses(classList)
    setLoading(false)
  }

  const loadSelectedClass = () => {
    const found = classes.find((c) => c.id === selectedClassId)
    setSelectedClass(found || null)
  }

  const loadSelectedTopic = async () => {
    if (!userId || !selectedClassId || !selectedTopicId) {
      setSelectedTopic(null)
      setSelectedTopicTitle(undefined)
      setSelectedTopicFileIds(undefined)
      return
    }
    const topics = await listNotebookTopics(userId, selectedClassId)
    const found = topics.find((t) => t.id === selectedTopicId)
    setSelectedTopic(found || null)
    setSelectedTopicTitle(found?.title)
    setSelectedTopicFileIds(found?.fileIds)
  }

  const setSelectedClassId = (id: string | undefined) => {
    // Update state first
    setSelectedClassIdState(id)
    
    // Update URL params
    const params = new URLSearchParams(searchParams.toString())
    if (id) {
      params.set('classId', id)
    } else {
      params.delete('classId')
      params.delete('topicId') // Clear topic when class is cleared
      setSelectedTopicIdState(undefined)
    }
    
    // Use replace instead of push to avoid adding to history and prevent loops
    // Also clear sessionId when class changes to force re-resolution
    params.delete('sessionId')
    params.delete('chatId')
    params.delete('id')
    
    router.replace(`/tutor?${params.toString()}`)
  }

  const setSelectedTopicId = (id: string | undefined) => {
    setSelectedTopicIdState(id)
    const params = new URLSearchParams(searchParams.toString())
    if (id) {
      params.set('topicId', id)
    } else {
      params.delete('topicId')
    }
    router.push(`/tutor?${params.toString()}`)
  }

  const setActiveExamId = (id: string | undefined) => {
    setActiveExamIdState(id)
    const params = new URLSearchParams(searchParams.toString())
    if (id) {
      params.set('examId', id)
    } else {
      params.delete('examId')
    }
    router.push(`/tutor?${params.toString()}`)
  }

  const clearTopic = () => {
    setSelectedTopicIdState(undefined)
    setSelectedTopic(null)
    setSelectedTopicTitle(undefined)
    setSelectedTopicFileIds(undefined)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('topicId')
    // Preserve mode and sessionId if present
    const sessionId = searchParams.get('sessionId')
    if (sessionId) {
      params.set('sessionId', sessionId)
    }
    router.replace(`/tutor?${params.toString()}`)
  }

  // Sync with URL params (only when URL changes from external sources, not programmatic updates)
  // This handles browser back/forward navigation
  useEffect(() => {
    const classIdParam = searchParams.get('classId')
    const topicIdParam = searchParams.get('topicId')
    const examIdParam = searchParams.get('examId')
    
    // Normalize null to undefined for comparison
    const urlClassId = classIdParam || undefined
    const urlTopicId = topicIdParam || undefined
    const urlExamId = examIdParam || undefined
    
    // Get current state values (normalize to undefined)
    const stateClassId = selectedClassId || undefined
    const stateTopicId = selectedTopicId || undefined
    const stateExamId = activeExamId || undefined
    
    // Only update if URL value differs from state (prevents loops)
    // This will only trigger when URL changes externally (browser nav), not when we update it programmatically
    if (urlClassId !== stateClassId) {
      console.log('[TutorContext] Syncing classId from URL:', { url: urlClassId, state: stateClassId })
      setSelectedClassIdState(urlClassId)
    }
    if (urlTopicId !== stateTopicId) {
      setSelectedTopicIdState(urlTopicId)
    }
    if (urlExamId !== stateExamId) {
      setActiveExamIdState(urlExamId)
    }
  }, [searchParams]) // Only depend on searchParams - state is updated by setSelectedClassId before URL changes

  return (
    <TutorContext.Provider
      value={{
        selectedClassId,
        selectedTopicId,
        activeExamId,
        selectedClass,
        selectedTopic,
        selectedTopicTitle,
        selectedTopicFileIds,
        mode,
        classes,
        loading,
        setSelectedClassId,
        setSelectedTopicId,
        setActiveExamId,
        clearTopic,
      }}
    >
      {children}
    </TutorContext.Provider>
  )
}

export function useTutorContext() {
  const context = useContext(TutorContext)
  if (context === undefined) {
    // Return default values if used outside provider (graceful degradation)
    return {
      selectedClassId: undefined,
      selectedTopicId: undefined,
      activeExamId: undefined,
      selectedClass: null,
      selectedTopic: null,
      selectedTopicTitle: undefined,
      selectedTopicFileIds: undefined,
      mode: 'tutor' as const,
      classes: [],
      loading: false,
      setSelectedClassId: () => {},
      setSelectedTopicId: () => {},
      setActiveExamId: () => {},
      clearTopic: () => {},
    }
  }
  return context
}


'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { useTutorContext } from './TutorContext'
import ExamModeDialog from './ExamModeDialog'
import { ExamPlan, StudentClass, NotebookTopic } from '@/lib/types'
import { listExams } from '@/lib/api/exams'

interface TutorHeaderProps {
  strictMode: boolean
  onStrictModeChange: (strict: boolean) => void
  onStartNewSession?: () => void
  currentSessionId?: string | null // Current active session ID for archiving
  hidePracticeControls?: boolean
  hideNewChat?: boolean
}

export default function TutorHeader({ 
  strictMode, 
  onStrictModeChange,
  onStartNewSession,
  currentSessionId,
  hidePracticeControls = false,
  hideNewChat = false,
}: TutorHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isExamDialogOpen, setIsExamDialogOpen] = useState(false)
  const [activeExam, setActiveExam] = useState<ExamPlan | null>(null)
  const tutorContext = useTutorContext()


  // Load active exam if examId is present
  useEffect(() => {
    const loadActiveExam = async () => {
      if (tutorContext.activeExamId && tutorContext.selectedClassId) {
        try {
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const exams = await listExams(user.id, tutorContext.selectedClassId)
            const found = exams.find((e) => e.id === tutorContext.activeExamId)
            setActiveExam(found || null)
          }
        } catch (error) {
          console.error('[TutorHeader] Failed to load exam:', error)
        }
      } else {
        setActiveExam(null)
      }
    }

    loadActiveExam()
  }, [tutorContext.activeExamId, tutorContext.selectedClassId])

  if (hidePracticeControls && hideNewChat) {
    return null
  }

  return (
    <>
      <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm px-3 sm:px-4 md:px-6 py-3 sm:py-3.5 rounded-xl shadow-lg shadow-slate-200/50 mb-4 sm:mb-5 w-full overflow-hidden">
        {/* Right: New Chat */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {/* Start New Chat button - only show when there's an active session */}
          {!hideNewChat && currentSessionId && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!currentSessionId) return
                
                // Archive the current chat
                try {
                  const archiveRes = await fetch('/api/chats/archive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ chatId: currentSessionId }),
                  })
                  
                  if (!archiveRes.ok) {
                    console.error('[TutorHeader] Failed to archive chat')
                    // Continue anyway - don't block user
                  }
                } catch (error) {
                  console.error('[TutorHeader] Error archiving chat:', error)
                  // Continue anyway - don't block user
                }
                
                // Clear session and show landing page
                if (onStartNewSession) {
                  onStartNewSession()
                } else {
                  // Fallback: navigate to clear session
                  const params = new URLSearchParams(searchParams.toString())
                  params.delete('sessionId')
                  params.delete('chatId')
                  params.delete('id')
                  router.push(`/tutor?${params.toString()}`)
                }
              }}
              className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0 shadow-md shadow-emerald-500/30 hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg hover:shadow-emerald-500/40 transition-all duration-200 font-semibold px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">New Chat</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}
        </div>
      </header>
      {/* Exam Mode Dialog - outside header for portal rendering */}
      {tutorContext.selectedClassId && (
        <ExamModeDialog
          isOpen={isExamDialogOpen}
          onClose={() => setIsExamDialogOpen(false)}
          classId={tutorContext.selectedClassId as string}
          onStartSession={(examId) => {
            tutorContext.setActiveExamId(examId)
          }}
        />
      )}
    </>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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
  const [isTitleDialogOpen, setIsTitleDialogOpen] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
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
      <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3 sm:gap-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm px-3 sm:px-4 md:px-6 py-3 sm:py-3.5 rounded-xl shadow-lg shadow-slate-200/50 mb-4 sm:mb-5 w-full overflow-hidden">
        {/* New Chat */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Start New Chat button - only show when there's an active session */}
          {!hideNewChat && currentSessionId && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!currentSessionId) return
                setTitleDraft('')
                setIsTitleDialogOpen(true)
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
      <Dialog open={isTitleDialogOpen} onOpenChange={setIsTitleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Title this chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              placeholder="e.g., Essay draft on the American Revolution"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsTitleDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!currentSessionId) return
                  const trimmed = titleDraft.trim()
                  if (trimmed) {
                    try {
                      await fetch('/api/chats/update-title', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ chatId: currentSessionId, title: trimmed }),
                      })
                    } catch (error) {
                      console.error('[TutorHeader] Failed to update chat title:', error)
                    }
                  }

                  try {
                    await fetch('/api/chats/archive', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ chatId: currentSessionId }),
                    })
                  } catch (error) {
                    console.error('[TutorHeader] Error archiving chat:', error)
                  }

                  setIsTitleDialogOpen(false)

                  if (onStartNewSession) {
                    onStartNewSession()
                  } else {
                    const params = new URLSearchParams(searchParams.toString())
                    params.delete('sessionId')
                    params.delete('chatId')
                    params.delete('id')
                    router.push(`/tutor?${params.toString()}`)
                  }
                }}
              >
                Save & Start New
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  if (!currentSessionId) return
                  try {
                    await fetch('/api/chats/archive', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ chatId: currentSessionId }),
                    })
                  } catch (error) {
                    console.error('[TutorHeader] Error archiving chat:', error)
                  }
                  setIsTitleDialogOpen(false)
                  if (onStartNewSession) {
                    onStartNewSession()
                  } else {
                    const params = new URLSearchParams(searchParams.toString())
                    params.delete('sessionId')
                    params.delete('chatId')
                    params.delete('id')
                    router.push(`/tutor?${params.toString()}`)
                  }
                }}
              >
                Skip title
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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


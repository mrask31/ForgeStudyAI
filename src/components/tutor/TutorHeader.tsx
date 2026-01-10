'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ToggleLeft, ToggleRight, HelpCircle, Plus } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { useTutorContext } from './TutorContext'
import ExamModeDialog from './ExamModeDialog'
import { ExamPlan, StudentClass, NotebookTopic } from '@/lib/types'
import { listExams } from '@/lib/api/exams'

type Mode = 'tutor' | 'reflections'

interface TutorHeaderProps {
  mode: Mode
  strictMode: boolean
  onStrictModeChange: (strict: boolean) => void
  selectedClass?: StudentClass | null
  selectedTopic?: NotebookTopic | null
  onClearTopic?: () => void
  onStartNewSession?: () => void
  classes?: StudentClass[]
  selectedClassId?: string
  onSelectClass?: (classId: string | undefined) => void
  currentSessionId?: string | null // Current active session ID for archiving
}

export default function TutorHeader({ 
  mode, 
  strictMode, 
  onStrictModeChange,
  selectedClass,
  selectedTopic,
  onClearTopic,
  onStartNewSession,
  classes = [],
  selectedClassId,
  onSelectClass,
  currentSessionId,
}: TutorHeaderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentMode = mode
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

  const handleModeChange = (mode: Mode) => {
    router.push(`/tutor?mode=${mode}`)
  }

  return (
    <>
      <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm px-3 sm:px-4 md:px-6 py-3 sm:py-3.5 rounded-xl shadow-lg shadow-slate-200/50 mb-4 sm:mb-5 w-full overflow-hidden">
        {/* Left: NCLEX Practice Mode */}
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          <button
            onClick={() => onStrictModeChange(!strictMode)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
              strictMode
                ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 text-indigo-700 shadow-md shadow-indigo-200/50'
                : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-50 border-2 border-transparent hover:border-indigo-200'
            }`}
          >
            {strictMode ? (
              <ToggleRight className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-400 flex-shrink-0" />
            )}
            <span className={`font-medium text-xs sm:text-sm whitespace-nowrap ${strictMode ? 'text-indigo-700 font-semibold' : ''}`}>
              NCLEX Practice Mode
            </span>
          </button>
          {/* Help tooltip */}
          <div className="relative group flex-shrink-0">
            <HelpCircle className={`w-4 h-4 sm:w-5 sm:h-5 cursor-help transition-colors ${
              strictMode ? 'text-indigo-500 hover:text-indigo-700' : 'text-slate-400 hover:text-slate-600'
            }`} />
            <div className="absolute top-full left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
              <div className="absolute top-0 left-4 transform -translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
              <p className="font-semibold mb-1.5 text-white">NCLEX Practice Mode</p>
              <p className="text-slate-300 leading-relaxed">
                When enabled, the tutor will ask you to think through answers first before providing explanations. This simulates exam conditions and helps build your reasoning skills.
              </p>
            </div>
          </div>
        </div>

        {/* Center: Tutor / Reflections - Enhanced */}
        <div className="flex items-center justify-center flex-shrink-0">
          <div className="flex items-center gap-1 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full p-1 border border-slate-200/60 shadow-sm">
            <button
              onClick={() => handleModeChange('tutor')}
              className={`px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                currentMode === 'tutor'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Tutor
            </button>
            <button
              onClick={() => handleModeChange('reflections')}
              className={`px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                currentMode === 'reflections'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Reflections
            </button>
          </div>
        </div>

        {/* Right: Class / Topic strip + New Chat */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Class select - hidden in Reflections mode (reflections are personal, not class-based) */}
          {currentMode === 'tutor' && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap hidden sm:inline">
                Class
              </span>
              <select
                value={selectedClassId ?? ""}
                onChange={(e) => onSelectClass?.(e.target.value || undefined)}
                className="rounded-lg border-2 border-slate-200 bg-white/80 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 shadow-sm hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 w-[120px] sm:w-[160px] transition-all duration-200"
              >
                <option value="">General Tutor</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.code} – {cls.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Start New Chat button - only show when there's an active session */}
          {currentSessionId && (
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
              className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 shadow-md shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg hover:shadow-indigo-500/40 transition-all duration-200 font-semibold px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap"
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


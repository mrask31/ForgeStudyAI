'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ExamPlan, NotebookTopic } from '@/lib/types'
import { listExams, createExam } from '@/lib/api/exams'
import { listNotebookTopics } from '@/lib/api/notebook'
import { Calendar, BookOpen, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface ExamModeDialogProps {
  isOpen: boolean
  onClose: () => void
  classId: string
  userId?: string
  onStartSession?: (examId: string) => void
}

export default function ExamModeDialog({
  isOpen,
  onClose,
  classId,
  userId,
  onStartSession,
}: ExamModeDialogProps) {
  const router = useRouter()
  const [exams, setExams] = useState<ExamPlan[]>([])
  const [topics, setTopics] = useState<NotebookTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null)
  
  // Form state
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])

  useEffect(() => {
    const getUserId = async () => {
      if (!userId) {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
        }
      } else {
        setCurrentUserId(userId)
      }
    }
    getUserId()
  }, [userId])

  useEffect(() => {
    if (isOpen && currentUserId && classId) {
      loadData()
    }
  }, [isOpen, currentUserId, classId])

  const loadData = async () => {
    if (!currentUserId) return
    setLoading(true)
    try {
      const [examsData, topicsData] = await Promise.all([
        listExams(currentUserId, classId),
        listNotebookTopics(currentUserId, classId),
      ])
      setExams(examsData)
      setTopics(topicsData)
    } catch (error) {
      console.error('[ExamModeDialog] Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateExam = async () => {
    if (!examName.trim() || selectedTopicIds.length === 0 || !currentUserId) {
      return
    }

    setIsCreating(true)
    try {
      const newExam = await createExam(currentUserId, {
        classId,
        name: examName.trim(),
        date: examDate || undefined, // Optional date
        topicIds: selectedTopicIds,
        userId: currentUserId,
      })
      
      // Refresh exams list
      await loadData()
      
      // Reset form
      setExamName('')
      setExamDate('')
      setSelectedTopicIds([])
    } catch (error) {
      console.error('[ExamModeDialog] Error creating exam:', error)
      alert('Failed to create exam. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleStartSession = (exam: ExamPlan) => {
    // Navigate to tutor with exam context - explicitly NO sessionId for fresh start
    const params = new URLSearchParams()
    params.set('mode', 'tutor')
    params.set('classId', exam.classId)
    params.set('examId', exam.id)
    // Do NOT include sessionId - this should start a fresh session
    
    if (onStartSession) {
      onStartSession(exam.id)
      router.push(`/tutor?${params.toString()}`)
    } else {
      router.push(`/tutor?${params.toString()}`)
    }
    onClose()
  }

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    )
  }

  // Get upcoming exam (nearest future date) - only if date exists
  const upcomingExam = exams
    .filter((exam) => exam.date && new Date(exam.date) >= new Date())
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : Infinity
      const dateB = b.date ? new Date(b.date).getTime() : Infinity
      return dateA - dateB
    })[0]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[var(--tutor-text-main)]">
            Exam Mode – Study With Me
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-[var(--tutor-text-muted)]">
            Loading...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Existing Exam */}
            {upcomingExam && (
              <div className="bg-[var(--tutor-bg)] border border-[var(--tutor-border-subtle)] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-[var(--tutor-text-main)] mb-1">
                      {upcomingExam.name}
                    </h3>
                    {upcomingExam.date && (
                      <div className="flex items-center gap-2 text-sm text-[var(--tutor-text-muted)]">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(upcomingExam.date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-[var(--tutor-text-muted)] mt-2">
                      {upcomingExam.topicIds.length} topic
                      {upcomingExam.topicIds.length !== 1 ? 's' : ''} associated
                    </p>
                  </div>
                  <Button
                    onClick={() => handleStartSession(upcomingExam)}
                    size="sm"
                    className="bg-[var(--tutor-primary)] hover:bg-[var(--tutor-primary-strong)]"
                  >
                    Start study session
                  </Button>
                </div>
              </div>
            )}

            {/* Create New Exam Form */}
            <div className="border-t border-[var(--tutor-border-subtle)] pt-6">
              <h3 className="font-semibold text-[var(--tutor-text-main)] mb-4">
                Create New Exam
              </h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="exam-name" className="text-sm text-[var(--tutor-text-main)]">
                    Exam Name
                  </Label>
                  <Input
                    id="exam-name"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    placeholder="e.g., Exam 2 – Cardiac & Respiratory"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="exam-date" className="text-sm text-[var(--tutor-text-main)]">
                    Exam Date
                  </Label>
                  <Input
                    id="exam-date"
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm text-[var(--tutor-text-main)] mb-2 block">
                    Associated Topics
                  </Label>
                  <div className="border border-[var(--tutor-border-subtle)] rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                    {topics.length === 0 ? (
                      <p className="text-sm text-[var(--tutor-text-muted)] text-center py-4">
                        No topics available. Add topics in your Clinical Notebook first.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {topics.map((topic) => (
                          <label
                            key={topic.id}
                            className="flex items-center gap-2 p-2 hover:bg-[var(--tutor-bg)] rounded cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedTopicIds.includes(topic.id)}
                              onCheckedChange={() => toggleTopic(topic.id)}
                            />
                            <span className="text-sm text-[var(--tutor-text-main)]">
                              {topic.title}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleCreateExam}
                  disabled={!examName.trim() || !examDate || selectedTopicIds.length === 0 || isCreating}
                  className="w-full bg-[var(--tutor-primary)] hover:bg-[var(--tutor-primary-strong)]"
                >
                  {isCreating ? 'Creating...' : 'Save exam'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}


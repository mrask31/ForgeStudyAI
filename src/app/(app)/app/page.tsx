'use client'

import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { useActiveProfileSummary } from '@/hooks/useActiveProfileSummary'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, MessageSquare, Loader2, Clock, ChevronRight, Plus, Pencil, Trash2, CheckSquare, Square, ArrowRight, CalendarDays } from 'lucide-react'
import { PhotoDropButton } from '@/components/homework/PhotoDropButton'
import { SubjectEntryForm } from '@/components/tutor/SubjectEntryForm'
import { AddAssignmentModal, type ManualAssignment } from '@/components/assignments/AddAssignmentModal'

interface RecentSession {
  id: string
  title: string | null
  session_type: string | null
  updated_at: string
  metadata?: {
    topicTitle?: string
    classId?: string
    class_id?: string
    className?: string
    selectedClassName?: string
    entryMode?: string
    tool?: string
    [key: string]: any
  }
}

function formatDueLabel(dueDate: string | null): string {
  if (!dueDate) return 'No due date'
  const now = new Date()
  const due = new Date(dueDate)
  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays < 7) {
    return due.toLocaleDateString('en-US', { weekday: 'long' })
  }
  return `In ${diffDays} days`
}

function getDueDateColor(dueDate: string | null): string {
  if (!dueDate) return 'text-slate-500 dark:text-slate-500'
  const diffMs = new Date(dueDate).getTime() - Date.now()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return 'text-red-500 dark:text-red-400'
  if (diffDays <= 2) return 'text-amber-600 dark:text-amber-400'
  return 'text-slate-500 dark:text-slate-400'
}

export default function HomePage() {
  const { activeProfileId } = useActiveProfile()
  const profileSummary = useActiveProfileSummary()
  const router = useRouter()

  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [streakDays, setStreakDays] = useState(0)
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<ManualAssignment[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<ManualAssignment | null>(null)

  const studentName = profileSummary.summary?.displayName?.split(' ')[0] || 'there'

  const fetchAssignments = useCallback(async () => {
    if (!activeProfileId) return
    try {
      const res = await fetch(`/api/manual-assignments?profileId=${activeProfileId}`)
      if (res.ok) {
        const data = await res.json()
        setAssignments(data.assignments || [])
      }
    } catch (err) {
      console.error('[Home] Failed to fetch assignments:', err)
    }
  }, [activeProfileId])

  useEffect(() => {
    if (!activeProfileId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadHomeData() {
      setLoading(true)
      try {
        const [streakRes, chatsRes] = await Promise.all([
          fetch(`/api/streak?profileId=${activeProfileId}`).catch(() => null),
          fetch('/api/chats/list?includeArchived=false', { credentials: 'include' }).catch(() => null),
        ])

        if (cancelled) return

        if (streakRes?.ok) {
          const streakData = await streakRes.json()
          setStreakDays(streakData.current_streak_days || 0)
        }

        if (chatsRes?.ok) {
          const chatsData = await chatsRes.json()
          setRecentSessions((chatsData.chats || []).slice(0, 5))
        }
      } catch (error) {
        console.error('[Home] Error loading data:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadHomeData()
    fetchAssignments()
    return () => { cancelled = true }
  }, [activeProfileId, fetchAssignments])

  const formatTimeAgo = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatSessionTitle = (session: RecentSession) => {
    if (session.title) {
      const title = session.title.trim()
      const looksLikeAIResponse =
        title.length > 60 ||
        title.startsWith("Here's") ||
        title.startsWith('Sure') ||
        title.startsWith('Let me') ||
        title.startsWith('I can') ||
        title.startsWith('Great')
      if (!looksLikeAIResponse) {
        return title
      }
    }

    const dateStr = new Date(session.updated_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })

    const subject =
      session.metadata?.topicTitle ||
      session.metadata?.className ||
      session.metadata?.selectedClassName ||
      null

    if (subject) {
      return `${subject} — ${dateStr}`
    }

    return `Study Session — ${dateStr}`
  }

  async function handleToggleComplete(assignment: ManualAssignment) {
    const updated = { ...assignment, is_complete: !assignment.is_complete }
    setAssignments((prev) => prev.map((a) => a.id === assignment.id ? updated : a))
    try {
      await fetch(`/api/manual-assignments/${assignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: updated.is_complete }),
      })
    } catch {
      // Revert on error
      setAssignments((prev) => prev.map((a) => a.id === assignment.id ? assignment : a))
    }
  }

  async function handleDelete(id: string) {
    setAssignments((prev) => prev.filter((a) => a.id !== id))
    try {
      await fetch(`/api/manual-assignments/${id}`, { method: 'DELETE' })
    } catch {
      fetchAssignments()
    }
  }

  function handleStudyThis(assignment: ManualAssignment) {
    const dueLabel = assignment.due_date
      ? `due ${formatDueLabel(assignment.due_date)}`
      : ''
    const course = assignment.course_name ? ` for ${assignment.course_name}` : ''
    const prefill = `The student wants help with: "${assignment.title}"${course}${dueLabel ? ', ' + dueLabel : ''}.${assignment.notes ? ` Their notes: ${assignment.notes}` : ''} Start by asking what specifically they want to focus on.`

    localStorage.setItem('forgestudy-tutor-prefill', prefill)
    localStorage.setItem('forgestudy-tutor-auto-send', 'false')
    router.push('/tutor?intent=new_question')
  }

  function handleModalSave(saved: ManualAssignment) {
    setAssignments((prev) => {
      const exists = prev.find((a) => a.id === saved.id)
      if (exists) return prev.map((a) => a.id === saved.id ? saved : a)
      return [...prev, saved].sort((a, b) => {
        if (a.is_complete !== b.is_complete) return a.is_complete ? 1 : -1
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      })
    })
    setShowAddModal(false)
    setEditingAssignment(null)
  }

  // Split into upcoming and complete
  const upcomingAssignments = assignments.filter((a) => !a.is_complete)
  const completedAssignments = assignments.filter((a) => a.is_complete)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F9FAFB] dark:bg-[#08080F]">
        <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] dark:bg-[#08080F] pb-20 lg:pb-4">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Hey {studentName} 👋
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">What are you working on today?</p>
          </div>
          {streakDays > 0 && (
            <div className="bg-amber-50 dark:bg-slate-900/60 backdrop-blur-md border border-amber-200 dark:border-amber-500/30 rounded-xl px-3 py-1.5">
              <span className="text-amber-600 dark:text-amber-400 text-sm font-bold">🔥 {streakDays}-day streak</span>
            </div>
          )}
        </div>

        {/* Hero: Photo Drop */}
        <div className="flex items-center gap-4 p-5 md:p-6 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 dark:from-indigo-600/20 dark:to-purple-600/20 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl">
          <div className="flex-shrink-0">
            <PhotoDropButton />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Take a Photo of Homework</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              Snap a photo and get help in seconds
            </p>
          </div>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/sources"
            className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-600/5 transition-all"
          >
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Upload Materials</span>
          </Link>
          <Link
            href="/tutor"
            className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-600/5 transition-all"
          >
            <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Ask Anything</span>
          </Link>
        </div>

        {/* Assignments Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Upcoming Assignments
            </h3>
            <button
              onClick={() => { setEditingAssignment(null); setShowAddModal(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Assignment
            </button>
          </div>

          {upcomingAssignments.length === 0 && completedAssignments.length === 0 ? (
            <button
              onClick={() => { setEditingAssignment(null); setShowAddModal(true) }}
              className="w-full flex flex-col items-center gap-2 py-8 bg-white dark:bg-slate-900/40 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-center hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors"
            >
              <CalendarDays className="w-8 h-8 text-gray-300 dark:text-slate-600" />
              <p className="text-sm text-gray-400 dark:text-slate-500">No assignments yet</p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">+ Add your first assignment</p>
            </button>
          ) : (
            <div className="space-y-2">
              {upcomingAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-xl"
                >
                  <button
                    onClick={() => handleToggleComplete(assignment)}
                    className="mt-0.5 flex-shrink-0 text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="Mark complete"
                  >
                    <Square className="w-4 h-4" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{assignment.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {assignment.course_name && (
                        <span className="text-xs text-gray-500 dark:text-slate-400">{assignment.course_name}</span>
                      )}
                      {assignment.course_name && assignment.due_date && (
                        <span className="text-xs text-gray-300 dark:text-slate-700">·</span>
                      )}
                      {assignment.due_date && (
                        <span className={`text-xs font-medium ${getDueDateColor(assignment.due_date)}`}>
                          {formatDueLabel(assignment.due_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleStudyThis(assignment)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 rounded-lg transition-colors"
                      title="Study this"
                    >
                      Study
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => { setEditingAssignment(assignment); setShowAddModal(true) }}
                      className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(assignment.id)}
                      className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Completed assignments */}
              {completedAssignments.length > 0 && (
                <div className="space-y-2 mt-1">
                  <p className="text-xs text-gray-400 dark:text-slate-600 px-1">Completed</p>
                  {completedAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-900/30 border border-gray-100 dark:border-slate-800/50 rounded-xl opacity-60"
                    >
                      <button
                        onClick={() => handleToggleComplete(assignment)}
                        className="mt-0.5 flex-shrink-0 text-indigo-500 dark:text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                        title="Mark incomplete"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-500 dark:text-slate-500 line-through truncate">{assignment.title}</p>
                        {assignment.course_name && (
                          <p className="text-xs text-gray-400 dark:text-slate-600">{assignment.course_name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(assignment.id)}
                        className="p-1.5 text-gray-300 dark:text-slate-700 hover:text-red-400 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subject Entry Form */}
        <SubjectEntryForm />

        {/* My Progress link */}
        <Link
          href="/progress"
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all"
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">My Progress</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Explore your Learning Galaxy</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500" />
        </Link>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-3">Recent Sessions</h3>
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/tutor?sessionId=${session.id}`)}
                  className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-600/5 transition-all text-left"
                >
                  <Clock className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {formatSessionTitle(session)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{formatTimeAgo(session.updated_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Assignment Modal */}
      {showAddModal && activeProfileId && (
        <AddAssignmentModal
          profileId={activeProfileId}
          editing={editingAssignment}
          onSave={handleModalSave}
          onClose={() => { setShowAddModal(false); setEditingAssignment(null) }}
        />
      )}
    </div>
  )
}

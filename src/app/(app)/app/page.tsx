'use client'

import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { useUser } from '@/contexts/UserContext'
import { useActiveProfileSummary } from '@/hooks/useActiveProfileSummary'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, MessageSquare, Loader2, Clock, ChevronRight } from 'lucide-react'
import { PhotoDropButton } from '@/components/homework/PhotoDropButton'
import { SubjectEntryForm } from '@/components/tutor/SubjectEntryForm'

interface DueSoonAssignment {
  id: string
  title: string
  course_name: string | null
  due_at: string | null
}

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

export default function HomePage() {
  const { activeProfileId } = useActiveProfile()
  const { user } = useUser()
  const profileSummary = useActiveProfileSummary()
  const router = useRouter()

  const [lmsConnected, setLmsConnected] = useState<boolean | null>(null)
  const [dueSoonItems, setDueSoonItems] = useState<DueSoonAssignment[]>([])
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [streakDays, setStreakDays] = useState(0)
  const [loading, setLoading] = useState(true)

  const studentName = profileSummary.summary?.displayName?.split(' ')[0] || 'there'

  useEffect(() => {
    if (!activeProfileId || !user) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadHomeData() {
      setLoading(true)
      try {
        const [lmsRes, streakRes, chatsRes] = await Promise.all([
          fetch(`/api/parent/lms/status/${activeProfileId}`).catch(() => null),
          fetch(`/api/streak?profileId=${activeProfileId}`).catch(() => null),
          fetch('/api/chats/list?includeArchived=false', { credentials: 'include' }).catch(() => null),
        ])

        if (cancelled) return

        if (lmsRes?.ok) {
          const lmsData = await lmsRes.json()
          const hasActiveConnection = lmsData.connections?.some(
            (c: any) => (c.provider === 'canvas' || c.provider === 'google_classroom') && c.status === 'active'
          )
          setLmsConnected(!!hasActiveConnection)
        } else {
          setLmsConnected(false)
        }

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
        setLmsConnected(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadHomeData()
    return () => { cancelled = true }
  }, [activeProfileId, user])

  useEffect(() => {
    if (!activeProfileId || !lmsConnected) return

    async function loadAssignments() {
      try {
        const res = await fetch(`/api/assignments/due-soon?profileId=${activeProfileId}`)
        if (res.ok) {
          const data = await res.json()
          setDueSoonItems(data.assignments || [])
        }
      } catch {
        // Non-critical
      }
    }

    loadAssignments()
  }, [activeProfileId, lmsConnected])

  useEffect(() => {
    if (!activeProfileId || !user) return

    const syncKey = `lms_sync_triggered_${activeProfileId}`
    if (sessionStorage.getItem(syncKey)) return
    sessionStorage.setItem(syncKey, 'true')

    fetch('/api/internal/sync/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ profileId: activeProfileId }),
    }).catch(() => {})
  }, [activeProfileId, user])

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

  const formatDueLabel = (dueAt: string | null) => {
    if (!dueAt) return ''
    const due = new Date(dueAt)
    const now = new Date()
    const diffMs = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / 86400000)

    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Tomorrow'
    return `${diffDays}d left`
  }

  const getDueLabelColor = (dueAt: string | null) => {
    if (!dueAt) return 'text-gray-400 dark:text-slate-400'
    const diffMs = new Date(dueAt).getTime() - Date.now()
    const diffDays = Math.ceil(diffMs / 86400000)

    if (diffDays < 0) return 'text-red-500 dark:text-red-400'
    if (diffDays <= 1) return 'text-amber-500 dark:text-amber-400'
    return 'text-gray-400 dark:text-slate-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F9FAFB] dark:bg-[#08080F]">
        <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
      </div>
    )
  }

  // ====================================
  // LMS Connected: Assignment-based home
  // ====================================
  if (lmsConnected) {
    const heroAssignment = dueSoonItems[0]
    const upcomingAssignments = dueSoonItems.slice(1, 4)

    return (
      <div className="flex-1 overflow-y-auto bg-[#F9FAFB] dark:bg-[#08080F] pb-20 lg:pb-4">
        <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Hey {studentName} 👋
              </h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Ready to study?</p>
            </div>
            {streakDays > 0 && (
              <div className="bg-amber-50 dark:bg-slate-900/60 backdrop-blur-md border border-amber-200 dark:border-amber-500/30 rounded-xl px-3 py-1.5">
                <span className="text-amber-600 dark:text-amber-400 text-sm font-bold">🔥 {streakDays}-day streak</span>
              </div>
            )}
          </div>

          {/* Hero Assignment Card */}
          {heroAssignment ? (
            <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 dark:from-indigo-600/20 dark:to-purple-600/20 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-5 md:p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${getDueLabelColor(heroAssignment.due_at)}`}>
                  {formatDueLabel(heroAssignment.due_at)}
                </span>
                {heroAssignment.course_name && (
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    · {heroAssignment.course_name}
                  </span>
                )}
              </div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
                {heroAssignment.title}
              </h2>
              <button
                onClick={() => {
                  localStorage.setItem(
                    'forgestudy-tutor-prefill',
                    `Help me study for this assignment: ${heroAssignment.title}`
                  )
                  localStorage.setItem('forgestudy-tutor-auto-send', 'true')
                  router.push('/tutor?intent=new_question')
                }}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-base transition-colors"
              >
                ▶ Start Studying
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 text-center">
              <p className="text-gray-500 dark:text-slate-400 text-sm">No upcoming assignments. Nice work!</p>
              <Link
                href="/tutor"
                className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Ask your tutor anything
              </Link>
            </div>
          )}

          {/* Upcoming Assignments */}
          {upcomingAssignments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-3">Coming Up</h3>
              <div className="space-y-2">
                {upcomingAssignments.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      localStorage.setItem(
                        'forgestudy-tutor-prefill',
                        `Help me study for: ${a.title}`
                      )
                      localStorage.setItem('forgestudy-tutor-auto-send', 'true')
                      router.push('/tutor?intent=new_question')
                    }}
                    className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-600/5 transition-all text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.title}</p>
                      {a.course_name && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{a.course_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className={`text-xs font-medium ${getDueLabelColor(a.due_at)}`}>
                        {formatDueLabel(a.due_at)}
                      </span>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Study</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-xl">
              <PhotoDropButton />
              <span className="text-xs text-gray-500 dark:text-slate-400">Snap Homework</span>
            </div>
            <Link
              href="/sources"
              className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-600/5 transition-all"
            >
              <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Upload Materials</span>
            </Link>
          </div>

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
      </div>
    )
  }

  // ====================================
  // No LMS: Photo Drop + Manual home
  // ====================================
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

        {/* Connect school prompt */}
        <div className="bg-gray-50 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">
            Want to see your upcoming assignments automatically?
          </p>
          <button
            onClick={() => window.dispatchEvent(new Event('open-settings-drawer'))}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium transition-colors"
          >
            Connect your school in Settings →
          </button>
        </div>
      </div>
    </div>
  )
}

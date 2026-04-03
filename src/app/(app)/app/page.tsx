'use client'

import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { useActiveProfileSummary } from '@/hooks/useActiveProfileSummary'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, MessageSquare, Loader2, Clock, ChevronRight } from 'lucide-react'
import { PhotoDropButton } from '@/components/homework/PhotoDropButton'
import { SubjectEntryForm } from '@/components/tutor/SubjectEntryForm'

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
  const profileSummary = useActiveProfileSummary()
  const router = useRouter()

  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [streakDays, setStreakDays] = useState(0)
  const [loading, setLoading] = useState(true)

  const studentName = profileSummary.summary?.displayName?.split(' ')[0] || 'there'

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
    return () => { cancelled = true }
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
    </div>
  )
}

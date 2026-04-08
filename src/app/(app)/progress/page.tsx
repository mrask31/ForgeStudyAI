'use client'

import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { useActiveProfileSummary } from '@/hooks/useActiveProfileSummary'
import { useUser } from '@/contexts/UserContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, TrendingUp, Clock, BookOpen, Lightbulb, Star,
  GraduationCap, Brain, ChevronRight
} from 'lucide-react'

interface MasteryScore {
  classId: string
  className: string
  classType: string
  score: number
  sessionsCount: number
  lastUpdated: string
}

interface PortfolioEntry {
  id: string
  type: string
  title: string
  content: string | null
  created_at: string
  student_classes?: { name: string } | null
}

interface RecentSession {
  id: string
  title: string | null
  updated_at: string
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'insight': return <Lightbulb className="w-4 h-4 text-amber-400" />
    case 'essay_idea': return <BookOpen className="w-4 h-4 text-indigo-400" />
    case 'strength': return <Star className="w-4 h-4 text-emerald-400" />
    case 'achievement': return <GraduationCap className="w-4 h-4 text-purple-400" />
    default: return <Brain className="w-4 h-4 text-slate-400" />
  }
}

export default function ProgressPage() {
  const { activeProfileId } = useActiveProfile()
  const { user } = useUser()
  const profileSummary = useActiveProfileSummary()
  const router = useRouter()

  const [masteryScores, setMasteryScores] = useState<MasteryScore[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([])
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [loading, setLoading] = useState(true)

  const studentName = profileSummary.summary?.displayName?.split(' ')[0] || 'Student'

  useEffect(() => {
    if (!activeProfileId) {
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all([
      fetch(`/api/mastery/scores?profileId=${activeProfileId}`, { credentials: 'include' }).then(r => r.ok ? r.json() : { scores: [] }),
      fetch(`/api/portfolio?profileId=${activeProfileId}`, { credentials: 'include' }).then(r => r.ok ? r.json() : { entries: [] }),
      fetch('/api/chats/list?includeArchived=false', { credentials: 'include' }).then(r => r.ok ? r.json() : { chats: [] }),
    ]).then(([masteryData, portfolioData, chatsData]) => {
      setMasteryScores(masteryData.scores || [])
      setPortfolio((portfolioData.entries || []).slice(0, 8))
      setRecentSessions((chatsData.chats || []).slice(0, 10))
    }).catch(err => {
      console.error('[Progress] Error loading data:', err)
    }).finally(() => {
      setLoading(false)
    })
  }, [activeProfileId])

  const totalSessions = masteryScores.reduce((sum, s) => sum + s.sessionsCount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#08080F]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#08080F] pb-20 lg:pb-4">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Progress</h1>
          <p className="text-slate-400 text-sm mt-1">
            {studentName} · {totalSessions} total sessions
          </p>
        </div>

        {/* Mastery Scores */}
        {masteryScores.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Mastery Scores</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {masteryScores.map((ms) => (
                <Link
                  key={ms.classId}
                  href={`/courses/${ms.classId}`}
                  className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white truncate">{ms.className}</span>
                    <span className="text-lg font-bold text-indigo-400 ml-2">{ms.score}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        ms.score >= 61 ? 'bg-emerald-500' : ms.score >= 31 ? 'bg-amber-500' : 'bg-red-400'
                      }`}
                      style={{ width: `${ms.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">{ms.sessionsCount} sessions</p>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No mastery scores yet. Start studying to track your progress.</p>
          </div>
        )}

        {/* Portfolio Highlights */}
        {portfolio.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Portfolio Highlights</h2>
              <Link href="/portfolio" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {portfolio.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <div className="mt-0.5">{getTypeIcon(entry.type)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{entry.title}</p>
                    {entry.content && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{entry.content}</p>}
                    <p className="text-xs text-slate-500 mt-0.5">
                      {entry.student_classes?.name && `${entry.student_classes.name} · `}
                      {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Session History</h2>
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/tutor?sessionId=${session.id}`)}
                  className="w-full flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all text-left"
                >
                  <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{session.title || 'Untitled session'}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(session.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

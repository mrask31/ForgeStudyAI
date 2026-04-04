'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { BookOpen, Brain, Lightbulb, Star, GraduationCap, Loader2 } from 'lucide-react'

interface PortfolioEntry {
  id: string
  type: string
  title: string
  content: string | null
  created_at: string
  is_pinned: boolean
  student_classes?: { name: string } | null
}

interface MasteryScore {
  classId: string
  className: string
  score: number
  sessionsCount: number
}

/**
 * Read-only parent view of a child's portfolio.
 * Accessed from parent dashboard at /portfolio/[profileId]
 */
export default function ParentPortfolioView() {
  const params = useParams()
  const profileId = params.profileId as string

  const [entries, setEntries] = useState<PortfolioEntry[]>([])
  const [masteryScores, setMasteryScores] = useState<MasteryScore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) return

    async function loadData() {
      setLoading(true)
      try {
        const [portfolioRes, masteryRes] = await Promise.all([
          fetch(`/api/portfolio?profileId=${profileId}`, { credentials: 'include' }),
          fetch(`/api/mastery/scores?profileId=${profileId}`, { credentials: 'include' }),
        ])
        if (portfolioRes.ok) {
          const data = await portfolioRes.json()
          setEntries(data.entries || [])
        }
        if (masteryRes.ok) {
          const data = await masteryRes.json()
          setMasteryScores(data.scores || [])
        }
      } catch (error) {
        console.error('[Parent Portfolio] Error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [profileId])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'insight': return <Lightbulb className="w-4 h-4 text-amber-400" />
      case 'essay_idea': return <BookOpen className="w-4 h-4 text-indigo-400" />
      case 'strength': return <Star className="w-4 h-4 text-emerald-400" />
      case 'achievement': return <GraduationCap className="w-4 h-4 text-purple-400" />
      default: return <Brain className="w-4 h-4 text-slate-400" />
    }
  }

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
        <div>
          <h1 className="text-2xl font-bold text-white">Student Portfolio</h1>
          <p className="text-slate-400 text-sm mt-1">Read-only parent view</p>
        </div>

        {/* Mastery Overview */}
        {masteryScores.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Mastery Scores</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {masteryScores.map((ms) => (
                <div key={ms.classId} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white truncate">{ms.className}</span>
                    <span className="text-sm font-bold text-indigo-400">{ms.score}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ms.score >= 61 ? 'bg-emerald-500' : ms.score >= 31 ? 'bg-amber-500' : 'bg-red-400'}`}
                      style={{ width: `${ms.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">{ms.sessionsCount} sessions</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio Entries */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Portfolio Entries</h2>
          {entries.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No portfolio entries yet.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                  <div className="mt-0.5">{getTypeIcon(entry.type)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{entry.title}</p>
                    {entry.content && <p className="text-sm text-slate-400 mt-0.5">{entry.content}</p>}
                    <p className="text-xs text-slate-500 mt-1">
                      {entry.student_classes?.name && `${entry.student_classes.name} · `}
                      {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {entry.is_pinned && ' · Pinned'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

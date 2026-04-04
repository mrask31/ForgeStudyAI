'use client'

import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { useActiveProfileSummary } from '@/hooks/useActiveProfileSummary'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen, Brain, Lightbulb, Star, Pin, PinOff, Trash2, Loader2,
  RefreshCw, ArrowRight, GraduationCap, ChevronDown, ChevronRight
} from 'lucide-react'

interface PortfolioEntry {
  id: string
  type: 'insight' | 'essay_idea' | 'achievement' | 'strength'
  title: string
  content: string | null
  course_id: string | null
  session_id: string | null
  created_at: string
  is_pinned: boolean
  student_classes?: { name: string; code: string } | null
}

interface MasteryScore {
  classId: string
  className: string
  classType: string
  score: number
  sessionsCount: number
}

type Tab = 'journey' | 'essays' | 'strengths' | 'college'

const COLLEGE_TIMELINE = [
  {
    grades: ['9', '10'],
    label: 'Grades 9-10',
    items: [
      'Build mastery across core subjects',
      'Explore interests through different courses',
      'Start building study habits with ForgeStudy',
      'Track your strengths in the portfolio',
    ],
  },
  {
    grades: ['11'],
    label: 'Grade 11',
    items: [
      'SAT/ACT prep — use the tutor for practice',
      'Start brainstorming essay topics from your insights',
      'Research colleges that match your strengths',
      'Build your Skills Profile for recommendations',
    ],
  },
  {
    grades: ['12'],
    label: 'Grade 12',
    items: [
      'Write college essays using your Essay Ideas bank',
      'Share your Academic Strengths Summary with counselors',
      'Request recommendation letters early',
      'Apply for financial aid and scholarships',
    ],
  },
]

export default function PortfolioPage() {
  const { activeProfileId } = useActiveProfile()
  const profileSummary = useActiveProfileSummary()
  const router = useRouter()

  const [entries, setEntries] = useState<PortfolioEntry[]>([])
  const [masteryScores, setMasteryScores] = useState<MasteryScore[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('journey')
  const [strengthsSummary, setStrengthsSummary] = useState<string | null>(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)

  const gradeBand = profileSummary.summary?.gradeBand
  const grade = profileSummary.summary?.grade
  const isHighSchool = gradeBand === 'high'
  const studentName = profileSummary.summary?.displayName || 'Student'
  const totalSessions = masteryScores.reduce((sum, s) => sum + s.sessionsCount, 0)

  useEffect(() => {
    if (!activeProfileId) {
      setLoading(false)
      return
    }

    async function loadData() {
      setLoading(true)
      try {
        const [portfolioRes, masteryRes] = await Promise.all([
          fetch(`/api/portfolio?profileId=${activeProfileId}`, { credentials: 'include' }),
          fetch(`/api/mastery/scores?profileId=${activeProfileId}`, { credentials: 'include' }),
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
        console.error('[Portfolio] Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [activeProfileId])

  const handlePin = async (id: string, currentPinned: boolean) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, is_pinned: !currentPinned } : e))
    await fetch('/api/portfolio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, is_pinned: !currentPinned }),
    })
  }

  const handleDelete = async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    await fetch('/api/portfolio', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id }),
    })
  }

  const generateSummary = async () => {
    if (!activeProfileId) return
    setGeneratingSummary(true)
    try {
      const res = await fetch('/api/portfolio/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ profileId: activeProfileId }),
      })
      if (res.ok) {
        const data = await res.json()
        setStrengthsSummary(data.summary)
      }
    } catch {
      // Non-critical
    } finally {
      setGeneratingSummary(false)
    }
  }

  const openTutorWithContext = (title: string, content: string) => {
    localStorage.setItem('forgestudy-tutor-prefill', `Help me develop this idea for a college essay:\n\nTitle: ${title}\n${content}`)
    localStorage.setItem('forgestudy-tutor-auto-send', 'true')
    router.push('/tutor?intent=new_question')
  }

  const getMasteryColor = (score: number) => {
    if (score >= 61) return 'bg-emerald-500'
    if (score >= 31) return 'bg-amber-500'
    return 'bg-red-400'
  }

  const getMasteryBadge = (score: number) => {
    if (score >= 61) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    if (score >= 31) return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    return 'text-red-400 bg-red-500/10 border-red-500/20'
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'insight': return <Lightbulb className="w-4 h-4 text-amber-400" />
      case 'essay_idea': return <BookOpen className="w-4 h-4 text-indigo-400" />
      case 'strength': return <Star className="w-4 h-4 text-emerald-400" />
      case 'achievement': return <GraduationCap className="w-4 h-4 text-purple-400" />
      default: return <Brain className="w-4 h-4 text-slate-400" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'insight': return 'Insight'
      case 'essay_idea': return 'Essay Idea'
      case 'strength': return 'Strength'
      case 'achievement': return 'Achievement'
      default: return type
    }
  }

  const filteredEntries = (type?: string) => {
    const sorted = [...entries].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return type ? sorted.filter(e => e.type === type) : sorted
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#08080F]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'journey', label: 'Learning Journey', show: true },
    { key: 'essays', label: 'Essay Ideas', show: true },
    { key: 'strengths', label: 'Strengths', show: true },
    { key: 'college', label: 'College Prep', show: isHighSchool },
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-[#08080F] pb-20 lg:pb-4">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Your Academic Portfolio</h1>
          <p className="text-slate-400 text-sm mt-1">
            {studentName} · {gradeBand === 'high' ? 'High School' : 'Middle School'}
            {grade ? ` · Grade ${grade}` : ''} · {totalSessions} sessions
          </p>
        </div>

        {/* Mastery Map */}
        {masteryScores.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Mastery Map</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {masteryScores.map((ms) => (
                <div key={ms.classId} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white truncate">{ms.className}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getMasteryBadge(ms.score)}`}>
                      {ms.score}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${getMasteryColor(ms.score)}`} style={{ width: `${ms.score}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">{ms.sessionsCount} sessions</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1">
          {tabs.filter(t => t.show).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Learning Journey */}
        {activeTab === 'journey' && (
          <div className="space-y-3">
            {filteredEntries().length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No portfolio entries yet.</p>
                <p className="text-xs mt-1">Keep studying — notable moments will be captured automatically.</p>
              </div>
            ) : (
              filteredEntries().map((entry) => (
                <div key={entry.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getTypeIcon(entry.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">{entry.title}</span>
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                          {getTypeLabel(entry.type)}
                        </span>
                      </div>
                      {entry.content && (
                        <p className="text-sm text-slate-400 mb-1">{entry.content}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {entry.student_classes && <span>{entry.student_classes.name}</span>}
                        <span>{new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handlePin(entry.id, entry.is_pinned)} className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors">
                        {entry.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Essay Ideas */}
        {activeTab === 'essays' && (
          <div className="space-y-3">
            {filteredEntries('essay_idea').length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No essay ideas captured yet.</p>
                <p className="text-xs mt-1">When you express interesting ideas in tutoring, they'll appear here.</p>
              </div>
            ) : (
              filteredEntries('essay_idea').map((entry) => (
                <div key={entry.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1">{entry.title}</h3>
                      {entry.content && <p className="text-sm text-slate-400 mb-2">{entry.content}</p>}
                      <p className="text-xs text-slate-500">
                        {entry.student_classes?.name && `${entry.student_classes.name} · `}
                        {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => openTutorWithContext(entry.title, entry.content || '')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-xs font-medium hover:bg-indigo-600/30 transition-colors flex-shrink-0"
                    >
                      Develop this <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Strengths */}
        {activeTab === 'strengths' && (
          <div className="space-y-4">
            {/* AI Summary */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Academic Strengths Summary</h3>
                <button
                  onClick={generateSummary}
                  disabled={generatingSummary}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-600/10 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${generatingSummary ? 'animate-spin' : ''}`} />
                  {generatingSummary ? 'Generating...' : strengthsSummary ? 'Regenerate' : 'Generate'}
                </button>
              </div>
              {strengthsSummary ? (
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{strengthsSummary}</p>
              ) : (
                <p className="text-sm text-slate-500">Click "Generate" to create an AI-powered summary of your academic strengths.</p>
              )}
            </div>

            {/* Strength entries */}
            {filteredEntries('strength').length > 0 && (
              <div className="space-y-2">
                {filteredEntries('strength').map((entry) => (
                  <div key={entry.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                    <Star className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white">{entry.title}</p>
                      {entry.content && <p className="text-sm text-slate-400 mt-0.5">{entry.content}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* College Prep (grades 9-12 only) */}
        {activeTab === 'college' && isHighSchool && (
          <div className="space-y-4">
            {/* Strengths Summary for College */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Academic Strengths Summary</h3>
              </div>
              {strengthsSummary ? (
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{strengthsSummary}</p>
              ) : (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Generate a summary of your academic strengths for college applications.</p>
                  <button
                    onClick={generateSummary}
                    disabled={generatingSummary}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {generatingSummary ? 'Generating...' : 'Generate Summary'}
                  </button>
                </div>
              )}
            </div>

            {/* Essay Brainstorm Bank */}
            {filteredEntries('essay_idea').length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Essay Brainstorm Bank</h3>
                <div className="space-y-2">
                  {filteredEntries('essay_idea').map((entry) => (
                    <div key={entry.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{entry.title}</p>
                        {entry.content && <p className="text-xs text-slate-400 truncate">{entry.content}</p>}
                      </div>
                      <button
                        onClick={() => openTutorWithContext(entry.title, entry.content || '')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-500 transition-colors flex-shrink-0"
                      >
                        Work on this <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills Profile */}
            {filteredEntries('strength').length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Skills Profile</h3>
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
                  {filteredEntries('strength').map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2">
                      <Star className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-300">{entry.title}{entry.content ? ` — ${entry.content}` : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* College Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">College Timeline</h3>
              <div className="space-y-3">
                {COLLEGE_TIMELINE.map((period) => {
                  const isCurrentPeriod = grade ? period.grades.includes(grade) : false
                  return (
                    <div
                      key={period.label}
                      className={`border rounded-xl p-4 ${
                        isCurrentPeriod
                          ? 'bg-indigo-600/10 border-indigo-500/30'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <h4 className={`text-sm font-semibold mb-2 ${isCurrentPeriod ? 'text-indigo-400' : 'text-white'}`}>
                        {period.label} {isCurrentPeriod && '(You are here)'}
                      </h4>
                      <ul className="space-y-1.5">
                        {period.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                            <ChevronRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-600" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

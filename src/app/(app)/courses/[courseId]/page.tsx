'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight, BookOpen, Clock, Loader2, Plus, FileText,
  Lightbulb, Star, GraduationCap, Brain, ChevronRight, Play, Upload
} from 'lucide-react'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'

interface CourseWorkspaceData {
  course: { id: string; name: string; code: string; type: string }
  mastery: {
    score: number
    sessionsCount: number
    lastUpdated: string | null
    history: { id: string; scoreDelta: number; createdAt: string }[]
  }
  assignments: { id: string; title: string; due_date: string | null; notes: string | null; is_complete: boolean; course_name: string }[]
  documents: { fileKey: string; filename: string; documentType: string | null; createdAt: string }[]
  sessions: { id: string; title: string; updatedAt: string }[]
  portfolio: { id: string; type: string; title: string; content: string | null; created_at: string; is_pinned: boolean }[]
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'No date'
  const diff = new Date(dateStr).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `In ${days} days`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getMasteryColor(score: number) {
  if (score >= 61) return 'bg-emerald-500'
  if (score >= 31) return 'bg-amber-500'
  return 'bg-red-400'
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'insight': return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
    case 'essay_idea': return <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
    case 'strength': return <Star className="w-3.5 h-3.5 text-emerald-400" />
    case 'achievement': return <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
    default: return <Brain className="w-3.5 h-3.5 text-slate-400" />
  }
}

export default function CourseWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const { activeProfileId } = useActiveProfile()
  const [data, setData] = useState<CourseWorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeProfileId || !courseId) return
    setLoading(true)

    fetch(`/api/courses/${courseId}?profileId=${activeProfileId}`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeProfileId, courseId])

  const openTutor = (context?: string) => {
    if (context) {
      localStorage.setItem('forgestudy-tutor-prefill', context)
      localStorage.setItem('forgestudy-tutor-auto-send', 'true')
    }
    router.push(`/tutor?classId=${courseId}&intent=new_question`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#08080F]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full bg-[#08080F]">
        <p className="text-slate-400">Course not found.</p>
      </div>
    )
  }

  const { course, mastery, assignments, documents, sessions, portfolio } = data

  return (
    <div className="flex-1 overflow-y-auto bg-[#08080F] pb-20 lg:pb-4">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/progress" className="hover:text-indigo-400 transition-colors">Galaxy</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-300">{course.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{course.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getMasteryColor(mastery.score)}`} />
                <span className="text-lg font-bold text-white">{mastery.score}</span>
                <span className="text-sm text-slate-400">mastery</span>
              </div>
              <span className="text-slate-600">·</span>
              <span className="text-sm text-slate-400">{mastery.sessionsCount} sessions</span>
            </div>
          </div>
          <button
            onClick={() => openTutor()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-colors flex-shrink-0"
          >
            <Play className="w-4 h-4" />
            Study Now
          </button>
        </div>

        {/* Mastery Progress Bar */}
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getMasteryColor(mastery.score)}`}
            style={{ width: `${mastery.score}%` }}
          />
        </div>

        {/* Mastery History */}
        {mastery.history.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Mastery History</h2>
            <div className="space-y-2">
              {mastery.history.map((h) => {
                const date = new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                  <div key={h.id} className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-sm">
                    <span className="text-slate-400">{date}</span>
                    <span className={`font-medium ${h.scoreDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.scoreDelta >= 0 ? '+' : ''}{h.scoreDelta} points
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Upcoming Assignments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Assignments</h2>
            <button
              onClick={() => {
                // Navigate to home with add modal pre-filled for this course
                router.push(`/app?addAssignment=true&courseName=${encodeURIComponent(course.name)}`)
              }}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Assignment
            </button>
          </div>
          {assignments.length > 0 ? (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{a.title}</p>
                    <p className="text-xs text-slate-500">{formatRelativeDate(a.due_date)}</p>
                  </div>
                  <button
                    onClick={() => openTutor(`Help me study for this assignment: ${a.title}`)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-600/10 transition-colors flex-shrink-0 ml-3"
                  >
                    Study this <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-900/40 border border-slate-800/50 rounded-xl text-center">
              <p className="text-sm text-slate-500">No upcoming assignments for this course.</p>
            </div>
          )}
        </div>

        {/* Study Vault Documents */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Study Vault</h2>
            <Link
              href={`/vault?classId=${courseId}`}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </Link>
          </div>
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.fileKey} className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{doc.filename}</p>
                    <p className="text-xs text-slate-500">
                      {doc.documentType && `${doc.documentType} · `}
                      {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-900/40 border border-slate-800/50 rounded-xl text-center">
              <p className="text-sm text-slate-500">Upload your notes or textbook pages to get personalized help.</p>
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Sessions</h2>
            <div className="space-y-2">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/tutor?sessionId=${s.id}`)}
                  className="w-full flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="text-sm text-white truncate">{s.title}</span>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0 ml-3">{formatTimeAgo(s.updatedAt)}</span>
                </button>
              ))}
            </div>
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{entry.title}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded capitalize">{entry.type.replace('_', ' ')}</span>
                    </div>
                    {entry.content && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{entry.content}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

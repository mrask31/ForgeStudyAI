'use client'

import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { useActiveProfileSummary } from '@/hooks/useActiveProfileSummary'
import { useUser } from '@/contexts/UserContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'

interface StudentClass {
  id: string
  name: string
  code: string
  type: string
  next_test_date: string | null
}

interface MasteryScore {
  classId: string
  score: number
}

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getMasteryDot(score: number | undefined): string {
  if (!score || score === 0) return 'bg-slate-600' // no sessions
  if (score >= 61) return 'bg-emerald-500' // strong
  return 'bg-amber-500' // in progress
}

export default function HomePage() {
  const { activeProfileId } = useActiveProfile()
  const { user } = useUser()
  const profileSummary = useActiveProfileSummary()
  const router = useRouter()

  const [classes, setClasses] = useState<StudentClass[]>([])
  const [masteryMap, setMasteryMap] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showAddClass, setShowAddClass] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [adding, setAdding] = useState(false)

  const studentName = profileSummary.summary?.displayName?.split(' ')[0] || 'there'

  useEffect(() => {
    if (!activeProfileId || !user) {
      setLoading(false)
      return
    }

    async function loadData() {
      setLoading(true)
      const supabase = getSupabaseBrowser()

      try {
        // Fetch classes
        const { data: classData } = await supabase
          .from('student_classes')
          .select('id, name, code, type, next_test_date')
          .eq('user_id', user!.id)
          .order('name')

        setClasses(classData || [])

        // Fetch mastery scores
        const res = await fetch(`/api/mastery/scores?profileId=${activeProfileId}`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const map = new Map<string, number>()
          for (const s of data.scores || []) {
            map.set(s.classId, s.score)
          }
          setMasteryMap(map)
        }
      } catch (err) {
        console.error('[Home] Error loading classes:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [activeProfileId, user])

  const handleAddClass = async () => {
    if (!newClassName.trim() || !user) return
    setAdding(true)
    try {
      const supabase = getSupabaseBrowser()
      const { data } = await supabase
        .from('student_classes')
        .insert({ user_id: user.id, name: newClassName.trim(), code: '', type: 'other' })
        .select()
        .single()

      if (data) {
        setClasses(prev => [...prev, data])
      }
      setNewClassName('')
      setShowAddClass(false)
    } catch {
      // Non-critical
    } finally {
      setAdding(false)
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
      <div className="max-w-lg mx-auto px-4 py-8 md:py-12">
        {/* Greeting */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-8">
          {getTimeGreeting()}, {studentName} 👋
        </h1>

        {/* Class Tiles */}
        {classes.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {classes.map(cls => {
                const mastery = masteryMap.get(cls.id)

                // Post-test check: test date within past 48 hours
                const isPostTest = cls.next_test_date && (() => {
                  const diff = Date.now() - new Date(cls.next_test_date!).getTime()
                  return diff > 0 && diff < 48 * 60 * 60 * 1000
                })()

                const handleTestFeedback = async (good: boolean) => {
                  const supabase = (await import('@/lib/supabase/client')).getSupabaseBrowser()
                  await supabase.from('student_classes').update({ next_test_date: null }).eq('id', cls.id)
                  if (good) {
                    setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, next_test_date: null } : c))
                  } else {
                    localStorage.setItem('forgestudy-tutor-prefill', `I just got my ${cls.name} test back and it didn't go well. Can we figure out what I missed?`)
                    localStorage.setItem('forgestudy-tutor-auto-send', 'true')
                    router.push(`/tutor?classId=${cls.id}&className=${encodeURIComponent(cls.name)}&intent=new_question`)
                  }
                }

                return (
                  <div key={cls.id} className="relative">
                    <button
                      onClick={() => !isPostTest && router.push(`/tutor?classId=${cls.id}&className=${encodeURIComponent(cls.name)}&intent=new_question`)}
                      className={`w-full group p-5 bg-slate-900/60 border border-slate-800 rounded-2xl text-left hover:border-indigo-500/40 hover:bg-slate-900/80 transition-all active:scale-[0.98] ${isPostTest ? 'pointer-events-none' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${isPostTest ? 'bg-amber-400 animate-pulse' : getMasteryDot(mastery)}`} />
                      </div>
                      <h2 className="text-base font-semibold text-white leading-tight">
                        {cls.name}
                      </h2>
                    </button>
                    {isPostTest && (
                      <div className="mt-1.5 flex items-center justify-between px-2">
                        <span className="text-[11px] text-slate-400">How'd your test go?</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleTestFeedback(true)} className="text-base hover:scale-125 transition-transform">😊</button>
                          <button onClick={() => handleTestFeedback(false)} className="text-base hover:scale-125 transition-transform">😟</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-center text-xs text-slate-600 mt-4">Tap a class to start studying</p>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">No classes yet. Add your first class to get started.</p>
          </div>
        )}

        {/* Add a class */}
        {showAddClass ? (
          <div className="mt-6 flex gap-2">
            <input
              type="text"
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
              placeholder="Class name"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleAddClass() }}
              className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button onClick={handleAddClass} disabled={adding || !newClassName.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </button>
            <button onClick={() => { setShowAddClass(false); setNewClassName('') }}
              className="px-3 py-2.5 text-slate-500 hover:text-white text-sm transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setShowAddClass(true)}
            className="mt-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-400 transition-colors mx-auto">
            <Plus className="w-4 h-4" />
            Add another class
          </button>
        )}
      </div>
    </div>
  )
}

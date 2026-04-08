'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Flame, TrendingUp } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'

export default function SubscribePage() {
  const supabase = useMemo(() => getSupabaseBrowser(), [])
  const [streakDays, setStreakDays] = useState(0)
  const [topSubject, setTopSubject] = useState<{ name: string; score: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProgress() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        // Get active profile
        const { data: profiles } = await supabase
          .from('student_profiles')
          .select('id, current_streak_days')
          .eq('owner_id', user.id)
          .limit(1)

        if (profiles?.[0]) {
          setStreakDays(profiles[0].current_streak_days || 0)

          // Get top mastery score
          const { data: scores } = await supabase
            .from('mastery_scores')
            .select('score, student_classes!inner(name)')
            .eq('profile_id', profiles[0].id)
            .order('score', { ascending: false })
            .limit(1)

          if (scores?.[0]) {
            setTopSubject({
              name: (scores[0] as any).student_classes?.name || 'Subject',
              score: scores[0].score,
            })
          }
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false)
      }
    }

    loadProgress()
  }, [supabase])

  return (
    <div className="min-h-screen bg-[#08080F] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-3">
            You've loved ForgeStudy AI for 7 days.
          </h1>
          <p className="text-lg text-slate-400">
            Keep going — your progress is waiting.
          </p>
        </div>

        {/* Progress they'd lose */}
        {!loading && (streakDays > 0 || topSubject) && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Don't lose your progress</p>
            {streakDays > 0 && (
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-amber-400" />
                <span className="text-white font-medium">You built a 🔥 {streakDays} day streak</span>
              </div>
            )}
            {topSubject && (
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <span className="text-white font-medium">Your {topSubject.name} score reached {topSubject.score}</span>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="space-y-4">
          <Link
            href="/checkout"
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg transition-colors"
          >
            Start your subscription
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-slate-500">
            Questions? <a href="mailto:hello@forgestudyai.com" className="text-indigo-400 hover:text-indigo-300">hello@forgestudyai.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}

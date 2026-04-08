'use client'

import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { useActiveProfileSummary } from '@/hooks/useActiveProfileSummary'
import { useUser } from '@/contexts/UserContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ConceptGalaxy } from '@/components/galaxy/ConceptGalaxy'
import { GalaxySkeleton } from '@/components/galaxy/GalaxySkeleton'
import { getStudyTopicsWithMastery, getQuarantinedTopicsCount, getTopicsGroupedByCourse, type CoursePlanet } from '@/app/actions/study-topics'

interface MasteryScore {
  classId: string
  className: string
  score: number
  sessionsCount: number
}

export default function ProgressPage() {
  const { activeProfileId } = useActiveProfile()
  const { user } = useUser()
  const profileSummary = useActiveProfileSummary()
  const router = useRouter()

  const [streakDays, setStreakDays] = useState(0)
  const [masteryScores, setMasteryScores] = useState<MasteryScore[]>([])
  const [galaxyTopics, setGalaxyTopics] = useState<any[]>([])
  const [coursePlanets, setCoursePlanets] = useState<CoursePlanet[]>([])
  const [totalTopicCount, setTotalTopicCount] = useState(0)
  const [galaxyLoading, setGalaxyLoading] = useState(true)
  const [loading, setLoading] = useState(true)

  const studentName = profileSummary.summary?.displayName?.split(' ')[0] || 'Student'

  useEffect(() => {
    if (!activeProfileId || !user) {
      setLoading(false)
      setGalaxyLoading(false)
      return
    }

    // Load mastery + streak
    setLoading(true)
    Promise.all([
      fetch(`/api/mastery/scores?profileId=${activeProfileId}`, { credentials: 'include' }).then(r => r.ok ? r.json() : { scores: [] }),
      fetch(`/api/streak?profileId=${activeProfileId}`).then(r => r.ok ? r.json() : { current_streak_days: 0 }).catch(() => ({ current_streak_days: 0 })),
    ]).then(([masteryData, streakData]) => {
      setMasteryScores(masteryData.scores || [])
      setStreakDays(streakData.current_streak_days || 0)
    }).finally(() => setLoading(false))

    // Load Galaxy data
    setGalaxyLoading(true)
    Promise.all([
      getStudyTopicsWithMastery(activeProfileId),
      getQuarantinedTopicsCount(activeProfileId),
      getTopicsGroupedByCourse(activeProfileId),
    ]).then(([topicsData, quarantinedData, planetsData]) => {
      setGalaxyTopics(topicsData)
      setCoursePlanets(planetsData)
      setTotalTopicCount(topicsData.length + quarantinedData)
    }).catch(err => {
      console.error('[Progress] Galaxy load error:', err)
    }).finally(() => setGalaxyLoading(false))
  }, [activeProfileId, user])

  if (loading && galaxyLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#08080F]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#08080F] pb-20 lg:pb-4">
      {/* Streak Badge */}
      {streakDays > 0 && (
        <div className="flex justify-center pt-4">
          <div className="bg-slate-900/60 border border-amber-500/30 rounded-xl px-4 py-1.5">
            <span className="text-amber-400 text-sm font-bold">🔥 {streakDays} day streak</span>
          </div>
        </div>
      )}

      {/* Galaxy Visualization */}
      <div className="relative w-full h-[50vh] md:h-[55vh]">
        {galaxyLoading ? (
          <GalaxySkeleton />
        ) : galaxyTopics.length > 0 || coursePlanets.length > 0 ? (
          <ConceptGalaxy
            topics={galaxyTopics}
            coursePlanets={coursePlanets}
            studentName={studentName}
            profileId={activeProfileId || undefined}
            totalTopicCount={totalTopicCount}
            onTopicsRefresh={async () => {
              if (activeProfileId && user) {
                const topicsData = await getStudyTopicsWithMastery(activeProfileId)
                setGalaxyTopics(topicsData)
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500 text-sm">Start studying to build your Galaxy.</p>
          </div>
        )}
      </div>

      {/* Mastery List */}
      {masteryScores.length > 0 && (
        <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Mastery</h2>
          {masteryScores.map((ms) => (
            <button
              key={ms.classId}
              onClick={() => router.push(`/tutor?classId=${ms.classId}&intent=new_question`)}
              className="w-full flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all text-left"
            >
              <div>
                <p className="text-sm font-medium text-white">{ms.className}</p>
                <p className="text-xs text-slate-500">{ms.sessionsCount} sessions</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      ms.score >= 61 ? 'bg-emerald-500' : ms.score >= 31 ? 'bg-amber-500' : 'bg-red-400'
                    }`}
                    style={{ width: `${ms.score}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-indigo-400 w-8 text-right">{ms.score}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

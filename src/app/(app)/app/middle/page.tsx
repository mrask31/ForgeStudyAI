'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { ConceptGalaxy } from '@/components/galaxy/ConceptGalaxy'
import { GalaxyLegend } from '@/components/galaxy/GalaxyLegend'
import { SmartCTA } from '@/components/galaxy/SmartCTA'
import { DecontaminationBanner } from '@/components/galaxy/DecontaminationBanner'
import { useEffect, useState } from 'react'
import { getStudyTopicsWithMastery, getQuarantinedTopicsCount } from '@/app/actions/study-topics'
import { calculateSmartCTA, type SmartCTAResult } from '@/lib/smart-cta'
import { useUser } from '@/contexts/UserContext'

export default function MiddleDashboardPage() {
  const { activeProfileId } = useActiveProfile()
  const { user } = useUser()
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [smartCTA, setSmartCTA] = useState<SmartCTAResult | null>(null)
  const [quarantinedCount, setQuarantinedCount] = useState(0)

  useEffect(() => {
    async function loadData() {
      if (!activeProfileId || !user) {
        setLoading(false)
        return
      }
      
      try {
        const [topicsData, ctaData, quarantinedData] = await Promise.all([
          getStudyTopicsWithMastery(activeProfileId),
          calculateSmartCTA(user.id, activeProfileId),
          getQuarantinedTopicsCount(activeProfileId)
        ])
        setTopics(topicsData)
        setSmartCTA(ctaData)
        setQuarantinedCount(quarantinedData)
      } catch (error) {
        console.error('[Study Hub] Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [activeProfileId, user])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      {/* Decontamination Banner */}
      <DecontaminationBanner quarantinedCount={quarantinedCount} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex flex-col gap-10">
          <section className="rounded-3xl border border-slate-200/70 bg-white/90 shadow-xl shadow-slate-200/40 p-8 sm:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100/80 text-cyan-700 text-xs font-semibold px-3 py-1 mb-4">
                  ForgeMiddle • Grades 6–8
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
                  Your Learning Galaxy
                </h1>
                <p className="text-slate-600 text-base sm:text-lg max-w-2xl">
                  Watch your knowledge grow. Click any concept to start studying.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href="/sources"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Upload Materials
                </Link>
              </div>
            </div>
            {!activeProfileId && (
              <div className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Choose a student profile to see your learning galaxy.
              </div>
            )}
          </section>

          {/* Concept Galaxy */}
          <section className="rounded-3xl border border-slate-200/70 bg-white/90 shadow-xl shadow-slate-200/40 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Concept Galaxy</h2>
              <p className="text-slate-600 mb-4">
                Each star represents a topic you're learning. Click to study.
              </p>
              <GalaxyLegend />
            </div>
            
            {loading ? (
              <div className="w-full h-[600px] bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center">
                <div className="text-slate-400">Loading your galaxy...</div>
              </div>
            ) : (
              <>
                <ConceptGalaxy topics={topics} />
                {smartCTA && (
                  <SmartCTA 
                    label={smartCTA.label}
                    action={smartCTA.action}
                    reason={smartCTA.reason}
                    topicId={smartCTA.topicId}
                    orbitState={smartCTA.orbitState}
                  />
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

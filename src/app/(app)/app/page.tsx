'use client'

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
import Link from 'next/link'

export default function GalaxyPage() {
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
        console.error('[Galaxy] Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [activeProfileId, user])

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden">
      {/* Decontamination Banner - Floating at top */}
      {quarantinedCount > 0 && (
        <div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md">
          <DecontaminationBanner quarantinedCount={quarantinedCount} />
        </div>
      )}
      
      {/* Top Left HUD - Title & Legend (Hidden on mobile) */}
      <div className="hidden md:block absolute top-6 left-6 z-40 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl p-6 max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">
            Your Learning Galaxy
          </h1>
        </div>
        <p className="text-slate-300 text-sm mb-4">
          Each star represents a concept you're mastering. Click any node to study.
        </p>
        <GalaxyLegend />
      </div>
      
      {/* Top Right HUD - Upload Button (Smaller on mobile) */}
      <div className="absolute top-4 md:top-6 right-4 md:right-6 z-40">
        <Link
          href="/sources"
          className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl text-white text-sm md:text-base font-semibold hover:bg-slate-800/60 transition-all"
        >
          <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">Upload Materials</span>
          <span className="sm:hidden">Upload</span>
        </Link>
      </div>
      
      {/* Full-Bleed Galaxy Canvas */}
      <div className="w-full h-full">
        {!activeProfileId ? (
          <div className="flex items-center justify-center h-full px-4">
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl p-6 md:p-8 max-w-md text-center">
              <p className="text-amber-300 text-sm">
                Choose a student profile to see your learning galaxy.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-400">Loading your galaxy...</div>
          </div>
        ) : (
          <ConceptGalaxy 
            topics={topics} 
            profileId={activeProfileId || undefined}
            onTopicsRefresh={async () => {
              // Refresh topics after lazy eval or snap-back
              if (activeProfileId && user) {
                const topicsData = await getStudyTopicsWithMastery(activeProfileId);
                setTopics(topicsData);
              }
            }}
          />
        )}
      </div>
      
      {/* Bottom Center HUD - Smart CTA (Sticky bottom sheet on mobile) */}
      {smartCTA && (
        <div className="fixed md:absolute bottom-0 md:bottom-8 left-0 md:left-1/2 md:-translate-x-1/2 w-full md:w-auto z-40">
          <div className="bg-slate-900/90 md:bg-slate-900/60 backdrop-blur-md border-t md:border border-slate-700/50 rounded-t-xl md:rounded-xl shadow-2xl p-4 md:p-6">
            <SmartCTA 
              label={smartCTA.label}
              action={smartCTA.action}
              reason={smartCTA.reason}
              topicId={smartCTA.topicId}
              orbitState={smartCTA.orbitState}
              vaultTopicIds={smartCTA.vaultTopicIds}
            />
          </div>
        </div>
      )}
    </div>
  )
}

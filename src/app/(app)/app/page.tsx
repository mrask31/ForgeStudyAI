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
    <div className="relative min-h-screen bg-slate-950">
      {/* Decontamination Banner - Floating at top */}
      {quarantinedCount > 0 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
          <DecontaminationBanner quarantinedCount={quarantinedCount} />
        </div>
      )}
      
      {/* Top Left HUD - Title & Legend */}
      <div className="absolute top-6 left-6 z-40 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl p-6 max-w-md">
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
      
      {/* Top Right HUD - Upload Button */}
      <div className="absolute top-6 right-6 z-40">
        <Link
          href="/sources"
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl text-white font-semibold hover:bg-slate-800/60 transition-all"
        >
          <Sparkles className="w-5 h-5" />
          Upload Materials
        </Link>
      </div>
      
      {/* Full-Bleed Galaxy Canvas */}
      <div className="w-full h-screen">
        {!activeProfileId ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl p-8 max-w-md text-center">
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
      
      {/* Bottom Center HUD - Smart CTA */}
      {smartCTA && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl p-6">
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

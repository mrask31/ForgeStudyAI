'use client'

import { Sparkles, Share2 } from 'lucide-react'
import { toast } from 'sonner'
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

// Module-level cache survives component unmount/remount during client-side navigation
const galaxyCache: {
  profileId: string | null
  topics: any[]
  smartCTA: SmartCTAResult | null
  quarantinedCount: number
} = { profileId: null, topics: [], smartCTA: null, quarantinedCount: 0 }

export default function GalaxyPage() {
  const { activeProfileId } = useActiveProfile()
  const { user } = useUser()
  const [topics, setTopics] = useState<any[]>(() =>
    galaxyCache.profileId === activeProfileId ? galaxyCache.topics : []
  )
  const [loading, setLoading] = useState(() =>
    galaxyCache.profileId === activeProfileId && galaxyCache.topics.length > 0 ? false : true
  )
  const [smartCTA, setSmartCTA] = useState<SmartCTAResult | null>(() =>
    galaxyCache.profileId === activeProfileId ? galaxyCache.smartCTA : null
  )
  const [quarantinedCount, setQuarantinedCount] = useState(() =>
    galaxyCache.profileId === activeProfileId ? galaxyCache.quarantinedCount : 0
  )
  const [lmsStatus, setLmsStatus] = useState<'no_connection' | 'connected' | null>(null)
  const [hasDueSoonItems, setHasDueSoonItems] = useState(false)

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
        // Persist to module-level cache for instant render on remount
        galaxyCache.profileId = activeProfileId
        galaxyCache.topics = topicsData
        galaxyCache.smartCTA = ctaData
        galaxyCache.quarantinedCount = quarantinedData
      } catch (error) {
        console.error('[Galaxy] Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [activeProfileId, user])

  // Check LMS connection status for empty state guidance
  useEffect(() => {
    async function checkLMS() {
      if (!activeProfileId) return
      try {
        const res = await fetch(`/api/parent/lms/status/${activeProfileId}`)
        if (res.ok) {
          const data = await res.json()
          const canvas = data.connections?.find(
            (c: any) => c.provider === 'canvas' && c.status === 'active'
          )
          setLmsStatus(canvas ? 'connected' : 'no_connection')
        } else {
          setLmsStatus('no_connection')
        }
      } catch {
        setLmsStatus('no_connection')
      }
    }
    checkLMS()
  }, [activeProfileId])

  // Auto-sync LMS on Galaxy page load (once per session)
  useEffect(() => {
    async function triggerAutoSync() {
      if (!activeProfileId || !user) return

      // Check if already synced this session
      const syncKey = `lms_sync_triggered_${activeProfileId}`
      if (sessionStorage.getItem(syncKey)) {
        return
      }

      try {
        // Silent sync trigger - fire and forget
        fetch('/api/internal/sync/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include session cookies
          body: JSON.stringify({ profileId: activeProfileId }), // Use profileId for student session
        }).catch((err) => {
          console.debug('[Galaxy] Auto-sync failed (non-critical):', err)
        })

        // Mark as synced for this session
        sessionStorage.setItem(syncKey, 'true')
      } catch (err) {
        console.debug('[Galaxy] Auto-sync error (non-critical):', err)
      }
    }

    triggerAutoSync()
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
      <div className="hidden md:block absolute top-6 left-6 z-40 bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl p-6 max-w-md">
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
        {activeProfileId && (
          <button
            onClick={() => {
              const url = `${window.location.origin}/share/${activeProfileId}`;
              navigator.clipboard.writeText(url).then(() => {
                toast.success('Share link copied to clipboard!');
              }).catch(() => {
                toast.error('Failed to copy link');
              });
            }}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg text-sm font-medium text-indigo-300 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share Progress
          </button>
        )}
      </div>
      
      {/* Top Right HUD - Upload Button (Smaller on mobile) */}
      <div className="absolute top-4 md:top-6 right-4 md:right-6 z-40">
        <Link
          href="/sources"
          className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl text-white text-sm md:text-base font-semibold hover:bg-slate-800/60 transition-all"
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
            lmsStatus={lmsStatus}
            onDueSoonChange={setHasDueSoonItems}
            onTopicsRefresh={async () => {
              // Refresh topics after lazy eval or snap-back
              if (activeProfileId && user) {
                const topicsData = await getStudyTopicsWithMastery(activeProfileId);
                setTopics(topicsData);
                galaxyCache.topics = topicsData;
              }
            }}
          />
        )}
      </div>
      
      {/* Bottom Center HUD - Smart CTA (only when no due-soon items to avoid overlap) */}
      {smartCTA && !hasDueSoonItems && (
        <div className="fixed md:absolute bottom-0 md:bottom-8 left-0 md:left-1/2 md:-translate-x-1/2 w-full md:w-auto z-40">
          <div className="bg-slate-900/90 md:bg-slate-900/40 backdrop-blur-md border-t md:border border-slate-700/50 rounded-t-xl md:rounded-xl shadow-2xl p-4 md:p-6">
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

      {/* Settings Drawer is now mounted globally in layout */}
    </div>
  )
}

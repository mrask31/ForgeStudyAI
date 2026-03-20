'use client'

import { Sparkles, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { ConceptGalaxy } from '@/components/galaxy/ConceptGalaxy'
import { GalaxyLegend } from '@/components/galaxy/GalaxyLegend'
import { SmartCTA } from '@/components/galaxy/SmartCTA'
import { DecontaminationBanner } from '@/components/galaxy/DecontaminationBanner'
import { useEffect, useState, useCallback } from 'react'
import { getStudyTopicsWithMastery, getQuarantinedTopicsCount, getTopicsGroupedByCourse, type CoursePlanet } from '@/app/actions/study-topics'
import { calculateSmartCTA, type SmartCTAResult } from '@/lib/smart-cta'
import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'
import { PhotoDropButton } from '@/components/homework/PhotoDropButton'
import { GalaxySkeleton } from '@/components/galaxy/GalaxySkeleton'
import { HelperChips } from '@/components/galaxy/HelperChips'

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
  const [totalTopicCount, setTotalTopicCount] = useState(0) // Includes quarantined — to detect if sync already ran
  const [streakDays, setStreakDays] = useState(0)
  const [coursePlanets, setCoursePlanets] = useState<CoursePlanet[]>([])
  const [isGalaxyDrillDown, setIsGalaxyDrillDown] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!activeProfileId || !user) {
        // Don't clear loading if we're just waiting for context to initialize
        if (!activeProfileId && !user) return
        setLoading(false)
        return
      }

      // Show skeleton while fetching (unless cache already has data for this profile)
      if (galaxyCache.profileId !== activeProfileId || galaxyCache.topics.length === 0) {
        setLoading(true)
      }

      try {
        const [topicsData, ctaData, quarantinedData, planetsData] = await Promise.all([
          getStudyTopicsWithMastery(activeProfileId),
          calculateSmartCTA(user.id, activeProfileId),
          getQuarantinedTopicsCount(activeProfileId),
          getTopicsGroupedByCourse(activeProfileId),
        ])
        console.log('[Galaxy] Loaded', topicsData.length, 'topics,', quarantinedData, 'quarantined,', planetsData.length, 'courses for profile', activeProfileId)
        setTopics(topicsData)
        setSmartCTA(ctaData)
        setQuarantinedCount(quarantinedData)
        setCoursePlanets(planetsData)
        // Total = visible + quarantined. If > 0, sync already ran — don't show "Syncing..."
        setTotalTopicCount(topicsData.length + quarantinedData)
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

  // Fetch streak data
  useEffect(() => {
    async function loadStreak() {
      if (!activeProfileId) return
      try {
        const res = await fetch(`/api/streak?profileId=${activeProfileId}`)
        if (res.ok) {
          const data = await res.json()
          setStreakDays(data.current_streak_days || 0)
        }
      } catch {
        // Non-critical
      }
    }
    loadStreak()
  }, [activeProfileId])

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

      // Mark as synced BEFORE firing to prevent duplicate triggers
      sessionStorage.setItem(syncKey, 'true')

      try {
        // Trigger sync in background — only update topics if sync returns NEW data
        fetch('/api/internal/sync/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ profileId: activeProfileId }),
        }).then(async () => {
          if (!activeProfileId) return
          const [topicsData, quarantinedData] = await Promise.all([
            getStudyTopicsWithMastery(activeProfileId),
            getQuarantinedTopicsCount(activeProfileId)
          ])
          // Only update state if we got data — never clobber existing topics with empty
          if (topicsData.length > 0 || quarantinedData > 0) {
            setTopics(topicsData)
            setQuarantinedCount(quarantinedData)
            setTotalTopicCount(topicsData.length + quarantinedData)
            galaxyCache.topics = topicsData
            galaxyCache.quarantinedCount = quarantinedData
          }
        }).catch((err) => {
          console.debug('[Galaxy] Auto-sync failed (non-critical):', err)
        })
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
      
      {/* Streak Badge - Top left on mobile, inside HUD on desktop */}
      {streakDays > 0 && (
        <div className="md:hidden absolute top-4 left-3 z-40">
          <div className="bg-slate-900/60 backdrop-blur-md border border-amber-500/30 rounded-xl px-3 py-1.5 shadow-lg">
            <span className="text-amber-400 text-sm font-bold">🔥 {streakDays} day streak</span>
          </div>
        </div>
      )}

      {/* Top Left HUD - Title & Legend (Hidden on mobile) */}
      <div className="hidden md:block absolute top-6 left-6 z-50 pointer-events-auto bg-slate-900/70 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl p-6 max-w-xs lg:max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">
            Your Learning Galaxy
          </h1>
          {streakDays > 0 && (
            <span className="ml-auto text-amber-400 text-sm font-bold whitespace-nowrap">🔥 {streakDays} day streak</span>
          )}
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
      
      {/* Helper Chips - contextual suggestions, hidden when drilling into a course */}
      {!loading && topics.length > 0 && !isGalaxyDrillDown && (
        <div className="absolute top-16 md:top-auto md:bottom-24 left-1/2 -translate-x-1/2 z-30">
          <HelperChips topics={topics} profileId={activeProfileId} />
        </div>
      )}

      {/* Top Right HUD - Upload + Photo Drop */}
      <div className="absolute top-4 md:top-6 right-2 md:right-6 z-40 flex items-center gap-1.5 md:gap-2">
        <PhotoDropButton />
        <Link
          href="/sources"
          className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-3 min-h-[44px] bg-slate-900/40 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl text-white text-xs md:text-base font-semibold hover:bg-slate-800/60 transition-all"
        >
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
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
          <GalaxySkeleton />
        ) : (
          <ConceptGalaxy
            topics={topics}
            coursePlanets={coursePlanets}
            profileId={activeProfileId || undefined}
            lmsStatus={lmsStatus}
            totalTopicCount={totalTopicCount}
            onDueSoonChange={setHasDueSoonItems}
            onDrillDownChange={setIsGalaxyDrillDown}
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

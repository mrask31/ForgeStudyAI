'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { ConceptGalaxy } from '@/components/galaxy/ConceptGalaxy'
import { GalaxyLegend } from '@/components/galaxy/GalaxyLegend'
import { useEffect, useState } from 'react'
import { getStudyTopicsWithMastery } from '@/app/actions/study-topics'

export default function MiddleDashboardPage() {
  const { activeProfileId } = useActiveProfile()
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTopics() {
      if (!activeProfileId) {
        setLoading(false)
        return
      }
      
      try {
        const data = await getStudyTopicsWithMastery(activeProfileId)
        setTopics(data)
      } catch (error) {
        console.error('[Study Hub] Error loading topics:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadTopics()
  }, [activeProfileId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
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
                  href="/tutor"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow-lg hover:from-teal-700 hover:to-cyan-700 transition-all"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Studying
                </Link>
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
              <ConceptGalaxy topics={topics} />
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

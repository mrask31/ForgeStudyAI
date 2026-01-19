'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useActiveProfileSummary } from '@/hooks/useActiveProfileSummary'
import type { StudyTopic } from '@/lib/types'

export default function StudyTopicsPage() {
  const { summary: activeProfile } = useActiveProfileSummary()
  const [topics, setTopics] = useState<StudyTopic[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [guideMarkdown, setGuideMarkdown] = useState<string | null>(null)
  const [guideTitle, setGuideTitle] = useState<string | null>(null)
  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null)

  const canUseTopics = useMemo(() => {
    if (!activeProfile) return false
    return activeProfile.gradeBand === 'middle' || activeProfile.gradeBand === 'high'
  }, [activeProfile])

  useEffect(() => {
    if (!activeProfile?.id || !canUseTopics) {
      setTopics([])
      return
    }
    let isMounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/study-topics?profileId=${activeProfile.id}`, {
          credentials: 'include',
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load study topics')
        }
        if (isMounted) {
          setTopics(payload.topics || [])
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load study topics')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [activeProfile?.id, canUseTopics])

  const handleCreateTopic = async () => {
    if (!activeProfile?.id || !newTitle.trim()) return
    setIsCreating(true)
    setError(null)
    try {
      const response = await fetch('/api/study-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ profileId: activeProfile.id, title: newTitle.trim() }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to create topic')
      }
      setTopics((prev) => [payload.topic, ...prev])
      setNewTitle('')
    } catch (err: any) {
      setError(err?.message || 'Failed to create topic')
    } finally {
      setIsCreating(false)
    }
  }

  const handleGenerateGuide = async (topic: StudyTopic) => {
    setGeneratingTopicId(topic.id)
    setError(null)
    try {
      const response = await fetch(`/api/study-topics/${topic.id}/generate`, {
        method: 'POST',
        credentials: 'include',
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to generate study guide')
      }
      setGuideMarkdown(payload?.guide?.markdown || '')
      setGuideTitle(payload?.guide?.title || topic.title)
      setIsGuideOpen(true)
    } catch (err: any) {
      setError(err?.message || 'Failed to generate study guide')
    } finally {
      setGeneratingTopicId(null)
    }
  }

  if (!activeProfile) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600">Select a student profile to view study topics.</p>
        </div>
      </div>
    )
  }

  if (!canUseTopics) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Study Topics</h1>
          <p className="text-slate-600">
            Study Topics are available for grades 6–12. Switch to a middle or high school profile to use this feature.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Study Topics</h1>
            <p className="text-slate-600 mt-2">
              Save tutor outputs, maps, and practice items into focused topics.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New topic title"
              className="w-full sm:w-64 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Button onClick={handleCreateTopic} disabled={isCreating || !newTitle.trim()}>
              {isCreating ? 'Creating...' : 'Create topic'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <p className="text-slate-600">Loading topics...</p>
        ) : topics.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 text-center">
            <p className="text-slate-600">No study topics yet. Create your first topic to start collecting items.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <div key={topic.id} className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{topic.title}</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {topic.itemsCount ?? 0} saved items
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-4 w-full"
                  onClick={() => handleGenerateGuide(topic)}
                  disabled={generatingTopicId === topic.id}
                >
                  {generatingTopicId === topic.id ? 'Generating...' : 'Generate study guide'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isGuideOpen} onOpenChange={(open) => !open && setIsGuideOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{guideTitle || 'Study Guide'}</DialogTitle>
          </DialogHeader>
          {guideMarkdown ? (
            <div className="prose prose-slate max-w-none text-sm text-slate-700">
              <ReactMarkdown>{guideMarkdown}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-slate-600">No guide available yet.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

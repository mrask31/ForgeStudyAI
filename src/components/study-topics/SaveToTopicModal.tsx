'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { StudyTopic } from '@/lib/types'

type ItemType = 'chat' | 'map' | 'exam' | 'practice' | 'custom'

interface SaveToTopicModalProps {
  isOpen: boolean
  onClose: () => void
  profileId: string
  itemType: ItemType
  itemRef?: string | null
  sourceText: string
  onSaved?: (topicId: string) => void
}

export default function SaveToTopicModal({
  isOpen,
  onClose,
  profileId,
  itemType,
  itemRef,
  sourceText,
  onSaved,
}: SaveToTopicModalProps) {
  const [topics, setTopics] = useState<StudyTopic[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  const [newTitle, setNewTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let isMounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/study-topics?profileId=${profileId}`, {
          credentials: 'include',
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load study topics')
        }
        if (isMounted) {
          setTopics(payload.topics || [])
          if (payload.topics?.length) {
            setSelectedTopicId(payload.topics[0].id)
          }
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
  }, [isOpen, profileId])

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    setError(null)

    try {
      let topicId = selectedTopicId
      if (!topicId) {
        if (!newTitle.trim()) {
          throw new Error('Select a topic or create a new one.')
        }
        const createResponse = await fetch('/api/study-topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ profileId, title: newTitle.trim() }),
        })
        const createPayload = await createResponse.json()
        if (!createResponse.ok) {
          throw new Error(createPayload?.error || 'Failed to create topic')
        }
        topicId = createPayload.topic?.id
      }

      if (!topicId) {
        throw new Error('Failed to resolve a study topic.')
      }

      const itemResponse = await fetch(`/api/study-topics/${topicId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          itemType,
          itemRef: itemRef || null,
          sourceText,
        }),
      })
      const itemPayload = await itemResponse.json()
      if (!itemResponse.ok) {
        throw new Error(itemPayload?.error || 'Failed to save to topic')
      }

      onSaved?.(topicId)
      setNewTitle('')
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save to topic')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save to study topic</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Choose a topic
            </label>
            <div className="mt-2 space-y-2">
              {isLoading && <p className="text-sm text-slate-600">Loading topics...</p>}
              {!isLoading && topics.length === 0 && (
                <p className="text-sm text-slate-600">No topics yet. Create your first one.</p>
              )}
              {!isLoading && topics.length > 0 && (
                <div className="space-y-2">
                  {topics.map((topic) => (
                    <label
                      key={topic.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      <input
                        type="radio"
                        name="study-topic"
                        value={topic.id}
                        checked={selectedTopicId === topic.id}
                        onChange={() => setSelectedTopicId(topic.id)}
                      />
                      <span>{topic.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Or create new topic
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value)
                if (e.target.value.trim()) {
                  setSelectedTopicId('')
                }
              }}
              placeholder="e.g. Fractions review"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? 'Saving...' : 'Save to topic'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

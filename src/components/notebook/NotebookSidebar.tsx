'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { NotebookTopic } from '@/lib/types'
import { listNotebookTopics, createNotebookTopic } from '@/lib/api/notebook'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, BookOpen, X } from 'lucide-react'

interface NotebookSidebarProps {
  userId: string
  classId: string
  onTopicSelect: (topic: NotebookTopic) => void
  selectedTopicId?: string
}

export default function NotebookSidebar({
  userId,
  classId,
  onTopicSelect,
  selectedTopicId,
}: NotebookSidebarProps) {
  const [topics, setTopics] = useState<NotebookTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    nclexCategory: '',
  })

  useEffect(() => {
    loadTopics()
  }, [userId, classId])

  const loadTopics = async () => {
    setLoading(true)
    const topicList = await listNotebookTopics(userId, classId)
    setTopics(topicList)
    setLoading(false)
  }

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    const newTopic = await createNotebookTopic(userId, {
      classId,
      title: formData.title,
      description: formData.description || undefined,
      nclexCategory: formData.nclexCategory || undefined,
    })

    if (newTopic) {
      setFormData({ title: '', description: '', nclexCategory: '' })
      setShowAddForm(false)
      loadTopics()
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-[var(--tutor-text-muted)]">
        Loading topics...
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-[var(--tutor-border-subtle)]">
      <div className="p-4 border-b border-[var(--tutor-border-subtle)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--tutor-text-main)]">
            Topics
          </h2>
          {!showAddForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </div>

        {showAddForm && (
          <form onSubmit={handleAddTopic} className="space-y-3 mb-4">
            <Input
              placeholder="Topic title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <Textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
            <Input
              placeholder="NCLEX category (optional)"
              value={formData.nclexCategory}
              onChange={(e) => setFormData({ ...formData, nclexCategory: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="flex-1">
                Add
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false)
                  setFormData({ title: '', description: '', nclexCategory: '' })
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {topics.length === 0 ? (
          <div className="text-center py-8 text-[var(--tutor-text-muted)]">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No topics yet.</p>
            <p className="text-xs mt-1">
              Add something like "Heart Failure" or "Insulin Safety"
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => onTopicSelect(topic)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedTopicId === topic.id
                    ? 'bg-[var(--tutor-primary)]/10 border border-[var(--tutor-primary)]/20'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="font-medium text-sm text-[var(--tutor-text-main)] mb-1">
                  {topic.title}
                </div>
                {topic.nclexCategory && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {topic.nclexCategory}
                  </Badge>
                )}
                {topic.confidence !== undefined && (
                  <div className="text-xs text-[var(--tutor-text-muted)] mt-1">
                    Confidence: {topic.confidence}%
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


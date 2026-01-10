'use client'

import { useState, useEffect } from 'react'
import { NotebookTopic } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Calendar, FileText, GraduationCap, Paperclip, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { linkFilesToTopic } from '@/lib/api/notebook'
import { createBrowserClient } from '@supabase/ssr'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface NotebookTopicViewProps {
  topic: NotebookTopic | null
  classCode?: string
  className?: string
  classId?: string
  userId?: string
  onTopicUpdated?: (topic: NotebookTopic) => void
}

export default function NotebookTopicView({
  topic,
  classCode,
  className,
  classId,
  userId,
  onTopicUpdated,
}: NotebookTopicViewProps) {
  const router = useRouter()
  const [allBinderFiles, setAllBinderFiles] = useState<Array<{ id: string; filename: string }>>([])
  const [isAttachDialogOpen, setIsAttachDialogOpen] = useState(false)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<Array<{ id: string; name: string }>>([])

  // Load binder files
  useEffect(() => {
    const loadBinderFiles = async () => {
      try {
        const response = await fetch('/api/binder', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          setAllBinderFiles(data.files || [])
        }
      } catch (error) {
        console.error('[NotebookTopicView] Error loading binder files:', error)
      }
    }
    loadBinderFiles()
  }, [])

  // Update attached files when topic changes
  useEffect(() => {
    if (topic?.fileIds && allBinderFiles.length > 0) {
      const attached = allBinderFiles
        .filter((file) => topic.fileIds?.includes(file.id))
        .map((file) => ({ id: file.id, name: file.filename }))
      setAttachedFiles(attached)
    } else {
      setAttachedFiles([])
    }
  }, [topic?.fileIds, allBinderFiles])

  const handleOpenAttachDialog = () => {
    // Pre-select already attached files
    setSelectedFileIds(topic?.fileIds || [])
    setIsAttachDialogOpen(true)
  }

  const handleSaveAttachments = async () => {
    if (!userId || !topic) return
    
    setIsLoading(true)
    try {
      const updatedTopic = await linkFilesToTopic(userId, topic.id, selectedFileIds)
      if (updatedTopic && onTopicUpdated) {
        onTopicUpdated(updatedTopic)
      }
      setIsAttachDialogOpen(false)
    } catch (error) {
      console.error('[NotebookTopicView] Error saving attachments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveFile = async (fileId: string) => {
    if (!userId || !topic) return
    
    const newFileIds = (topic.fileIds || []).filter((id) => id !== fileId)
    setIsLoading(true)
    try {
      const { updateNotebookTopic } = await import('@/lib/api/notebook')
      const updatedTopic = await updateNotebookTopic(userId, topic.id, { fileIds: newFileIds })
      if (updatedTopic && onTopicUpdated) {
        onTopicUpdated(updatedTopic)
      }
    } catch (error) {
      console.error('[NotebookTopicView] Error removing file:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!topic) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--tutor-bg)]">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-[var(--tutor-text-muted)] opacity-50" />
          <p className="text-[var(--tutor-text-muted)]">
            Select a topic from the sidebar to view details
          </p>
        </div>
      </div>
    )
  }

  const handleStudyWithTutor = () => {
    const params = new URLSearchParams()
    params.set('mode', 'tutor')
    // Use classId from props (page route) or fallback to topic.classId
    const effectiveClassId = classId || topic.classId
    if (effectiveClassId) {
      params.set('classId', effectiveClassId)
    }
    params.set('topicId', topic.id)
    // Explicitly do NOT include sessionId - this should start a fresh session
    router.push(`/tutor?${params.toString()}`)
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--tutor-bg)] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border border-[var(--tutor-border-subtle)] rounded-2xl shadow-sm p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--tutor-text-main)] mb-2">
              {topic.title}
            </h1>
            {topic.nclexCategory && (
              <Badge variant="outline" className="mb-2">
                {topic.nclexCategory}
              </Badge>
            )}
          </div>

          {/* Description */}
          {topic.description && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--tutor-text-main)] mb-2">
                Description
              </h2>
              <p className="text-[var(--tutor-text-muted)]">
                {topic.description}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {topic.lastStudiedAt && (
              <div className="flex items-center gap-2 text-sm text-[var(--tutor-text-muted)]">
                <Calendar className="w-4 h-4" />
                <span>
                  Last studied: {new Date(topic.lastStudiedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {topic.confidence !== undefined && (
              <div className="flex items-center gap-2 text-sm text-[var(--tutor-text-muted)]">
                <GraduationCap className="w-4 h-4" />
                <span>Confidence: {topic.confidence}%</span>
              </div>
            )}
          </div>

          {/* Attached Materials */}
          <section className="mt-6 mb-6">
            <h3 className="text-sm font-medium text-[var(--tutor-text-main)] mb-1">
              Attached materials
            </h3>
            <p className="text-xs text-[var(--tutor-text-muted)] mb-3">
              Attach files so the Tutor can reference your course readings when helping you study.
            </p>

            {/* Pills for existing attachments */}
            <div className="flex flex-wrap gap-2 mb-3">
              {attachedFiles.map((file) => (
                <span
                  key={file.id}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                >
                  {file.name}
                  {userId && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.id)}
                      className="ml-1 hover:text-red-600 transition-colors"
                      disabled={isLoading}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {attachedFiles.length === 0 && (
                <span className="text-xs text-[var(--tutor-text-muted)]">No files attached yet.</span>
              )}
            </div>

            {userId && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={handleOpenAttachDialog}
                disabled={isLoading}
              >
                <Paperclip className="w-3 h-3" />
                + Attach from My Classes
              </button>
            )}
          </section>

          {/* Study Button */}
          <div className="pt-6 border-t border-[var(--tutor-border-subtle)]">
            <Button
              onClick={handleStudyWithTutor}
              className="w-full"
              size="lg"
            >
              <GraduationCap className="w-5 h-5 mr-2" />
              Study this topic with the Tutor
            </Button>
            <p className="text-xs text-[var(--tutor-text-muted)] mt-2 text-center">
              Opens the Tutor with context from your course.
            </p>
          </div>
        </div>
      </div>

      {/* Attach Files Dialog */}
      <Dialog open={isAttachDialogOpen} onOpenChange={setIsAttachDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Attach files from My Classes</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2 py-4">
            {allBinderFiles.length === 0 ? (
              <p className="text-sm text-[var(--tutor-text-muted)] text-center py-4">
                No files uploaded yet. Go to My Classes to upload materials.
              </p>
            ) : (
              allBinderFiles.map((file) => (
                <label
                  key={file.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFileIds.includes(file.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFileIds([...selectedFileIds, file.id])
                      } else {
                        setSelectedFileIds(selectedFileIds.filter((id) => id !== file.id))
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-[var(--tutor-text-main)] flex-1">
                    {file.filename}
                  </span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAttachDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAttachments} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


'use client'

import { useState } from 'react'
import { X, Save, Folder, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDensity } from '@/contexts/DensityContext'
import { getDensityTokens } from '@/lib/density-tokens'

interface SaveClipModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { title: string; folder: string; tags: string[] }) => Promise<void>
  defaultTitle?: string
}

export default function SaveClipModal({ isOpen, onClose, onSave, defaultTitle = '' }: SaveClipModalProps) {
  const { density } = useDensity()
  const tokens = getDensityTokens(density)
  const [title, setTitle] = useState(defaultTitle)
  const [folder, setFolder] = useState('General')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setIsSaving(true)
    try {
      await onSave({ title: title.trim(), folder, tags })
      // Reset form
      setTitle('')
      setFolder('General')
      setTags([])
      setTagInput('')
      onClose()
    } catch (error) {
      console.error('Failed to save clip:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Get common folders - include class name if available
  const commonFolders = ['General', 'Cardiovascular', 'Respiratory', 'Pharmacology', 'NCLEX Review', 'Clinical Skills']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className={`bg-white rounded-lg shadow-xl ${density === 'comfort' ? 'w-full max-w-md' : 'w-full max-w-sm'} mx-4`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200">
          <h2 className={`${tokens.heading} font-semibold text-clinical-text-primary`}>
            Save Learning Moment
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-4">
          {/* Title */}
          <div>
            <label className={`${tokens.smallText} font-medium text-clinical-text-primary block mb-2`}>
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Heart Failure Pathophysiology"
              className={`w-full ${tokens.bodyText} px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clinical-primary focus:border-transparent`}
              autoFocus
            />
          </div>

          {/* Folder */}
          <div>
            <label className={`${tokens.smallText} font-medium text-clinical-text-primary block mb-2 flex items-center gap-2`}>
              <Folder className="w-4 h-4" />
              Folder
            </label>
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className={`w-full ${tokens.bodyText} px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clinical-primary focus:border-transparent`}
            >
              {commonFolders.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className={`${tokens.smallText} font-medium text-clinical-text-primary block mb-2 flex items-center gap-2`}>
              <Tag className="w-4 h-4" />
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag and press Enter"
                className={`flex-1 ${tokens.bodyText} px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clinical-primary focus:border-transparent`}
              />
              <Button
                onClick={handleAddTag}
                variant="outline"
                size="sm"
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 md:p-6 border-t border-slate-200">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
            className="bg-clinical-primary text-white hover:bg-clinical-secondary"
          >
            {isSaving ? 'Saving...' : 'Save Clip'}
            <Save className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}


'use client'

import * as Popover from '@radix-ui/react-popover'
import { Info, Bookmark, BookmarkCheck } from 'lucide-react'
import { useState, useEffect } from 'react'

interface MedicalTermPopoverProps {
  term: string
  definition: string
  category?: string
  children: React.ReactNode
}

export default function MedicalTermPopover({ term, definition, category, children }: MedicalTermPopoverProps) {
  const [open, setOpen] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Check if word is already saved
  useEffect(() => {
    if (open) {
      fetch('/api/wordbank')
        .then(res => res.json())
        .then(data => {
          if (data.words) {
            const saved = data.words.some((w: any) => w.term.toLowerCase() === term.toLowerCase())
            setIsSaved(saved)
          }
        })
        .catch(() => {}) // Silently fail if not authenticated
    }
  }, [open, term])

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSaving || isSaved) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/wordbank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, definition, category }),
      })

      if (response.ok) {
        setIsSaved(true)
      } else if (response.status === 409) {
        // Already saved
        setIsSaved(true)
      }
    } catch (error) {
      console.error('Failed to save word:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-baseline gap-0.5 text-emerald-600 hover:text-emerald-700 hover:underline cursor-help focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 rounded px-0.5 -mx-0.5 transition-colors"
          aria-label={`Vocabulary term: ${term}`}
        >
          {children}
          <Info className="inline-block w-3 h-3 mb-0.5 opacity-60" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          sideOffset={8}
          align="start"
        >
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-slate-900 text-sm mb-1">{term}</h4>
              <p className="text-sm text-slate-700 leading-relaxed">{definition}</p>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isSaved}
                className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors ${
                  isSaved
                    ? 'text-emerald-600 bg-emerald-50 cursor-default'
                    : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                } disabled:opacity-50`}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save to word bank'}</span>
                  </>
                )}
              </button>
              <Popover.Close asChild>
                <button
                  type="button"
                  className="text-xs text-slate-600 hover:text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 rounded px-2 py-1"
                >
                  Close
                </button>
              </Popover.Close>
            </div>
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}


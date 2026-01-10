'use client'

import { useState, useEffect, useCallback } from 'react'
import { Paperclip, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useDensity } from '@/contexts/DensityContext'
import { getDensityTokens } from '@/lib/density-tokens'
import { cn } from '@/lib/utils'

type BinderFile = {
  canonicalId: string
  filename?: string
  name?: string
  title?: string
  document_type?: string | null
  [key: string]: any
}

export type AttachedFile = {
  id: string
  name: string
  document_type: string | null // CRITICAL: Must be preserved for context-aware prompts
}

interface AttachedSourcesBarProps {
  attachedFiles: AttachedFile[]
  onAttachedFilesChange: (files: AttachedFile[]) => void
  chatId?: string
}

export default function AttachedSourcesBar({ 
  attachedFiles, 
  onAttachedFilesChange,
  chatId 
}: AttachedSourcesBarProps) {
  const { density } = useDensity()
  const tokens = getDensityTokens(density)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [binderFiles, setBinderFiles] = useState<BinderFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set(attachedFiles.map(f => f.id)))

  // Sync selectedFileIds with attachedFiles prop
  useEffect(() => {
    setSelectedFileIds(new Set(attachedFiles.map(f => f.id)))
  }, [attachedFiles])

  // Fetch files from Binder API
  const fetchBinderFiles = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch all files (no type filter) and filter client-side to exclude notes
      const res = await fetch('/api/binder', { credentials: 'include' })
      
      if (!res.ok) {
        console.error('[AttachedSourcesBar] Failed to fetch files:', res.status)
        setBinderFiles([])
        return
      }

      const data = await res.json()
      const allFiles = data.files || []
      
      // Filter to only include attachable files (syllabi, textbooks, references - NOT notes)
      const attachableFiles = allFiles.filter((file: any) =>
        file.document_type === 'syllabus' ||
        file.document_type === 'textbook' ||
        file.document_type === 'reference' ||
        file.document_type == null // Legacy files treated as textbooks
      )

      // Ensure canonicalId exists and preserve document_type
      // CRITICAL: Explicitly preserve document_type - don't use || null which would convert empty string to null
      const filesWithCanonicalId = attachableFiles.map((file: any) => {
        const fileObj: BinderFile = {
          ...file,
          canonicalId: file.canonicalId || file.id || String(file.id || ''),
          document_type: file.document_type !== undefined ? file.document_type : null // Preserve even if null
        }
        
        // Log if document_type is missing (shouldn't happen if API is correct)
        if (fileObj.document_type === undefined) {
          console.warn('[AttachedSourcesBar] File missing document_type:', {
            id: fileObj.canonicalId,
            filename: fileObj.filename
          })
        }
        
        return fileObj
      }).filter((file: BinderFile) => file.canonicalId && file.canonicalId.trim() !== '')

      console.log('[AttachedSourcesBar] Loaded binder files:', {
        count: filesWithCanonicalId.length,
        sample: filesWithCanonicalId[0] ? {
          filename: filesWithCanonicalId[0].filename,
          document_type: filesWithCanonicalId[0].document_type
        } : null
      })

      setBinderFiles(filesWithCanonicalId)
    } catch (error) {
      console.error('[AttachedSourcesBar] Failed to fetch binder files:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load files when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      fetchBinderFiles()
    }
  }, [isDialogOpen, fetchBinderFiles])

  const handleToggleFile = (fileId: string) => {
    const newSelected = new Set(selectedFileIds)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      newSelected.add(fileId)
    }
    setSelectedFileIds(newSelected)
  }

  const handleApply = async () => {
    // Convert selected IDs to full file objects with document_type
    // CRITICAL: Map selected IDs back to the full file objects found in binderFiles state
    const newAttachedFiles: AttachedFile[] = Array.from(selectedFileIds)
      .map(id => {
        // Find the full file object from binderFiles (which has document_type)
        const binderFile = binderFiles.find(f => f.canonicalId === id)
        if (binderFile) {
          // Explicitly extract document_type - don't use || null which would lose empty strings
          const documentType = binderFile.document_type !== undefined 
            ? binderFile.document_type 
            : null
          
          const fileObj: AttachedFile = {
            id: binderFile.canonicalId,
            name: binderFile.filename || binderFile.name || binderFile.title || 'Unknown file',
            document_type: documentType // CRITICAL: Preserve document_type exactly as it is
          }
          
          console.log('[AttachedSourcesBar] Attaching file:', {
            id: fileObj.id,
            name: fileObj.name,
            document_type: fileObj.document_type,
            source: 'binderFiles',
            binderFile_document_type: binderFile.document_type
          })
          
          return fileObj
        }
        
        // Fallback: try to find in existing attachedFiles (preserve if already attached)
        const existing = attachedFiles.find(f => f.id === id)
        if (existing) {
          console.log('[AttachedSourcesBar] Using existing file:', {
            id: existing.id,
            name: existing.name,
            document_type: existing.document_type,
            source: 'existing'
          })
          return existing
        }
        
        // Last resort: create placeholder (shouldn't happen)
        console.warn('[AttachedSourcesBar] File not found in binderFiles or attachedFiles:', id)
        return { id, name: 'Unknown file', document_type: null }
      })
      .filter(f => f.id) // Remove any invalid entries
    
    console.log('[AttachedSourcesBar] Applying attached files:', {
      count: newAttachedFiles.length,
      files: newAttachedFiles.map(f => ({ id: f.id, name: f.name, document_type: f.document_type }))
    })
    
    onAttachedFilesChange(newAttachedFiles)
    
    // Save attachedFiles (full objects with document_type) to chat metadata if chatId exists
    if (chatId) {
      try {
        const response = await fetch('/api/chats/metadata', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            chatId,
            metadata: { 
              attachedFileIds: newAttachedFiles.map(f => f.id), // Keep for backward compatibility
              attachedFiles: newAttachedFiles // CRITICAL: Store full objects with document_type
            }
          }),
        })
        
        if (!response.ok) {
          console.error('[AttachedSourcesBar] Failed to save attached files:', await response.text())
        } else {
          console.log('[AttachedSourcesBar] Saved attached files to chat metadata:', newAttachedFiles.map(f => f.id))
        }
      } catch (error) {
        console.error('[AttachedSourcesBar] Failed to save attached files:', error)
      }
    }
    
    setIsDialogOpen(false)
  }

  const handleRemoveFile = async (fileId: string) => {
    const newAttachedFiles = attachedFiles.filter(f => f.id !== fileId)
    setSelectedFileIds(new Set(newAttachedFiles.map(f => f.id)))
    onAttachedFilesChange(newAttachedFiles)
    
    // Save updated list to chat metadata
    if (chatId) {
      try {
        await fetch('/api/chats/metadata', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            chatId,
            metadata: { attachedFileIds: newAttachedFiles.map(f => f.id) }
          }),
        })
      } catch (error) {
        console.error('[AttachedSourcesBar] Failed to update attached files:', error)
      }
    }
  }

  // Get display names for attached files (already have full objects)
  const attachedFileNames = attachedFiles.map(f => f.name)

  return (
    <div className="flex items-center">
      <div className="flex items-center gap-3 flex-wrap">
        {attachedFiles.length > 0 ? (
          <>
            <span className={`${tokens.smallText} text-clinical-text-secondary font-medium`}>
              Using:
            </span>
            {attachedFiles.map((file) => {
              return (
                <div
                  key={file.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs"
                >
                  <FileText className="w-3 h-3 text-clinical-text-secondary" />
                  <span className={`${tokens.smallText} text-clinical-text-primary`}>
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.id)}
                    className="ml-1 hover:bg-slate-100 rounded p-0.5 transition-colors"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="w-3 h-3 text-slate-500" />
                  </button>
                </div>
              )
            })}
            <Dialog 
              open={isDialogOpen} 
              onOpenChange={(open) => {
                // Only close the dialog - DO NOT reset state
                setIsDialogOpen(open)
                // If closing and user hasn't applied, keep current selection
                if (!open) {
                  // Reset selectedFileIds to match current attachedFiles (don't lose user's work)
                  setSelectedFileIds(new Set(attachedFiles.map(f => f.id)))
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-slate-300"
                >
                  <Paperclip className="w-3 h-3 mr-1.5" />
                  Change
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Attach Files from My Classes</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 mt-4">
                  {isLoading ? (
                    <p className={`${tokens.bodyText} text-clinical-text-secondary`}>Loading files...</p>
                  ) : binderFiles.length === 0 ? (
                    <p className={`${tokens.bodyText} text-clinical-text-secondary`}>
                      No files available. Upload files in My Classes first.
                    </p>
                  ) : (
                    binderFiles.map((file) => {
                      const isSelected = selectedFileIds.has(file.canonicalId)
                      const displayName = file.filename || file.name || file.title || 'Untitled'
                      const docType = file.document_type || null
                      
                      // Log document_type for debugging
                      if (!file.document_type && file.document_type !== null) {
                        console.warn('[AttachedSourcesBar] File missing document_type:', {
                          id: file.canonicalId,
                          filename: displayName
                        })
                      }
                      
                      return (
                        <button
                          key={file.canonicalId}
                          type="button"
                          onClick={() => handleToggleFile(file.canonicalId)}
                          className={cn(
                            'w-full rounded-lg border px-4 py-3 text-left flex items-center gap-3 transition-all',
                            isSelected
                              ? 'border-clinical-primary bg-blue-50/30'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleFile(file.canonicalId)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`${tokens.bodyText} font-medium text-clinical-text-primary truncate`}>
                              {displayName}
                            </p>
                            {docType && (
                              <p className={`${tokens.smallText} text-clinical-text-secondary`}>
                                Type: {docType}
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApply}
                    className="bg-clinical-primary text-white hover:bg-clinical-secondary"
                  >
                    Apply
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <Dialog 
            open={isDialogOpen} 
            onOpenChange={(open) => {
              // Only close the dialog - DO NOT reset state
              setIsDialogOpen(open)
              // If closing and user hasn't applied, keep current selection
              if (!open) {
                // Reset selectedFileIds to match current attachedFiles (don't lose user's work)
                setSelectedFileIds(new Set(attachedFiles.map(f => f.id)))
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-slate-300"
              >
                <Paperclip className="w-3 h-3 mr-1.5" />
                Attach from My Classes
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Attach Files from My Classes</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 mt-4">
                {isLoading ? (
                  <p className={`${tokens.bodyText} text-clinical-text-secondary`}>Loading files...</p>
                ) : binderFiles.length === 0 ? (
                  <p className={`${tokens.bodyText} text-clinical-text-secondary`}>
                    No files available. Upload files in your Clinical Binder first.
                  </p>
                ) : (
                  binderFiles.map((file) => {
                    const isSelected = selectedFileIds.has(file.canonicalId)
                    const displayName = file.filename || file.name || file.title || 'Untitled'
                    const docType = file.document_type || null
                    
                    return (
                      <button
                        key={file.canonicalId}
                        type="button"
                        onClick={() => handleToggleFile(file.canonicalId)}
                        className={cn(
                          'w-full rounded-lg border px-4 py-3 text-left flex items-center gap-3 transition-all',
                          isSelected
                            ? 'border-clinical-primary bg-blue-50/30'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleFile(file.canonicalId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`${tokens.bodyText} font-medium text-clinical-text-primary truncate`}>
                            {displayName}
                          </p>
                          {docType && (
                            <p className={`${tokens.smallText} text-clinical-text-secondary`}>
                              Type: {docType}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApply}
                  className="bg-clinical-primary text-white hover:bg-clinical-secondary"
                  disabled={selectedFileIds.size === 0}
                >
                  Attach {selectedFileIds.size > 0 ? `(${selectedFileIds.size})` : ''}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}


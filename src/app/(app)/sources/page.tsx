'use client'

import { useState, useEffect } from 'react'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { createBrowserClient } from '@supabase/ssr'
import {
  addLearningSourceItem,
  createLearningSource,
  listLearningSourceItems,
  type LearningSourceType,
} from '@/app/actions/learning-sources'
import { DualIntakeAirlock } from '@/components/lms/DualIntakeAirlock'

const BUCKET_ID = 'learning-sources'
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024 // 50MB
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/png',
  'image/jpeg',
  'image/webp',
])

const sanitizeFileName = (name: string) => {
  const parts = name.split('.')
  const ext = parts.length > 1 ? `.${parts.pop()}` : ''
  const base = parts.join('.')
  const safeBase = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${safeBase || 'upload'}${ext}`
}

export default function AirlockPage() {
  const { activeProfileId } = useActiveProfile()
  const [isUploading, setIsUploading] = useState(false)
  const [recentUploads, setRecentUploads] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRecentUploads()
    triggerSyncOnLogin()
  }, [activeProfileId])

  // Silent sync trigger on page load (student login)
  const triggerSyncOnLogin = async () => {
    if (!activeProfileId) return

    try {
      // Fire and forget - don't wait for response
      fetch('/api/internal/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: activeProfileId, trigger: 'login' }),
      }).catch((err) => {
        // Silent failure - sync is best-effort
        console.debug('[Airlock] Sync trigger failed (non-critical):', err)
      })
    } catch (err) {
      // Silent failure
      console.debug('[Airlock] Sync trigger error (non-critical):', err)
    }
  }

  const loadRecentUploads = async () => {
    try {
      const items = await listLearningSourceItems(activeProfileId || null)
      setRecentUploads(items.slice(0, 10)) // Show last 10 uploads
    } catch (err) {
      console.error('[Airlock] Failed to load uploads:', err)
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setError(null)

    try {
      // Validation
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error('File is too large. Please keep uploads under 50MB.')
      }
      if (!ALLOWED_FILE_TYPES.has(file.type)) {
        throw new Error('Unsupported file type. Please upload PDF, DOCX, TXT, or image files.')
      }

      // Upload to Supabase Storage
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be signed in to upload files.')
      }

      const safeName = sanitizeFileName(file.name)
      const path = `${user.id}/${activeProfileId || 'general'}/${Date.now()}-${safeName}`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_ID)
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadError) {
        console.error('[Airlock] Upload failed:', uploadError)
        throw new Error('Upload failed. Please try again.')
      }

      // Create learning source
      const source = await createLearningSource({
        profileId: activeProfileId || null,
        sourceType: 'syllabus' as LearningSourceType,
        title: file.name,
        description: `Uploaded via Airlock on ${new Date().toLocaleDateString()}`,
      })

      // Add source item and get the upload ID
      const sourceItem = await addLearningSourceItem({
        sourceId: source.id,
        itemType: file.type.startsWith('image/') ? 'photo' : 'file',
        fileUrl: `${BUCKET_ID}/${path}`,
        fileMetadata: {
          name: file.name,
          type: file.type,
          size: file.size,
        },
        metadata: {
          label: 'Airlock upload',
          bucket: BUCKET_ID,
          path: path,
        },
      })

      // If it's an image, trigger AI vision processing
      if (file.type.startsWith('image/')) {
        try {
          console.log('[Airlock] 👁️ AI is reading your document...')
          
          const visionResponse = await fetch('/api/ai/vision/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              upload_id: sourceItem.id,
              student_id: user.id,
            }),
          })

          if (!visionResponse.ok) {
            console.warn('[Airlock] Vision processing failed, but upload succeeded')
          } else {
            const visionResult = await visionResponse.json()
            if (visionResult.success) {
              console.log('[Airlock] ✅ AI extracted content successfully')
            }
          }
        } catch (visionError) {
          // Non-critical: Vision processing failed but upload succeeded
          console.warn('[Airlock] Vision processing error (non-critical):', visionError)
        }
      }

      // Reload recent uploads
      await loadRecentUploads()
    } catch (err: any) {
      console.error('[Airlock] Upload error:', err)
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            The Airlock
          </h1>
          <p className="text-slate-400">
            Drop your chaotic notes, PDFs, and slides here. We will decontaminate them into structured Master Concepts.
          </p>
        </div>

        {/* Dual-Intake Airlock Component */}
        <DualIntakeAirlock
          studentId={activeProfileId || ''}
          onFileUpload={handleFileUpload}
          recentUploads={recentUploads.map((item) => ({
            id: item.id,
            filename: item.original_filename || item.metadata?.label || 'Untitled',
            uploadedAt: item.created_at,
            isMerged: false, // TODO: Add merge detection when deduplication is implemented
            syncedAssignmentTitle: undefined,
          }))}
          isUploading={isUploading}
        />

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

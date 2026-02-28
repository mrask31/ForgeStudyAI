'use client'

import { useState, useEffect } from 'react'
import { UploadCloud, FileText, CheckCircle2, Loader2 } from 'lucide-react'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { createBrowserClient } from '@supabase/ssr'
import {
  addLearningSourceItem,
  createLearningSource,
  listLearningSourceItems,
  type LearningSourceType,
} from '@/app/actions/learning-sources'

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

const formatDate = (value: string) => {
  const date = new Date(value)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AirlockPage() {
  const { activeProfileId } = useActiveProfile()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [recentUploads, setRecentUploads] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRecentUploads()
  }, [activeProfileId])

  const loadRecentUploads = async () => {
    try {
      const items = await listLearningSourceItems(activeProfileId || null)
      setRecentUploads(items.slice(0, 10)) // Show last 10 uploads
    } catch (err) {
      console.error('[Airlock] Failed to load uploads:', err)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleFileUpload(files[0])
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await handleFileUpload(files[0])
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

      // Add source item
      await addLearningSourceItem({
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

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group w-full h-72 mt-8 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.15)]'
              : 'border-slate-700 bg-slate-900/40 backdrop-blur-md hover:border-indigo-500 hover:bg-indigo-500/10 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]'
          }`}
        >
          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
            {isUploading ? (
              <>
                <Loader2 className="w-16 h-16 text-indigo-400 mb-6 animate-spin" />
                <p className="text-slate-200 text-xl font-medium">Processing...</p>
              </>
            ) : (
              <>
                <UploadCloud 
                  size={64} 
                  className="text-slate-500 mb-6 transition-colors group-hover:text-indigo-400" 
                />
                <p className="text-slate-200 text-xl font-medium mb-3">
                  Drag & drop your files here
                </p>
                <p className="text-slate-500 text-sm">
                  Supports PDF, DOCX, Images, and TXT up to 50MB
                </p>
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,image/*"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Recent Uploads */}
        {recentUploads.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-slate-100 mb-6">
              Recent Uploads
            </h2>
            <div className="space-y-4">
              {recentUploads.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-5 bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl"
                >
                  <div className="flex items-center gap-4">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-slate-200 font-medium">
                        {item.original_filename || item.metadata?.label || 'Untitled'}
                      </p>
                      <p className="text-slate-500 text-sm">
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Decontaminated
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { UploadCloud, FileText, Images, BookOpen } from 'lucide-react'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { createBrowserClient } from '@supabase/ssr'
import {
  addLearningSourceItem,
  createLearningSource,
  listLearningSources,
  type LearningSourceType,
} from '@/app/actions/learning-sources'

type TabKey = 'syllabus' | 'weekly' | 'photos'

const TAB_META: Record<TabKey, { label: string; description: string; icon: typeof BookOpen }> = {
  syllabus: {
    label: 'Syllabus',
    description: 'Add course outlines, unit overviews, or scope-and-sequence notes.',
    icon: BookOpen,
  },
  weekly: {
    label: 'Weekly',
    description: 'Paste weekly lesson plans, assignments, or learning goals.',
    icon: FileText,
  },
  photos: {
    label: 'Photos',
    description: 'Capture worksheets or whiteboard snapshots (metadata only for now).',
    icon: Images,
  },
}

const BUCKET_ID = 'learning-sources'
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
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

export default function SourcesPage() {
  const { activeProfileId } = useActiveProfile()
  const [activeTab, setActiveTab] = useState<TabKey>('syllabus')
  const [isLoading, setIsLoading] = useState(true)
  const [sources, setSources] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredSources = useMemo(() => {
    return sources.filter((source) => source.source_type === activeTab)
  }, [sources, activeTab])

  const loadSources = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await listLearningSources(activeProfileId || null)
      setSources(data)
    } catch (err: any) {
      console.error('[Sources] Failed to load sources:', err)
      setError('Could not load learning sources. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSources()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId])

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Please add a title for this source.')
      return
    }
    if (!pastedText.trim() && !selectedFile) {
      setError('Please paste text or upload a file.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      let uploadedPath: string | null = null
      let uploadedFileMeta: { name?: string; type?: string; size?: number } | null = null

      if (selectedFile) {
        if (selectedFile.size > MAX_UPLOAD_BYTES) {
          throw new Error('File is too large. Please keep uploads under 20MB.')
        }
        if (activeTab === 'photos' && !selectedFile.type.startsWith('image/')) {
          throw new Error('Photos tab only accepts image files.')
        }
        if (!ALLOWED_FILE_TYPES.has(selectedFile.type)) {
          throw new Error('Unsupported file type. Please upload PDF, DOCX, TXT, or image files.')
        }

        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('You must be signed in to upload files.')
        }

        const safeName = sanitizeFileName(selectedFile.name)
        const path = `${user.id}/${activeProfileId || 'general'}/${Date.now()}-${safeName}`
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_ID)
          .upload(path, selectedFile, { contentType: selectedFile.type, upsert: false })

        if (uploadError) {
          console.error('[Sources] Upload failed:', uploadError)
          throw new Error('Upload failed. Please try again.')
        }

        uploadedPath = path
        uploadedFileMeta = {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
        }
      }

      const source = await createLearningSource({
        profileId: activeProfileId || null,
        sourceType: activeTab as LearningSourceType,
        title: title.trim(),
        description: description.trim() || null,
      })

      if (pastedText.trim()) {
        await addLearningSourceItem({
          sourceId: source.id,
          itemType: 'text',
          pastedText: pastedText.trim(),
          metadata: { label: 'Pasted notes', tab: activeTab },
        })
      }

      if (selectedFile) {
        await addLearningSourceItem({
          sourceId: source.id,
          itemType: activeTab === 'photos' ? 'photo' : 'file',
          fileUrl: uploadedPath ? `${BUCKET_ID}/${uploadedPath}` : null,
          fileMetadata: uploadedFileMeta,
          metadata: {
            label: 'Uploaded file',
            tab: activeTab,
            bucket: BUCKET_ID,
            path: uploadedPath,
          },
        })
      }

      setTitle('')
      setDescription('')
      setPastedText('')
      setSelectedFile(null)
      await loadSources()
    } catch (err: any) {
      console.error('[Sources] Failed to add source:', err)
      setError(err.message || 'Could not add source.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Student materials
          </h1>
          <p className="text-base text-slate-600 max-w-2xl">
            Add real class materials so the tutor can personalize explanations and practice.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {(Object.keys(TAB_META) as TabKey[]).map((key) => {
            const meta = TAB_META[key]
            const Icon = meta.icon
            const isActive = key === activeTab
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:text-teal-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {meta.label}
              </button>
            )
          })}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 sm:p-8 shadow-lg shadow-slate-200/40 max-h-[calc(100vh-240px)] overflow-y-auto">
            <div className="mb-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">
                    Add {TAB_META[activeTab].label.toLowerCase()} materials
                  </h2>
                  <p className="text-sm text-slate-600">{TAB_META[activeTab].description}</p>
                </div>
                <button
                  type="submit"
                  form="sources-form"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-sm font-semibold shadow-lg hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : 'Add source'}
                </button>
              </div>
            </div>

            <form id="sources-form" onSubmit={handleAddSource} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., Unit 2 Fractions"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Short note to help the tutor."
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Paste notes or text</label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full min-h-[140px] rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Paste key excerpts, weekly plans, or assignments."
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Attach a file</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-300 text-slate-600 text-sm cursor-pointer hover:border-teal-400 hover:text-teal-700 transition-colors">
                    <UploadCloud className="w-4 h-4" />
                    <span>{selectedFile ? selectedFile.name : 'Choose a file'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept={activeTab === 'photos' ? 'image/*' : '.pdf,.doc,.docx,.txt,image/*'}
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      disabled={isSubmitting}
                    />
                  </label>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Uploads support PDF, DOCX, TXT, or images up to 20MB. Paste text for the richest tutor context.
                </p>
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow-lg hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-60"
              >
                {isSubmitting ? 'Saving...' : 'Add source'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 sm:p-8 shadow-lg shadow-slate-200/40">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Current {TAB_META[activeTab].label.toLowerCase()} sources
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              These materials will be prioritized when answering student questions.
            </p>

            {isLoading ? (
              <div className="text-sm text-slate-500">Loading sources...</div>
            ) : filteredSources.length === 0 ? (
              <div className="text-sm text-slate-500">No sources yet for this tab.</div>
            ) : (
              <div className="space-y-4">
                {filteredSources.map((source) => (
                  <div
                    key={source.id}
                    className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-4"
                  >
                    <div className="text-sm font-semibold text-slate-800">{source.title}</div>
                    {source.description && (
                      <div className="text-xs text-slate-600 mt-1">{source.description}</div>
                    )}
                    <div className="text-xs text-slate-500 mt-2">
                      {source.itemCount} item{source.itemCount === 1 ? '' : 's'}
                      {source.lastItemAt ? ` • Last update ${new Date(source.lastItemAt).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { UploadCloud, FileText, Images, BookOpen, Search, Download, Eye, FileTextIcon, Trash2, X, Map as MapIcon, ClipboardList } from 'lucide-react'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { createBrowserClient } from '@supabase/ssr'
import {
  addLearningSourceItem,
  createLearningSource,
  deleteLearningSourceItems,
  getSignedSourceUrl,
  listLearningSourceItems,
  listLearningSources,
  type LearningSourceType,
} from '@/app/actions/learning-sources'
import { getStudentProfiles, type StudentProfile } from '@/app/actions/student-profiles'
import StudyMapPanel from '@/components/forgemap/StudyMapPanel'
import HomeworkPlanModal from '@/components/homework/HomeworkPlanModal'
import { ForgeInboxBanner } from '@/components/inbox/ForgeInboxBanner'

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

const formatDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString()
}

const matchesSearch = (haystack: Array<string | undefined | null>, query: string) => {
  if (!query) return true
  const needle = query.toLowerCase()
  return haystack.some((value) => (value || '').toLowerCase().includes(needle))
}

export default function SourcesPage() {
  const { activeProfileId } = useActiveProfile()
  const [activeTab, setActiveTab] = useState<TabKey>('syllabus')
  const [isLoading, setIsLoading] = useState(true)
  const [sources, setSources] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [profiles, setProfiles] = useState<StudentProfile[]>([])
  const [activeProfileData, setActiveProfileData] = useState<StudentProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [profileScope, setProfileScope] = useState<'active' | 'all'>('active')
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [isGeneratingMap, setIsGeneratingMap] = useState(false)
  const [isGeneratingHomework, setIsGeneratingHomework] = useState(false)
  const [studyMap, setStudyMap] = useState<{ isOpen: boolean; title: string; mapMarkdown: string }>({
    isOpen: false,
    title: 'Instant Study Map',
    mapMarkdown: '',
  })
  const [homeworkPlan, setHomeworkPlan] = useState<{
    isOpen: boolean
    title: string
    tasks: Array<{ title: string; due_date?: string | null; estimated_minutes?: number | null }>
    planMarkdown: string | null
  }>({
    isOpen: false,
    title: 'Tonight Plan',
    tasks: [],
    planMarkdown: null,
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const profileLookup = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.id, profile.display_name]))
  }, [profiles])

  const effectiveProfileId = profileScope === 'active' ? activeProfileId : null

  const itemsBySourceId = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const item of items) {
      const list = map.get(item.source_id) || []
      list.push(item)
      map.set(item.source_id, list)
    }
    return map
  }, [items])

  const filteredSources = useMemo(() => {
    return sources.filter((source) => {
      if (source.source_type !== activeTab) return false
      if (effectiveProfileId && source.profile_id !== effectiveProfileId) return false
      const relatedItems = itemsBySourceId.get(source.id) || []
      return matchesSearch(
        [
          source.title,
          source.description,
          ...relatedItems.map((item) => item.original_filename),
          ...relatedItems.map((item) => item.metadata?.label),
        ],
        searchQuery.trim()
      )
    })
  }, [sources, activeTab, effectiveProfileId, itemsBySourceId, searchQuery])

  const groupedSources = useMemo(() => {
    const groups = new Map<string, any[]>()
    for (const source of filteredSources) {
      const key = source.profile_id || 'general'
      const list = groups.get(key) || []
      list.push(source)
      groups.set(key, list)
    }
    return groups
  }, [filteredSources])

  const summaryCards = useMemo(() => {
    const cards = ['syllabus', 'weekly', 'photos'].map((type) => {
      const sourcesForType = sources.filter((source) => source.source_type === type)
      const scopedSources = effectiveProfileId
        ? sourcesForType.filter((source) => source.profile_id === effectiveProfileId)
        : sourcesForType
      const sourceIds = new Set(scopedSources.map((source) => source.id))
      const typeItems = items.filter((item) => sourceIds.has(item.source_id))
      return {
        type,
        count: scopedSources.length,
        lastItemAt: typeItems.length > 0 ? typeItems[0].created_at : null,
      }
    })
    return cards
  }, [sources, items, effectiveProfileId])

  const loadSources = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [sourcesData, itemsData, profileData] = await Promise.all([
        listLearningSources(effectiveProfileId),
        listLearningSourceItems(effectiveProfileId),
        getStudentProfiles(),
      ])
      setSources(sourcesData)
      setItems(itemsData)
      setProfiles(profileData)
      
      // Find the active profile data
      if (activeProfileId) {
        const activeProfile = profileData.find(p => p.id === activeProfileId)
        setActiveProfileData(activeProfile || null)
      } else {
        setActiveProfileData(null)
      }
      
      setSelectedItemIds((prev) => {
        const validIds = new Set(itemsData.map((item) => item.id))
        return prev.filter((id) => validIds.has(id))
      })
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
  }, [effectiveProfileId, activeProfileId])

  const handleSignedUrl = async (fileUrl: string) => {
    if (signedUrls[fileUrl]) {
      window.open(signedUrls[fileUrl], '_blank', 'noopener,noreferrer')
      return
    }
    try {
      const url = await getSignedSourceUrl(fileUrl)
      if (url) {
        setSignedUrls((prev) => ({ ...prev, [fileUrl]: url }))
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      console.error('[Sources] Failed to sign URL:', err)
      setError('Could not open that file. Please try again.')
    }
  }

  const handlePreview = async (fileUrl: string) => {
    if (signedUrls[fileUrl]) {
      return
    }
    try {
      const url = await getSignedSourceUrl(fileUrl)
      if (url) {
        setSignedUrls((prev) => ({ ...prev, [fileUrl]: url }))
      }
    } catch (err) {
      console.error('[Sources] Failed to preview file:', err)
      setError('Could not preview that file. Please try again.')
    }
  }

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

  const isItemSelected = (id: string) => selectedItemIds.includes(id)

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]))
  }

  const clearSelection = () => {
    setSelectedItemIds([])
  }

  const handleBulkDelete = async () => {
    if (selectedItemIds.length === 0 || isDeleting) return
    const confirmed = window.confirm(`Delete ${selectedItemIds.length} item${selectedItemIds.length === 1 ? '' : 's'}? This cannot be undone.`)
    if (!confirmed) return

    setIsDeleting(true)
    setError(null)
    try {
      const result = await deleteLearningSourceItems(selectedItemIds)
      if (result.failedStorage > 0) {
        setError('Some files could not be removed from storage, but the items were deleted.')
      }
      setSelectedItemIds([])
      await loadSources()
    } catch (err: any) {
      console.error('[Sources] Failed to delete items:', err)
      setError(err?.message || 'Could not delete selected items. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleGenerateStudyMap = async () => {
    if (selectedItemIds.length === 0 || isGeneratingMap) return
    setIsGeneratingMap(true)
    setError(null)
    try {
      const response = await fetch('/api/study-map/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sourceItemIds: selectedItemIds,
          profileId: activeProfileId || null,
          title: 'Instant Study Map',
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to generate study map')
      }
      setStudyMap({
        isOpen: true,
        title: 'Instant Study Map',
        mapMarkdown: payload?.map?.map_markdown || '',
      })
    } catch (err: any) {
      console.error('[Sources] Study map error:', err)
      setError(err?.message || 'Failed to generate study map')
    } finally {
      setIsGeneratingMap(false)
    }
  }

  const handleGenerateHomeworkPlan = async () => {
    if (selectedItemIds.length === 0 || isGeneratingHomework) return
    setIsGeneratingHomework(true)
    setError(null)
    try {
      const extractResponse = await fetch('/api/homework/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sourceItemIds: selectedItemIds,
          profileId: activeProfileId || null,
        }),
      })
      const extractPayload = await extractResponse.json()
      if (!extractResponse.ok) {
        throw new Error(extractPayload?.error || 'Failed to extract homework')
      }

      const planResponse = await fetch('/api/homework/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId: extractPayload?.plan?.id,
          profileId: activeProfileId || null,
        }),
      })
      const planPayload = await planResponse.json()
      if (!planResponse.ok) {
        throw new Error(planPayload?.error || 'Failed to build homework plan')
      }

      setHomeworkPlan({
        isOpen: true,
        title: planPayload?.plan?.title || 'Tonight Plan',
        tasks: planPayload?.tasks || extractPayload?.tasks || [],
        planMarkdown: planPayload?.plan?.plan_markdown || null,
      })
    } catch (err: any) {
      console.error('[Sources] Homework plan error:', err)
      setError(err?.message || 'Failed to generate homework plan')
    } finally {
      setIsGeneratingHomework(false)
    }
  }

  return (
    <>
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

        {/* Forge Inbox Banner */}
        {activeProfileData && (
          <ForgeInboxBanner 
            inboxEmail={activeProfileData.inbox_email || null}
            studentName={activeProfileData.display_name}
          />
        )}

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-2 text-sm text-slate-600">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sources or filenames..."
              className="bg-transparent outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => setProfileScope('active')}
              className={`px-3 py-1.5 rounded-full border ${
                profileScope === 'active'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              This profile
            </button>
            <button
              type="button"
              onClick={() => setProfileScope('all')}
              className={`px-3 py-1.5 rounded-full border ${
                profileScope === 'all'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              All profiles
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {summaryCards.map((card) => {
            const isActive = card.type === activeTab
            return (
              <button
                key={card.type}
                type="button"
                onClick={() => setActiveTab(card.type as TabKey)}
                className={`text-left rounded-2xl border px-4 py-4 transition-all ${
                  isActive
                    ? 'border-teal-500 bg-teal-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-teal-300'
                }`}
              >
                <div className="text-sm font-semibold text-slate-900 capitalize">{card.type}</div>
                <div className="text-2xl font-bold text-slate-900">{card.count}</div>
                <div className="text-xs text-slate-500">
                  {card.lastItemAt ? `Last upload ${formatDate(card.lastItemAt)}` : 'No uploads yet'}
                </div>
              </button>
            )
          })}
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
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Current {TAB_META[activeTab].label.toLowerCase()} sources
                </h2>
                <p className="text-sm text-slate-600">
                  These materials will be prioritized when answering student questions.
                </p>
              </div>
              {selectedItemIds.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">{selectedItemIds.length} selected</span>
                  <button
                    type="button"
                    onClick={handleGenerateStudyMap}
                    disabled={isGeneratingMap}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 font-semibold text-slate-600 hover:text-slate-800"
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    {isGeneratingMap ? 'Mapping...' : 'Study Map'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateHomeworkPlan}
                    disabled={isGeneratingHomework}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 hover:text-amber-800"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    {isGeneratingHomework ? 'Planning...' : 'Tonight Plan'}
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 font-semibold text-slate-600 hover:text-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="text-sm text-slate-500">Loading sources...</div>
            ) : filteredSources.length === 0 ? (
              <div className="text-sm text-slate-500">No sources yet for this tab.</div>
            ) : (
              <div className="space-y-6">
                {Array.from(groupedSources.entries()).map(([profileId, profileSources]) => {
                  const profileName = profileId === 'general'
                    ? 'General'
                    : profileLookup.get(profileId) || 'Student profile'
                  return (
                    <div key={profileId} className="space-y-3">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {profileName}
                      </div>
                      {profileSources.map((source) => {
                        const sourceItems = itemsBySourceId.get(source.id) || []
                        return (
                          <div
                            key={source.id}
                            className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-4"
                          >
                            <div className="text-sm font-semibold text-slate-800">{source.title}</div>
                            {source.description && (
                              <div className="text-xs text-slate-600 mt-1">{source.description}</div>
                            )}
                            <div className="text-xs text-slate-500 mt-2">
                              {sourceItems.length} item{sourceItems.length === 1 ? '' : 's'}
                              {source.lastItemAt ? ` • Last update ${formatDate(source.lastItemAt)}` : ''}
                            </div>
                            {sourceItems.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {sourceItems.map((item) => (
                                  <div key={item.id} className="flex items-start justify-between gap-3">
                                    <label className="flex items-start gap-2 text-sm text-slate-600">
                                      <input
                                        type="checkbox"
                                        checked={isItemSelected(item.id)}
                                        onChange={() => toggleItemSelection(item.id)}
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                      />
                                      <FileTextIcon className="w-4 h-4 mt-0.5 text-slate-400" />
                                      <div>
                                        <div className="font-medium text-slate-700">
                                          {item.original_filename || item.metadata?.label || 'Uploaded item'}
                                        </div>
                                        <div className="text-xs text-slate-400">{formatDate(item.created_at)}</div>
                                      </div>
                                    </label>
                                    {item.file_url && (
                                      <div className="flex items-center gap-2">
                                        {item.mime_type?.startsWith('image/') && !signedUrls[item.file_url] && (
                                          <button
                                            type="button"
                                            onClick={() => handlePreview(item.file_url)}
                                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                            Preview
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleSignedUrl(item.file_url)}
                                          className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                          Open
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {sourceItems.some((item) => item.file_url && signedUrls[item.file_url] && item.mime_type?.startsWith('image/')) && (
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    {sourceItems
                                      .filter((item) => item.file_url && item.mime_type?.startsWith('image/') && signedUrls[item.file_url])
                                      .slice(0, 2)
                                      .map((item) => (
                                        <img
                                          key={item.id}
                                          src={signedUrls[item.file_url]}
                                          alt={item.original_filename || 'Uploaded image'}
                                          className="rounded-lg border border-slate-200 object-cover h-24 w-full"
                                        />
                                      ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
      </div>

      <StudyMapPanel
      isOpen={studyMap.isOpen}
      onClose={() => setStudyMap({ isOpen: false, title: 'Instant Study Map', mapMarkdown: '' })}
      title={studyMap.title}
      mapMarkdown={studyMap.mapMarkdown}
      />

      <HomeworkPlanModal
      isOpen={homeworkPlan.isOpen}
      onClose={() =>
        setHomeworkPlan({ isOpen: false, title: 'Tonight Plan', tasks: [], planMarkdown: null })
      }
      title={homeworkPlan.title}
      tasks={homeworkPlan.tasks}
      planMarkdown={homeworkPlan.planMarkdown}
      />
    </>
  )
}

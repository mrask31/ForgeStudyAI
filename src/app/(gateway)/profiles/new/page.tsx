'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { createStudentProfile, getStudentProfiles } from '@/app/actions/student-profiles'
import { sendConsentEmail } from '@/app/actions/consent'
import { createSubjectsForProfile } from '@/app/actions/study-topics'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { FAMILY_MAX_PROFILES } from '@/lib/constants'
import { GraduationCap, BookOpen, ArrowRight, Upload } from 'lucide-react'
import { toast } from 'sonner'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const MAX_FILE_BYTES = 20 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'text/plain'])
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.txt']

type VaultStatus = 'processing' | 'ready' | 'error'
type Step = 'profile' | 'subjects' | 'interests' | 'vault' | 'done'

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const data = new Uint8Array(buffer)
  const pdf = await pdfjsLib.getDocument({ data }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
    fullText += `${pageText}\n`
  }
  return fullText.trim()
}

async function extractImageText(buffer: ArrayBuffer, mimeType: string): Promise<string> {
  const base64Image = Buffer.from(buffer).toString('base64')
  const res = await fetch('/api/ai/extract-image-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, mimeType }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Image text extraction failed')
  }
  const { text } = await res.json()
  return text || ''
}

async function extractText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  if (file.type === 'application/pdf') return extractPdfText(buffer)
  if (file.type === 'text/plain') return new TextDecoder().decode(buffer)
  if (file.type === 'image/jpeg' || file.type === 'image/png') return extractImageText(buffer, file.type)
  throw new Error(`Unsupported file type: ${file.type}`)
}

function NewProfileContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setActiveProfileId } = useActiveProfile()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('profile')
  const [newProfileId, setNewProfileId] = useState<string | null>(null)
  const [newProfileName, setNewProfileName] = useState('')

  // Step 1: Name & Grade
  const [band, setBand] = useState<'high' | 'middle' | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [grade, setGrade] = useState('')
  const [parentEmail, setParentEmail] = useState('')

  // Step 2: Subjects
  const [subjects, setSubjects] = useState<string[]>([])
  const [subjectInput, setSubjectInput] = useState('')

  // Step 3: Interests
  const [interestTags, setInterestTags] = useState<string[]>([])
  const [interestInput, setInterestInput] = useState('')

  // Step 4: Vault upload
  const [vaultDoc, setVaultDoc] = useState<{ name: string; status: VaultStatus; errorMsg?: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [vaultError, setVaultError] = useState<string | null>(null)

  // Shared
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const isMinor = grade === '6' || grade === '7'

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseAnonKey) {
          router.replace('/login?redirect=/profiles/new')
          return
        }

        const supabase = getSupabaseBrowser()
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 7000)
        })
        const sessionResult = await Promise.race([sessionPromise, timeoutPromise])
        const session = sessionResult && 'data' in sessionResult ? sessionResult.data.session : null

        if (!session?.user) {
          setAuthError('We could not confirm your session. Please sign in again.')
          window.location.assign('/login?redirect=/profiles/new')
          return
        }

        setUser(session.user)

        const bandParam = searchParams.get('band')
        if (bandParam && ['high', 'middle'].includes(bandParam)) {
          setBand(bandParam as 'high' | 'middle')
        }

        const profiles = await getStudentProfiles()
        const existingProfiles = profiles.length

        if (existingProfiles >= 1) {
          try {
            const subRes = await fetch('/api/stripe/subscription', { credentials: 'include' })
            if (subRes.ok) {
              const subData = await subRes.json()
              const planType = subData.planType || 'individual'
              if (planType !== 'family') {
                router.replace('/profiles')
                return
              }
            } else {
              router.replace('/profiles')
              return
            }
          } catch {
            router.replace('/profiles')
            return
          }

          const stored = sessionStorage.getItem('parent_pin_unlocked')
          if (!stored) { router.replace('/parent'); return }
          try {
            const parsed = JSON.parse(stored) as { timestamp: number }
            if (Date.now() - parsed.timestamp > 30 * 60 * 1000) {
              sessionStorage.removeItem('parent_pin_unlocked')
              router.replace('/parent')
              return
            }
          } catch {
            sessionStorage.removeItem('parent_pin_unlocked')
            router.replace('/parent')
            return
          }

          if (existingProfiles >= FAMILY_MAX_PROFILES) {
            router.replace('/parent')
            return
          }
        }
      } catch (err) {
        console.error('[New Profile Page] Error checking auth:', err)
        setAuthError('We could not confirm your session. Please sign in again.')
        window.location.assign('/login?redirect=/profiles/new')
      } finally {
        setIsCheckingAuth(false)
      }
    }

    loadData()
  }, [searchParams, router])

  // Step 1 → Step 2
  const handleProfileNext = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!band) { setError('Please select a grade level'); return }
    if (!displayName.trim()) { setError('Please enter the student\'s name'); return }
    if (isMinor && !parentEmail.trim()) { setError('Parent email is required for students under 13'); return }
    setStep('subjects')
  }

  // Step 2 → Step 3
  const handleSubjectsNext = () => {
    if (subjects.length === 0) return
    setStep('interests')
  }

  // Helper: add subject chip
  const addSubject = () => {
    const trimmed = subjectInput.replace(/,/g, '').trim()
    if (trimmed && subjects.length < 8 && !subjects.includes(trimmed)) {
      setSubjects([...subjects, trimmed])
    }
    setSubjectInput('')
  }

  // Helper: add interest chip
  const addInterest = () => {
    const trimmed = interestInput.replace(/,/g, '').trim()
    if (trimmed && interestTags.length < 5 && !interestTags.includes(trimmed)) {
      setInterestTags([...interestTags, trimmed])
    }
    setInterestInput('')
  }

  // Step 3 → Step 4: create profile + insert subjects
  const handleCreateProfile = async (tags: string[]) => {
    setError(null)
    setIsSubmitting(true)

    try {
      const newProfile = await createStudentProfile({
        display_name: displayName.trim(),
        grade_band: band!,
        grade: grade.trim() || null,
        interests: tags.length > 0 ? tags.join(', ') : null,
        is_minor: isMinor,
        parent_email: isMinor ? parentEmail.trim() : null,
      })

      if (isMinor && parentEmail.trim()) {
        try {
          await sendConsentEmail(newProfile.id, parentEmail.trim(), displayName.trim())
          toast.success('Consent email sent to parent!')
        } catch (err) {
          console.error('[New Profile] Failed to send consent email:', err)
        }
      }

      // Insert subjects into study_topics (non-fatal)
      if (subjects.length > 0) {
        try {
          await createSubjectsForProfile(newProfile.id, subjects, band!)
        } catch (err) {
          console.error('[New Profile] Failed to insert subjects:', err)
        }
      }

      setActiveProfileId(newProfile.id)
      setNewProfileId(newProfile.id)
      setNewProfileName(displayName.trim())
      setStep('vault')
    } catch (err: any) {
      console.error('[New Profile Page] Error creating profile:', err)
      setError(err.message || 'Failed to create profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Vault file processing
  const processVaultFile = async (file: File) => {
    setVaultError(null)

    if (file.size > MAX_FILE_BYTES) {
      setVaultError('File is too large. Maximum size is 20 MB.')
      return
    }
    if (!ACCEPTED_TYPES.has(file.type)) {
      setVaultError('Unsupported file type. Please upload a PDF, JPG, PNG, or TXT file.')
      return
    }

    setVaultDoc({ name: file.name, status: 'processing' })

    try {
      const text = await extractText(file)
      if (!text || text.trim().length < 10) {
        throw new Error('No readable text found in this file.')
      }

      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, filename: file.name, document_type: 'note', source: 'vault' }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to process document')
      }

      setVaultDoc({ name: file.name, status: 'ready' })
    } catch (err: any) {
      console.error('[Onboarding Vault] Processing error:', err)
      setVaultDoc({ name: file.name, status: 'error', errorMsg: err.message })
      setVaultError(err.message || 'Failed to process file.')
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processVaultFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processVaultFile(file)
  }

  if (isCheckingAuth || !user) {
    return (
      <div className="h-full bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-600">{authError || 'Checking authentication...'}</div>
        </div>
      </div>
    )
  }

  const gradeOptions = band === 'middle' ? ['6', '7', '8'] : ['9', '10', '11', '12']
  const stepNumbers: Record<Step, number> = { profile: 1, subjects: 2, interests: 3, vault: 4, done: 5 }
  const stepProgress: Record<Step, string> = { profile: 'w-1/5', subjects: 'w-2/5', interests: 'w-3/5', vault: 'w-4/5', done: 'w-full' }
  const stepPercent: Record<Step, string> = { profile: '20%', subjects: '40%', interests: '60%', vault: '80%', done: '100%' }
  const isUploading = vaultDoc?.status === 'processing'

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-background to-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">

        {/* Progress indicator — hidden on done */}
        {step !== 'done' && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground">Step {stepNumbers[step]} of 5</h2>
              <div className="text-xs text-muted-foreground">{stepPercent[step]}</div>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full ${stepProgress[step]} bg-primary rounded-full transition-all duration-500`} />
            </div>
          </div>
        )}

        <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-8 sm:p-10 shadow-xl">

          {/* ── Step 1: Name & Grade ── */}
          {step === 'profile' && (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                Create a student profile
              </h1>
              <p className="text-lg text-muted-foreground mb-2">
                Set up personalized learning support for Grades 6–12
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                ForgeStudy helps students understand their work step-by-step, building confidence and independence.
              </p>

              <form onSubmit={handleProfileNext} className="space-y-6">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-semibold text-foreground mb-2">
                    Student name / nickname *
                  </label>
                  <input
                    type="text" id="displayName" value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter student name or nickname" required
                    className="w-full px-4 py-3 border-2 border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground placeholder-muted-foreground"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">Grade level *</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: 'middle', label: 'Middle School', sublabel: 'Grades 6–8', icon: BookOpen },
                      { value: 'high', label: 'High School', sublabel: 'Grades 9–12', icon: GraduationCap },
                    ].map(({ value, label, sublabel, icon: Icon }) => (
                      <button key={value} type="button" onClick={() => setBand(value as 'high' | 'middle')} disabled={isSubmitting}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${band === value ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' : 'border-border bg-background hover:border-primary hover:bg-card/50'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <Icon className={`w-6 h-6 mx-auto mb-2 ${band === value ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-semibold block ${band === value ? 'text-primary' : 'text-foreground'}`}>{label}</span>
                        <span className={`text-xs mt-0.5 block ${band === value ? 'text-primary/80' : 'text-muted-foreground'}`}>{sublabel}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {band && (
                  <div>
                    <label htmlFor="grade" className="block text-sm font-semibold text-foreground mb-2">Specific grade (optional)</label>
                    <select id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} disabled={isSubmitting}
                      className="w-full px-4 py-3 border-2 border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground">
                      <option value="">Select grade (optional)...</option>
                      {gradeOptions.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                  </div>
                )}

                {isMinor && (
                  <div>
                    <label htmlFor="parentEmail" className="block text-sm font-semibold text-foreground mb-2">
                      Parent/guardian email *
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Required for students under 13 (COPPA). We'll send a consent email to verify parental approval.
                    </p>
                    <input
                      type="email" id="parentEmail" value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="parent@email.com" required
                      className="w-full px-4 py-3 border-2 border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground placeholder-muted-foreground"
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-red-950/50 border border-red-800 rounded-xl p-4">
                    <p className="text-sm font-medium text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => router.push('/parent')} disabled={isSubmitting}
                    className="flex-1 px-6 py-3 border-2 border-border text-foreground rounded-xl font-semibold hover:bg-secondary/50 transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={!band || !displayName.trim() || (isMinor && !parentEmail.trim())}
                    className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 flex items-center justify-center gap-2">
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 2: Subjects ── */}
          {step === 'subjects' && (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                What subjects are you studying?
              </h1>
              <p className="text-base text-muted-foreground mb-8">
                These become your courses in the Galaxy
              </p>

              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {subjects.map((subject) => (
                    <span key={subject}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 border border-primary/40 rounded-full text-sm text-primary">
                      {subject}
                      <button type="button"
                        onClick={() => setSubjects(subjects.filter((s) => s !== subject))}
                        className="ml-1 text-primary/70 hover:text-primary transition-colors leading-none"
                        aria-label={`Remove ${subject}`}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {subjects.length < 8 && (
                <input
                  type="text"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addSubject()
                    }
                  }}
                  placeholder={subjects.length === 0 ? 'e.g. Math, Biology, AP History, English' : 'Add another subject...'}
                  autoFocus
                  className="w-full px-4 py-3 border-2 border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground placeholder-muted-foreground"
                />
              )}
              <p className="text-xs text-muted-foreground mt-2 mb-8">
                Press Enter or comma to add &bull; {8 - subjects.length} of 8 remaining
              </p>

              <div className="flex gap-4">
                <button type="button" onClick={() => setStep('profile')}
                  className="flex-1 px-6 py-3 border-2 border-border text-foreground rounded-xl font-semibold hover:bg-secondary/50 transition-colors">
                  Back
                </button>
                <button type="button" onClick={handleSubjectsNext}
                  disabled={subjects.length === 0}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Interests ── */}
          {step === 'interests' && (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                What are you into?
              </h1>
              <p className="text-base text-muted-foreground mb-8">
                Helps your tutor explain things in ways that click for {displayName || 'you'}
              </p>

              {interestTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {interestTags.map((tag) => (
                    <span key={tag}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 border border-primary/40 rounded-full text-sm text-primary">
                      {tag}
                      <button type="button"
                        onClick={() => setInterestTags(interestTags.filter((t) => t !== tag))}
                        disabled={isSubmitting}
                        className="ml-1 text-primary/70 hover:text-primary transition-colors leading-none"
                        aria-label={`Remove ${tag}`}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {interestTags.length < 5 && (
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addInterest()
                    }
                  }}
                  placeholder={interestTags.length === 0 ? 'e.g. soccer, Minecraft, music, drawing, cooking' : 'Add another...'}
                  autoFocus
                  className="w-full px-4 py-3 border-2 border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground placeholder-muted-foreground"
                  disabled={isSubmitting}
                />
              )}
              <p className="text-xs text-muted-foreground mt-2 mb-8">
                Press Enter or comma to add &bull; {5 - interestTags.length} of 5 remaining
              </p>

              {error && (
                <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 mb-6">
                  <p className="text-sm font-medium text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button type="button"
                  onClick={() => handleCreateProfile([])}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 border-2 border-border text-foreground rounded-xl font-semibold hover:bg-secondary/50 transition-colors disabled:opacity-50">
                  Skip
                </button>
                <button type="button"
                  onClick={() => handleCreateProfile(interestTags)}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 flex items-center justify-center gap-2">
                  {isSubmitting ? 'Creating profile...' : <>Continue <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </>
          )}

          {/* ── Step 4: Study Vault Upload ── */}
          {step === 'vault' && (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                Upload your notes or textbook pages
              </h1>
              <p className="text-base text-muted-foreground mb-8">
                Your tutor will use them to help you study. You can always add more later.
              </p>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`relative w-full h-48 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer select-none ${
                  isDragging
                    ? 'border-primary bg-primary/10 scale-[1.01]'
                    : isUploading
                      ? 'border-primary/50 bg-primary/5 cursor-not-allowed'
                      : 'border-border bg-background/50 hover:border-primary/60 hover:bg-primary/5'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={ACCEPTED_EXTENSIONS.join(',')}
                  onChange={handleFileInput}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <>
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-foreground font-medium">Processing your document...</p>
                    <p className="text-muted-foreground text-sm mt-1">Extracting and indexing content</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-foreground font-medium">
                      {isDragging ? 'Drop it here' : 'Drag & drop or tap to upload'}
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">PDF, JPG, PNG, TXT — up to 20 MB</p>
                  </>
                )}
              </div>

              {vaultDoc && !isUploading && (
                <div className={`mt-4 flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  vaultDoc.status === 'ready'
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <span className="text-lg">{vaultDoc.status === 'ready' ? '✅' : '❌'}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${vaultDoc.status === 'ready' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {vaultDoc.name}
                    </p>
                    {vaultDoc.status === 'error' && vaultDoc.errorMsg && (
                      <p className="text-xs text-red-400/80 mt-0.5">{vaultDoc.errorMsg}</p>
                    )}
                  </div>
                </div>
              )}

              {vaultError && !vaultDoc && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {vaultError}
                </div>
              )}

              <div className="flex gap-4 mt-8">
                <button type="button"
                  onClick={() => setStep('done')}
                  disabled={isUploading}
                  className="flex-1 px-6 py-3 border-2 border-border text-foreground rounded-xl font-semibold hover:bg-secondary/50 transition-colors disabled:opacity-50">
                  Skip
                </button>
                <button type="button"
                  onClick={() => setStep('done')}
                  disabled={isUploading}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* ── Step 5: You're all set! ── */}
          {step === 'done' && (
            <div className="text-center py-4">
              <div className="text-6xl mb-6">🚀</div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                {newProfileName ? `${newProfileName}, you're all set!` : "You're all set!"}
              </h1>
              <p className="text-base text-muted-foreground mb-10">
                Your Galaxy is ready. Start a session with your tutor and let the learning begin.
              </p>
              <button
                type="button"
                onClick={() => router.push('/app')}
                className="px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all shadow-lg shadow-primary/30 inline-flex items-center gap-2 text-lg"
              >
                Start studying <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default function NewProfilePage() {
  return (
    <Suspense fallback={
      <div className="h-full bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-600">Loading...</div>
        </div>
      </div>
    }>
      <NewProfileContent />
    </Suspense>
  )
}

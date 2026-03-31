'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { createStudentProfile, getStudentProfiles } from '@/app/actions/student-profiles'
import { sendConsentEmail } from '@/app/actions/consent'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { FAMILY_MAX_PROFILES } from '@/lib/constants'
import { GraduationCap, BookOpen, Link as LinkIcon, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

function NewProfileContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setActiveProfileId } = useActiveProfile()

  // Step state: 'profile' (Step 1) or 'connect' (Step 2)
  const [step, setStep] = useState<'profile' | 'connect'>('profile')
  const [newProfileId, setNewProfileId] = useState<string | null>(null)
  const [newProfileName, setNewProfileName] = useState('')

  // Step 1 form state
  const [band, setBand] = useState<'high' | 'middle' | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [grade, setGrade] = useState('')
  const [interests, setInterests] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Step 2 Canvas state
  const [canvasUrl, setCanvasUrl] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [canvasPAT, setCanvasPAT] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  // Grades 6-7 are typically under 13 → COPPA minor
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
      } catch (error) {
        console.error('[New Profile Page] Error checking auth:', error)
        setAuthError('We could not confirm your session. Please sign in again.')
        window.location.assign('/login?redirect=/profiles/new')
      } finally {
        setIsCheckingAuth(false)
      }
    }

    loadData()
  }, [searchParams, router])

  // Step 1: Create profile
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!band) { setError('Please select a grade level'); setIsSubmitting(false); return }
      if (!displayName.trim()) { setError('Please enter the student\'s name'); setIsSubmitting(false); return }
      if (isMinor && !parentEmail.trim()) { setError('Parent email is required for students under 13'); setIsSubmitting(false); return }

      const newProfile = await createStudentProfile({
        display_name: displayName.trim(),
        grade_band: band,
        grade: grade.trim() || null,
        interests: interests.trim() || null,
        is_minor: isMinor,
        parent_email: isMinor ? parentEmail.trim() : null,
      })

      // Send COPPA consent email for minors
      if (isMinor && parentEmail.trim()) {
        try {
          await sendConsentEmail(newProfile.id, parentEmail.trim(), displayName.trim())
          toast.success('Consent email sent to parent!')
        } catch (err) {
          console.error('[New Profile] Failed to send consent email:', err)
          // Don't block profile creation — consent can be resent
        }
      }

      setActiveProfileId(newProfile.id)
      setNewProfileId(newProfile.id)
      setNewProfileName(displayName.trim())
      setStep('connect')
    } catch (err: any) {
      console.error('[New Profile Page] Error creating profile:', err)
      setError(err.message || 'Failed to create profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 2: Connect Canvas
  const handleCanvasConnect = async () => {
    if (!canvasUrl.trim() || !canvasPAT.trim() || !newProfileId) return
    setIsConnecting(true)

    try {
      const res = await fetch('/api/parent/lms/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          studentId: newProfileId,
          provider: 'canvas',
          canvasInstanceUrl: canvasUrl.trim(),
          canvasPAT: canvasPAT.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to connect Canvas')
      }

      toast.success('Canvas connected! Syncing assignments...')
      router.push('/app')
    } catch (err: any) {
      console.error('[New Profile] Canvas connect error:', err)
      toast.error(err.message || 'Failed to connect Canvas')
    } finally {
      setIsConnecting(false)
    }
  }

  // Step 2: Connect Google Classroom
  const handleGoogleConnect = async () => {
    if (!newProfileId) return
    setIsConnecting(true)
    try {
      const res = await fetch(`/api/auth/google-classroom/authorize?studentId=${newProfileId}`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to start Google OAuth')
      }
      window.location.href = data.url
    } catch (err: any) {
      console.error('[New Profile] Google connect error:', err)
      toast.error(err.message || 'Failed to start Google Classroom connection')
      setIsConnecting(false)
    }
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
  const stepNumber = step === 'profile' ? 3 : 4
  const stepProgress = step === 'profile' ? 'w-3/5' : 'w-4/5'

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-background to-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Step {stepNumber} of 5</h2>
            <div className="text-xs text-muted-foreground">{step === 'profile' ? '60%' : '80%'}</div>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div className={`h-full ${stepProgress} bg-primary rounded-full transition-all duration-500`} />
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-8 sm:p-10 shadow-xl">
          {step === 'profile' ? (
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

              <form onSubmit={handleCreateProfile} className="space-y-6">
                {/* Display Name */}
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

                {/* Grade Band */}
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

                {/* Grade */}
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

                {/* Parent Email — required for minors (grade 6-7) */}
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

                {/* Interests */}
                <div>
                  <label htmlFor="interests" className="block text-sm font-semibold text-foreground mb-2">
                    What does {displayName || 'your student'} love? (optional)
                  </label>
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {['Gaming', 'Soccer', 'Music', 'Art', 'Science', 'Reading'].map((tag) => (
                        <button key={tag} type="button" disabled={isSubmitting}
                          onClick={() => {
                            const arr = interests.split(',').map(i => i.trim()).filter(i => i)
                            if (arr.includes(tag)) setInterests(arr.filter(i => i !== tag).join(', '))
                            else { arr.push(tag); setInterests(arr.join(', ')) }
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${interests.split(',').map(i => i.trim()).includes(tag) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea id="interests" value={interests} onChange={(e) => setInterests(e.target.value)}
                    placeholder="e.g., soccer, space, art, Minecraft, dinosaurs, anime"
                    className="w-full min-h-[80px] px-4 py-3 border-2 border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground placeholder-muted-foreground"
                    disabled={isSubmitting} />
                </div>

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
                  <button type="submit" disabled={isSubmitting || !band || !displayName.trim()}
                    className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 flex items-center justify-center gap-2">
                    {isSubmitting ? 'Creating profile...' : <>Next <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Step 2: Connect classroom */
            <>
              <div className="flex items-center gap-3 mb-2">
                <LinkIcon className="w-7 h-7 text-primary" />
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Connect {newProfileName}'s classroom
                </h1>
              </div>
              <p className="text-muted-foreground mb-8">
                Connect Canvas or Google Classroom so we can sync assignments automatically. You can also skip this and connect later in Settings.
              </p>

              <div className="space-y-6">
                {/* Canvas connect */}
                <div className="border-2 border-border rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">C</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Canvas LMS</h3>
                      <p className="text-xs text-muted-foreground">Personal Access Token</p>
                    </div>
                  </div>
                  <input type="url" placeholder="Canvas URL (e.g., https://school.instructure.com)" value={canvasUrl}
                    onChange={(e) => setCanvasUrl(e.target.value)} disabled={isConnecting}
                    className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
                  <input type="password" placeholder="Personal Access Token" value={canvasPAT}
                    onChange={(e) => setCanvasPAT(e.target.value)} disabled={isConnecting}
                    className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
                  <button onClick={handleCanvasConnect} disabled={isConnecting || !canvasUrl.trim() || !canvasPAT.trim()}
                    className="w-full px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {isConnecting ? 'Connecting...' : 'Connect Canvas'}
                  </button>
                </div>

                {/* Google Classroom connect */}
                <div className="border-2 border-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">G</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Google Classroom</h3>
                      <p className="text-xs text-muted-foreground">OAuth 2.0</p>
                    </div>
                  </div>
                  <button onClick={handleGoogleConnect} disabled={isConnecting}
                    className="w-full px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {isConnecting ? 'Connecting...' : 'Connect Google Classroom'}
                  </button>
                </div>

                {/* Skip */}
                <div className="text-center pt-2">
                  <button onClick={() => router.push('/app')}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
                    Skip for now
                  </button>
                </div>
              </div>
            </>
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

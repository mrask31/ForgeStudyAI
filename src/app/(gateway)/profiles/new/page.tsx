'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { createStudentProfile, getStudentProfiles } from '@/app/actions/student-profiles'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { FAMILY_MAX_PROFILES } from '@/lib/constants'
import { GraduationCap, BookOpen } from 'lucide-react'

function NewProfileContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [band, setBand] = useState<'high' | 'middle' | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [grade, setGrade] = useState('')
  const [interests, setInterests] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const { setActiveProfileId } = useActiveProfile()

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

        // Read band from query params
        const bandParam = searchParams.get('band')
        if (bandParam && ['high', 'middle'].includes(bandParam)) {
          setBand(bandParam as 'high' | 'middle')
        }

        // Check current profile count
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
          } catch (error) {
            console.error('[New Profile Page] Failed to check plan type:', error)
            router.replace('/profiles')
            return
          }

          const stored = sessionStorage.getItem('parent_pin_unlocked')
          if (!stored) {
            router.replace('/parent')
            return
          }
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

  const getBandRoute = (_bandValue: 'high' | 'middle') => {
    // All profiles route to unified /app Galaxy
    return '/app'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!band) {
        setError('Please select a grade level')
        setIsSubmitting(false)
        return
      }

      if (!displayName.trim()) {
        setError('Please enter the student\'s name')
        setIsSubmitting(false)
        return
      }

      const newProfile = await createStudentProfile({
        display_name: displayName.trim(),
        grade_band: band,
        grade: grade.trim() || null,
        interests: interests.trim() || null,
      })

      // After creation, check profile count and redirect
      const updatedProfiles = await getStudentProfiles()
      
      if (updatedProfiles.length === 1) {
        // First profile created - set as active and go to app
        setActiveProfileId(newProfile.id)
        router.push(getBandRoute(newProfile.grade_band))
      } else {
        // Multiple profiles - redirect to Parent Dashboard (not profile picker)
        router.push('/parent')
      }
    } catch (err: any) {
      console.error('[New Profile Page] Error creating profile:', err)
      setError(err.message || 'Failed to create profile. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="h-full bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-600">Checking authentication...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-full bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-600">
            {authError || 'Redirecting to sign in...'}
          </div>
        </div>
      </div>
    )
  }

  const gradeOptions = band === 'middle'
    ? ['6', '7', '8']
    : ['9', '10', '11', '12']

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-background to-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Step 3 of 5</h2>
            <div className="text-xs text-muted-foreground">60%</div>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full w-3/5 bg-primary rounded-full transition-all duration-500" />
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-8 sm:p-10 shadow-xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Create a student profile
          </h1>
          <p className="text-lg text-muted-foreground mb-2">
            Set up personalized learning support for Grades 6–12
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            ForgeStudy helps students understand their work step-by-step, building confidence and independence.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-semibold text-foreground mb-2">
                Student name / nickname *
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter student name or nickname"
                required
                className="w-full px-4 py-3 border-2 border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground placeholder-muted-foreground"
                disabled={isSubmitting}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                This helps personalize their learning experience
              </p>
            </div>

            {/* Grade Band */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                Grade level *
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                ForgeStudy adapts its teaching style to match each grade band
              </p>
              <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'middle', label: 'Middle School', sublabel: 'Grades 6–8', icon: BookOpen },
                { value: 'high', label: 'High School', sublabel: 'Grades 9–12', icon: GraduationCap },
              ].map(({ value, label, sublabel, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBand(value as 'high' | 'middle')}
                    disabled={isSubmitting}
                    className={`
                      p-4 rounded-xl border-2 transition-all duration-200
                      ${band === value
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                        : 'border-border bg-background hover:border-primary hover:bg-card/50'
                      }
                      ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${band === value ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-semibold block ${band === value ? 'text-primary' : 'text-foreground'}`}>
                      {label}
                    </span>
                    <span className={`text-xs mt-0.5 block ${band === value ? 'text-primary/80' : 'text-muted-foreground'}`}>
                      {sublabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Grade (Optional) */}
            {band && (
              <div>
                <label htmlFor="grade" className="block text-sm font-semibold text-foreground mb-2">
                  Specific grade (optional)
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Helps us personalize explanations and examples
                </p>
                <select
                  id="grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground"
                  disabled={isSubmitting}
                >
                  <option value="">Select grade (optional)...</option>
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Interests - Fun UI with Tag Chips */}
            <div>
              <label htmlFor="interests" className="block text-sm font-semibold text-foreground mb-2">
                What does {displayName || 'your student'} love? (optional)
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                We use this to make tutoring examples more engaging and fun.
              </p>
              
              {/* Quick select chips */}
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">Quick select:</p>
                <div className="flex flex-wrap gap-2">
                  {['Gaming', 'Soccer', 'Music', 'Art', 'Science', 'Reading'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const newInterests = interests.split(',').map(i => i.trim()).filter(i => i)
                        if (newInterests.includes(tag)) {
                          setInterests(newInterests.filter(i => i !== tag).join(', '))
                        } else {
                          newInterests.push(tag)
                          setInterests(newInterests.join(', '))
                        }
                      }}
                      disabled={isSubmitting}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        interests.split(',').map(i => i.trim()).includes(tag)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text input for custom interests */}
              <textarea
                id="interests"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g., soccer, space, art, Minecraft, dinosaurs, anime"
                className="w-full min-h-[100px] px-4 py-3 border-2 border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground placeholder-muted-foreground"
                disabled={isSubmitting}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-950/50 border border-red-800 rounded-xl p-4">
                <p className="text-sm font-medium text-red-400">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/parent')}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 border-2 border-border text-foreground rounded-xl font-semibold hover:bg-secondary/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !band || !displayName.trim()}
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
              >
                {isSubmitting ? 'Creating profile...' : 'Continue to Next Step'}
              </button>
            </div>
          </form>
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

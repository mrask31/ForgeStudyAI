'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { createBrowserClient } from '@supabase/ssr'
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

        const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
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

  const getBandRoute = (bandValue: 'high' | 'middle') => {
    switch (bandValue) {
      case 'middle':
        return '/app/middle'
      case 'high':
        return '/app/high'
      default:
        return '/profiles'
    }
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
        setActiveProfileId(newProfile.id)
        router.push(getBandRoute(newProfile.grade_band))
      } else {
        // Multiple profiles -> back to picker
        router.push('/profiles')
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
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-8 sm:p-10 shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            Create a student profile
          </h1>
          <p className="text-lg text-slate-600 mb-2">
            Set up personalized learning support for Grades 6–12
          </p>
          <p className="text-sm text-slate-500 mb-8">
            ForgeStudy helps students understand their work step-by-step, building confidence and independence.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-semibold text-slate-900 mb-2">
                Student name / nickname *
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter student name or nickname"
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-400 transition-all text-slate-900"
                disabled={isSubmitting}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                This helps personalize their learning experience
              </p>
            </div>

            {/* Grade Band */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">
                Grade level *
              </label>
              <p className="text-xs text-slate-500 mb-3">
                ForgeStudy adapts its teaching style to match each grade band
              </p>
              <div className="grid grid-cols-3 gap-4">
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
                        ? 'border-teal-500 bg-teal-50 shadow-md'
                        : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                      }
                      ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${band === value ? 'text-teal-600' : 'text-slate-400'}`} />
                    <span className={`text-sm font-semibold block ${band === value ? 'text-teal-900' : 'text-slate-700'}`}>
                      {label}
                    </span>
                    <span className={`text-xs mt-0.5 ${band === value ? 'text-teal-700' : 'text-slate-500'}`}>
                      {sublabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Grade (Optional) */}
            {band && (
              <div>
                <label htmlFor="grade" className="block text-sm font-semibold text-slate-900 mb-2">
                  Specific grade (optional)
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Helps us personalize explanations and examples
                </p>
                <select
                  id="grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-400 transition-all text-slate-900 bg-white"
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

            <div>
              <label htmlFor="interests" className="block text-sm font-semibold text-slate-900 mb-2">
                Interests & hobbies (optional)
              </label>
              <p className="text-xs text-slate-500 mb-2">
                We use this to make examples more engaging for your student.
              </p>
              <textarea
                id="interests"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g., soccer, space, art, Minecraft, dinosaurs"
                className="w-full min-h-[120px] px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-400 transition-all text-slate-900"
                disabled={isSubmitting}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/profiles')}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !band || !displayName.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-700 to-teal-600 text-white rounded-xl font-bold hover:from-teal-800 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-500/30 hover:shadow-lg hover:shadow-teal-500/40"
              >
                {isSubmitting ? 'Creating profile...' : 'Create Profile'}
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

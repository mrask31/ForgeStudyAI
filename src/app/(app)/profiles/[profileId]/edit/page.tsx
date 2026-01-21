'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { GraduationCap, BookOpen } from 'lucide-react'
import { getStudentProfile, updateStudentProfile, type StudentProfile } from '@/app/actions/student-profiles'

export default function EditProfilePage() {
  const router = useRouter()
  const params = useParams()
  const profileId = params.profileId as string

  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [band, setBand] = useState<'high' | 'middle' | null>(null)
  const [grade, setGrade] = useState('')
  const [interests, setInterests] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login?redirect=/profiles')
          return
        }

        const studentProfile = await getStudentProfile(profileId)
        if (!studentProfile) {
          router.push('/profiles')
          return
        }

        setProfile(studentProfile)
        setDisplayName(studentProfile.display_name)
        setBand(studentProfile.grade_band)
        setGrade(studentProfile.grade || '')
        setInterests(studentProfile.interests || '')
      } catch (err) {
        console.error('[Edit Profile] Failed to load profile:', err)
        router.push('/profiles')
      } finally {
        setIsLoading(false)
      }
    }

    if (profileId) {
      loadProfile()
    }
  }, [profileId, router])

  const gradeOptions = useMemo(() => {
    if (band === 'middle') return ['6', '7', '8']
    if (band === 'high') return ['9', '10', '11', '12']
    return []
  }, [band])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      if (!band) {
        setError('Please select a grade level')
        return
      }

      if (!displayName.trim()) {
        setError('Please enter the student\'s name')
        return
      }

      await updateStudentProfile(profileId, {
        display_name: displayName.trim(),
        grade_band: band,
        grade: grade.trim() || null,
        interests: interests.trim() || null,
      })

      router.push('/profiles')
    } catch (err: any) {
      console.error('[Edit Profile] Failed to update profile:', err)
      setError(err.message || 'Failed to update profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="h-full bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Profile not found.</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-8 sm:p-10 shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            Edit student profile
          </h1>
          <p className="text-base sm:text-lg text-slate-600 mb-6">
            Update preferences, grade level, and interests for personalized support.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                disabled={isSaving}
              />
            </div>

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
                    onClick={() => {
                      setBand(value as 'high' | 'middle')
                      setGrade('')
                    }}
                    disabled={isSaving}
                    className={`
                      p-4 rounded-xl border-2 transition-all duration-200
                      ${band === value
                        ? 'border-teal-500 bg-teal-50 shadow-md'
                        : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                      }
                      ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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
                  disabled={isSaving}
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
                disabled={isSaving}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/profiles')}
                disabled={isSaving}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !band || !displayName.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-700 to-teal-600 text-white rounded-xl font-bold hover:from-teal-800 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-500/30 hover:shadow-lg hover:shadow-teal-500/40"
              >
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

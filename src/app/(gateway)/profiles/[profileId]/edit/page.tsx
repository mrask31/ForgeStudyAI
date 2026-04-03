'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { GraduationCap, BookOpen, ChevronLeft } from 'lucide-react'
import { getStudentProfile, updateStudentProfile, type StudentProfile } from '@/app/actions/student-profiles'
export default function EditProfilePage() {
  const router = useRouter()
  const params = useParams()
  const profileId = params.profileId as string

  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [band, setBand] = useState<'high' | 'middle' | null>(null)
  const [grade, setGrade] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = getSupabaseBrowser()
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
        setTags(
          studentProfile.interests
            ? studentProfile.interests.split(',').map((t: string) => t.trim()).filter(Boolean)
            : []
        )
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
        interests: tags.length > 0 ? tags.join(', ') : null,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Profile not found.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation Header */}
      <div className="sticky top-0 bg-slate-950/80 backdrop-blur border-b border-white/5 px-6 py-4 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link 
            href="/app" 
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="text-white font-semibold text-lg">
            ForgeStudy
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-8 sm:p-10 shadow-xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-2">
            Edit student profile
          </h1>
          <p className="text-base sm:text-lg text-slate-400 mb-6">
            Update preferences, grade level, and interests for personalized support.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="displayName" className="block text-sm font-semibold text-slate-200 mb-2">
                Student name / nickname *
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter student name or nickname"
                required
                className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-100 placeholder-slate-500"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-3">
                Grade level *
              </label>
              <p className="text-xs text-slate-400 mb-3">
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
                    onClick={() => {
                      setBand(value as 'high' | 'middle')
                      setGrade('')
                    }}
                    disabled={isSaving}
                    className={`
                      p-4 rounded-xl border-2 transition-all duration-200
                      ${band === value
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/20'
                        : 'border-slate-700 hover:border-indigo-400 hover:bg-slate-800/60'
                      }
                      ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${band === value ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className={`text-sm font-semibold block ${band === value ? 'text-indigo-300' : 'text-slate-300'}`}>
                      {label}
                    </span>
                    <span className={`text-xs mt-0.5 block ${band === value ? 'text-indigo-400' : 'text-slate-500'}`}>
                      {sublabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {band && (
              <div>
                <label htmlFor="grade" className="block text-sm font-semibold text-slate-200 mb-2">
                  Specific grade (optional)
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Helps us personalize explanations and examples
                </p>
                <select
                  id="grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-100"
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
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                What are you into? (optional)
              </label>
              <p className="text-xs text-slate-400 mb-3">
                Helps your tutor explain things in ways that click for you
              </p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/40 rounded-full text-sm text-indigo-300"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter((t) => t !== tag))}
                        disabled={isSaving}
                        className="ml-1 text-indigo-400 hover:text-indigo-200 transition-colors leading-none"
                        aria-label={`Remove ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {tags.length < 5 && (
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      const trimmed = tagInput.replace(/,/g, '').trim()
                      if (trimmed && tags.length < 5 && !tags.includes(trimmed)) {
                        setTags([...tags, trimmed])
                      }
                      setTagInput('')
                    }
                  }}
                  placeholder={tags.length === 0 ? 'e.g. soccer, Minecraft, music, drawing, cooking' : 'Add another...'}
                  className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-100 placeholder-slate-500"
                  disabled={isSaving}
                />
              )}
              <p className="text-xs text-slate-500 mt-2">
                Press Enter or comma to add &bull; {5 - tags.length} of 5 remaining
              </p>
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-xl p-4">
                <p className="text-sm font-medium text-red-300">{error}</p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/profiles')}
                disabled={isSaving}
                className="flex-1 px-6 py-3 border-2 border-slate-700 text-slate-300 rounded-xl font-semibold hover:bg-slate-800/60 hover:border-slate-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !band || !displayName.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40"
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

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { getStudentProfiles, type StudentProfile, deleteStudentProfile } from '@/app/actions/student-profiles'
import { GraduationCap, BookOpen, Sparkles, Trash2, Plus, User, Lock } from 'lucide-react'
import Link from 'next/link'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { verifyStudentProfilePin } from '@/app/actions/pins'

function ProfilesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profiles, setProfiles] = useState<StudentProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pinPromptProfile, setPinPromptProfile] = useState<StudentProfile | null>(null)
  const [pinValue, setPinValue] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [isVerifyingPin, setIsVerifyingPin] = useState(false)
  const [planType, setPlanType] = useState<'none' | 'individual' | 'family'>('none')
  const { setActiveProfileId } = useActiveProfile()

  const getBandRoute = (band: StudentProfile['grade_band']) => {
    switch (band) {
      case 'elementary':
        return '/app/elementary'
      case 'middle':
        return '/app/middle'
      case 'high':
        return '/app/high'
      default:
        return '/profiles'
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }

        const studentProfiles = await getStudentProfiles()
        setProfiles(studentProfiles)

        try {
          const subRes = await fetch('/api/stripe/subscription', { credentials: 'include' })
          if (subRes.ok) {
            const subData = await subRes.json()
            setPlanType(subData.planType || 'individual')
          }
        } catch (error) {
          console.error('[Profiles Page] Error loading plan type:', error)
        }

      } catch (error) {
        console.error('[Profiles Page] Error loading profiles:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleProfileClick = (profile: StudentProfile) => {
    if (profile.has_pin) {
      setPinPromptProfile(profile)
      setPinValue('')
      setPinError(null)
      return
    }

    setActiveProfileId(profile.id)
    router.push(getBandRoute(profile.grade_band))
  }

  const handleDeleteProfile = async (profileId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
      return
    }

    try {
      await deleteStudentProfile(profileId)
      // Remove from local state
      setProfiles(profiles.filter(p => p.id !== profileId))
      
      // If no profiles left, redirect to create
      if (profiles.length === 1) {
        router.push('/profiles/new')
      }
    } catch (error) {
      console.error('[Profiles Page] Error deleting profile:', error)
      alert('Failed to delete profile. Please try again.')
    }
  }

  const getGradeBandIcon = (band: string) => {
    switch (band) {
      case 'high':
        return GraduationCap
      case 'middle':
        return BookOpen
      case 'elementary':
        return Sparkles
      default:
        return User
    }
  }

  const getGradeBandLabel = (band: string) => {
    switch (band) {
      case 'high':
        return 'High School'
      case 'middle':
        return 'Middle School'
      case 'elementary':
        return 'Elementary'
      default:
        return band
    }
  }

  const getAvatarInitials = (displayName: string) => {
    const parts = displayName.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return displayName.substring(0, 2).toUpperCase()
  }

  useEffect(() => {
    if (!profiles.length) return
    const shouldAuto = searchParams.get('auto') === '1'
    if (!shouldAuto) return

    if (profiles.length === 1) {
      const onlyProfile = profiles[0]
      if (onlyProfile.has_pin) {
        setPinPromptProfile(onlyProfile)
      } else {
        setActiveProfileId(onlyProfile.id)
        router.replace(getBandRoute(onlyProfile.grade_band))
      }
    }
  }, [profiles, searchParams, router, setActiveProfileId])

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pinPromptProfile) return

    setPinError(null)
    setIsVerifyingPin(true)
    try {
      const result = await verifyStudentProfilePin(pinPromptProfile.id, pinValue)
      if (!result.valid) {
        setPinError('Incorrect PIN. Try again.')
        return
      }
      setActiveProfileId(pinPromptProfile.id)
      router.push(getBandRoute(pinPromptProfile.grade_band))
      setPinPromptProfile(null)
      setPinValue('')
    } catch (error) {
      console.error('[Profiles Page] PIN verification failed:', error)
      setPinError('Failed to verify PIN. Please try again.')
    } finally {
      setIsVerifyingPin(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent"></div>
          </div>
          <p className="text-lg font-medium text-slate-600">Loading profiles...</p>
        </div>
      </div>
    )
  }

  if (!profiles.length) {
    return (
      <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-8 sm:p-10 shadow-lg">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Plus className="w-8 h-8 text-teal-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              Create your first student profile
            </h1>
            <p className="text-base sm:text-lg text-slate-600 mb-6">
              Set up a profile to personalize learning support by grade band.
            </p>
            <Link
              href="/profiles/new"
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-teal-700 to-teal-600 text-white rounded-xl font-semibold hover:from-teal-800 hover:to-teal-700 transition-colors shadow-md"
            >
              Create student profile
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-4 sm:mb-6">
            Who's studying?
          </h1>
          <p className="text-lg sm:text-xl text-slate-700 max-w-2xl mx-auto mb-2">
            Select a student profile to continue
          </p>
          <p className="text-sm text-slate-500 max-w-2xl mx-auto">
            Each student gets personalized step-by-step support for Grades 3–12
          </p>
        </div>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-6xl mx-auto mb-8">
          {/* Existing Profiles */}
          {profiles.map((profile) => {
            const Icon = getGradeBandIcon(profile.grade_band)
            const initials = getAvatarInitials(profile.display_name)
            
            return (
              <div
                key={profile.id}
                className="group relative bg-white/80 backdrop-blur-sm border-2 border-slate-200/60 rounded-2xl p-8 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-teal-200/30 transition-all duration-300 transform hover:scale-[1.02] hover:border-teal-300 cursor-pointer"
                onClick={() => handleProfileClick(profile)}
              >
                {/* Delete Button */}
                {profiles.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteProfile(profile.id, e)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 z-10"
                    title="Delete profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <div className="w-20 h-20 bg-gradient-to-br from-teal-700 to-teal-600 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow text-white text-2xl font-bold">
                    {initials}
                  </div>
                  
                  {/* Icon Badge */}
                  <div className="absolute top-12 right-12 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                    <Icon className="w-4 h-4 text-teal-600" />
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 mb-1">{profile.display_name}</h2>
                  <p className="text-sm text-slate-600 mb-2">{getGradeBandLabel(profile.grade_band)}</p>
                  {profile.grade && (
                    <p className="text-xs text-slate-500">Grade {profile.grade}</p>
                  )}
                  {profile.has_pin && (
                    <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      <Lock className="w-3 h-3" />
                      PIN protected
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add Profile Card */}
          {profiles.length < 1 && (
            <Link
              href="/profiles/new"
              className="group bg-white/40 backdrop-blur-sm border-2 border-dashed border-slate-300/60 rounded-2xl p-8 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-teal-200/30 transition-all duration-300 transform hover:scale-[1.02] hover:border-teal-400 hover:bg-white/60"
            >
              <div className="flex flex-col items-center text-center h-full justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow group-hover:from-teal-200 group-hover:to-cyan-200">
                  <Plus className="w-10 h-10 text-teal-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Add Profile</h2>
                <p className="text-sm text-slate-600">Create a new student profile</p>
                <p className="text-xs text-slate-500 mt-1">Grades 3–12</p>
              </div>
            </Link>
          )}
        </div>

        {profiles.length >= 1 && (
          <div className="max-w-2xl mx-auto text-center mb-8">
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 shadow-sm">
              <p className="text-sm text-slate-600">
                Need to add or manage student profiles? Use the Parent Dashboard.
              </p>
              <Link
                href="/parent"
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
              >
                Go to Parent Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Max Profiles Message */}
        {profiles.length >= 4 && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <p className="text-sm font-medium text-amber-800">
                You've reached the maximum of 4 profiles. Family plan supports up to 4 student profiles for Grades 3–12.
              </p>
            </div>
          </div>
        )}
      </div>
      {pinPromptProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Enter PIN</h2>
            <p className="text-sm text-slate-600 mb-4">
              This profile is PIN-protected. Enter the 4-digit PIN to continue.
            </p>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value)}
                maxLength={4}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-lg tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="••••"
              />
              {pinError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {pinError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPinPromptProfile(null)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={isVerifyingPin}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                  disabled={isVerifyingPin || pinValue.length !== 4}
                >
                  {isVerifyingPin ? 'Checking...' : 'Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent"></div>
            </div>
            <p className="text-lg font-medium text-slate-600">Loading profiles...</p>
          </div>
        </div>
      }
    >
      <ProfilesPageContent />
    </Suspense>
  )
}

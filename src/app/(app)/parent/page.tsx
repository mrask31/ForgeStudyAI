'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Shield, Lock, CreditCard, Users, CheckCircle, XCircle } from 'lucide-react'
import {
  getParentPinStatus,
  setParentPin,
  verifyParentPin,
  clearParentPin,
  setStudentProfilePin,
  clearStudentProfilePin,
} from '@/app/actions/pins'
import { getStudentProfiles, type StudentProfile } from '@/app/actions/student-profiles'

type SubscriptionData = {
  subscription: {
    id: string
    status: string
    trialEndDate: string | null
    cancelAtPeriodEnd: boolean
  } | null
  status: string
}

const PIN_UNLOCK_KEY = 'parent_pin_unlocked'
const PIN_UNLOCK_TTL_MS = 30 * 60 * 1000

export default function ParentDashboardPage() {
  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [pinValue, setPinValue] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [isPinBusy, setIsPinBusy] = useState(false)
  const [profiles, setProfiles] = useState<StudentProfile[]>([])
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [isCanceling, setIsCanceling] = useState(false)
  const [pinTarget, setPinTarget] = useState<StudentProfile | null>(null)
  const [studentPinValue, setStudentPinValue] = useState('')
  const [studentPinError, setStudentPinError] = useState<string | null>(null)
  const [isStudentPinBusy, setIsStudentPinBusy] = useState(false)

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await getParentPinStatus()
        setHasPin(status.hasPin)

        const stored = sessionStorage.getItem(PIN_UNLOCK_KEY)
        if (stored && status.hasPin) {
          const parsed = JSON.parse(stored) as { timestamp: number }
          if (Date.now() - parsed.timestamp < PIN_UNLOCK_TTL_MS) {
            setIsUnlocked(true)
          } else {
            sessionStorage.removeItem(PIN_UNLOCK_KEY)
          }
        }
      } catch (error) {
        console.error('[Parent Dashboard] Failed to load PIN status:', error)
        setHasPin(false)
      }
    }

    loadStatus()
  }, [])

  useEffect(() => {
    if (!isUnlocked) return

    const loadProfiles = async () => {
      try {
        const studentProfiles = await getStudentProfiles()
        setProfiles(studentProfiles)
      } catch (error) {
        console.error('[Parent Dashboard] Failed to load profiles:', error)
      }
    }

    const loadSubscription = async () => {
      try {
        const res = await fetch('/api/stripe/subscription', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setSubscriptionData(data)
        }
      } catch (error) {
        console.error('[Parent Dashboard] Failed to load subscription:', error)
      }
    }

    loadProfiles()
    loadSubscription()
  }, [isUnlocked])

  const unlockSession = () => {
    setIsUnlocked(true)
    sessionStorage.setItem(PIN_UNLOCK_KEY, JSON.stringify({ timestamp: Date.now() }))
  }

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError(null)
    setIsPinBusy(true)
    try {
      await setParentPin(pinValue)
      setHasPin(true)
      setPinValue('')
      unlockSession()
    } catch (error: any) {
      console.error('[Parent Dashboard] Failed to set PIN:', error)
      setPinError(error.message || 'Failed to set PIN.')
    } finally {
      setIsPinBusy(false)
    }
  }

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError(null)
    setIsPinBusy(true)
    try {
      const result = await verifyParentPin(pinValue)
      if (!result.valid) {
        setPinError('Incorrect PIN. Try again.')
        return
      }
      setPinValue('')
      unlockSession()
    } catch (error: any) {
      console.error('[Parent Dashboard] Failed to verify PIN:', error)
      setPinError(error.message || 'Failed to verify PIN.')
    } finally {
      setIsPinBusy(false)
    }
  }

  const handleResetParentPin = async () => {
    if (!confirm('Reset parent PIN? You will need to set a new PIN.')) {
      return
    }
    setIsPinBusy(true)
    try {
      await clearParentPin()
      setHasPin(false)
      setIsUnlocked(false)
      sessionStorage.removeItem(PIN_UNLOCK_KEY)
    } catch (error) {
      console.error('[Parent Dashboard] Failed to clear PIN:', error)
    } finally {
      setIsPinBusy(false)
    }
  }

  const handleStudentPinSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pinTarget) return

    setStudentPinError(null)
    setIsStudentPinBusy(true)
    try {
      await setStudentProfilePin(pinTarget.id, studentPinValue)
      const updated = await getStudentProfiles()
      setProfiles(updated)
      setPinTarget(null)
      setStudentPinValue('')
    } catch (error: any) {
      console.error('[Parent Dashboard] Failed to set student PIN:', error)
      setStudentPinError(error.message || 'Failed to set student PIN.')
    } finally {
      setIsStudentPinBusy(false)
    }
  }

  const handleClearStudentPin = async (profileId: string) => {
    if (!confirm('Remove PIN for this profile?')) return

    setIsStudentPinBusy(true)
    try {
      await clearStudentProfilePin(profileId)
      const updated = await getStudentProfiles()
      setProfiles(updated)
    } catch (error) {
      console.error('[Parent Dashboard] Failed to clear student PIN:', error)
    } finally {
      setIsStudentPinBusy(false)
    }
  }

  const subscriptionLabel = useMemo(() => {
    if (!subscriptionData?.subscription) return 'Free Preview'
    if (subscriptionData.subscription.status === 'trialing') return '7-Day Free Trial'
    if (subscriptionData.subscription.status === 'active') return 'Active'
    if (subscriptionData.subscription.status === 'canceled') return 'Canceled'
    return subscriptionData.status || 'Free Preview'
  }, [subscriptionData])

  if (hasPin === null) {
    return (
      <div className="h-full bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading parent access…</div>
      </div>
    )
  }

  if (!hasPin) {
    return (
      <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white/90 border border-slate-200/60 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Set parent PIN</h1>
                <p className="text-sm text-slate-600">Protect billing and profile management.</p>
              </div>
            </div>
            <form onSubmit={handleSetPin} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="••••"
              />
              {pinError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {pinError}
                </div>
              )}
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={isPinBusy || pinValue.length !== 4}
              >
                {isPinBusy ? 'Saving…' : 'Set PIN'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (!isUnlocked) {
    return (
      <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white/90 border border-slate-200/60 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Parent dashboard</h1>
                <p className="text-sm text-slate-600">Enter your PIN to continue.</p>
              </div>
            </div>
            <form onSubmit={handleVerifyPin} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="••••"
              />
              {pinError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {pinError}
                </div>
              )}
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={isPinBusy || pinValue.length !== 4}
              >
                {isPinBusy ? 'Checking…' : 'Unlock'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Parent dashboard</h1>
            <p className="text-sm sm:text-base text-slate-600">
              Manage subscriptions and student profiles in one secure place.
            </p>
          </div>
          <button
            onClick={handleResetParentPin}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            disabled={isPinBusy}
          >
            Reset parent PIN
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/60 bg-white/90 p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Subscription</h2>
            </div>
            <p className="text-sm text-slate-600 mb-2">Status</p>
            <div className="flex items-center gap-2">
              {subscriptionData?.subscription?.status === 'active' || subscriptionData?.subscription?.status === 'trialing' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-sm font-semibold text-slate-900">{subscriptionLabel}</span>
            </div>
            {subscriptionData?.subscription?.trialEndDate && (
              <p className="text-xs text-emerald-700 mt-2">
                Trial ends {subscriptionData.subscription.trialEndDate}
              </p>
            )}
            {subscriptionData?.subscription?.cancelAtPeriodEnd && (
              <p className="text-xs text-amber-700 mt-2">
                Subscription will cancel at end of billing period.
              </p>
            )}
            {subscriptionData?.subscription &&
              subscriptionData.subscription.status !== 'canceled' &&
              !subscriptionData.subscription.cancelAtPeriodEnd && (
                <button
                  onClick={async () => {
                    if (!confirm('Cancel subscription at period end?')) return
                    setIsCanceling(true)
                    try {
                      const res = await fetch('/api/stripe/cancel-subscription', {
                        method: 'POST',
                        credentials: 'include',
                      })
                      if (!res.ok) {
                        const error = await res.json()
                        throw new Error(error.error || 'Failed to cancel subscription')
                      }
                      const subRes = await fetch('/api/stripe/subscription', { credentials: 'include' })
                      if (subRes.ok) {
                        const data = await subRes.json()
                        setSubscriptionData(data)
                      }
                    } catch (error) {
                      console.error('[Parent Dashboard] Failed to cancel subscription:', error)
                    } finally {
                      setIsCanceling(false)
                    }
                  }}
                  className="mt-4 inline-flex items-center justify-center rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  disabled={isCanceling}
                >
                  {isCanceling ? 'Canceling…' : 'Cancel subscription'}
                </button>
              )}
          </div>

          <div className="rounded-2xl border border-slate-200/60 bg-white/90 p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Profiles</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Manage student details, interests, and PIN protection.
            </p>
            <div className="space-y-4">
              {profiles.map((profile) => (
                <div key={profile.id} className="rounded-xl border border-slate-200/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{profile.display_name}</p>
                      <p className="text-xs text-slate-600">{profile.grade_band} • {profile.grade || 'Grade not set'}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Interests: {profile.interests || 'None yet'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        PIN: {profile.has_pin ? 'Enabled' : 'Not set'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 text-right">
                      <Link
                        href={`/profiles/${profile.id}/edit`}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                      >
                        Edit profile
                      </Link>
                      <button
                        onClick={() => {
                          setPinTarget(profile)
                          setStudentPinValue('')
                          setStudentPinError(null)
                        }}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                      >
                        {profile.has_pin ? 'Reset PIN' : 'Set PIN'}
                      </button>
                      {profile.has_pin && (
                        <button
                          onClick={() => handleClearStudentPin(profile.id)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                        >
                          Remove PIN
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {profiles.length === 0 && (
                <div className="text-sm text-slate-600">No profiles found yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Weekly snapshot</h3>
          <p className="text-sm text-slate-600">
            Student activity snapshots will appear here after a few study sessions.
          </p>
        </div>
      </div>

      {pinTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              {pinTarget.has_pin ? 'Reset student PIN' : 'Set student PIN'}
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Enter a 4-digit PIN for {pinTarget.display_name}.
            </p>
            <form onSubmit={handleStudentPinSave} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={studentPinValue}
                onChange={(e) => setStudentPinValue(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-lg tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="••••"
              />
              {studentPinError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {studentPinError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPinTarget(null)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={isStudentPinBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  disabled={isStudentPinBusy || studentPinValue.length !== 4}
                >
                  {isStudentPinBusy ? 'Saving…' : 'Save PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

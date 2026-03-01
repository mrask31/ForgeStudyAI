'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Shield, Lock, CreditCard, Users, CheckCircle, XCircle, Plus } from 'lucide-react'
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
  planType?: string
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

// Weekly Summary Component (Feature C: Parent Actionables)
function WeeklySummary({ profiles }: { profiles: StudentProfile[] }) {
  const [insights, setInsights] = useState<Array<{ concept: string; sentence: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadInsights = async () => {
      if (profiles.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        // Load insights for all profiles
        const allInsights: Array<{ concept: string; sentence: string; profileName: string }> = [];

        for (const profile of profiles) {
          const res = await fetch(`/api/parent/weekly-summary?studentId=${profile.id}`, {
            credentials: 'include',
          });

          if (res.ok) {
            const data = await res.json();
            for (const insight of data.insights || []) {
              allInsights.push({
                ...insight,
                profileName: profile.display_name,
              });
            }
          }
        }

        setInsights(allInsights);
      } catch (error) {
        console.error('[Weekly Summary] Load error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInsights();
  }, [profiles]);

  const visibleInsights = insights.filter(
    (insight) => !dismissed.has(`${insight.concept}`)
  );

  if (isLoading) {
    return <p className="text-sm text-slate-400">Loading weekly summary...</p>;
  }

  if (visibleInsights.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No patterns to report this week.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {visibleInsights.map((insight, index) => (
        <div
          key={index}
          className="flex items-start justify-between gap-4 rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-3"
        >
          <p className="text-sm text-slate-300">{insight.sentence}</p>
          <button
            onClick={() => {
              const newDismissed = new Set(dismissed);
              newDismissed.add(insight.concept);
              setDismissed(newDismissed);
            }}
            className="text-xs text-slate-500 hover:text-slate-300 flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}

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

  const loadProfiles = async () => {
    try {
      const studentProfiles = await getStudentProfiles()
      setProfiles(studentProfiles)
    } catch (error) {
      console.error('[Parent Dashboard] Failed to load profiles:', error)
    }
  }

  useEffect(() => {
    if (!isUnlocked) return
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

  const isCancelable = useMemo(() => {
    const status = subscriptionData?.subscription?.status || subscriptionData?.status
    if (!status) return false
    if (status === 'canceled') return false
    if (subscriptionData?.subscription?.cancelAtPeriodEnd) return false
    return ['trialing', 'active', 'past_due', 'incomplete'].includes(status)
  }, [subscriptionData])

  const canAddProfile = useMemo(() => {
    if (!subscriptionData) return false
    return subscriptionData.planType === 'family' && profiles.length < 4
  }, [subscriptionData, profiles.length])

  if (hasPin === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading parent access…</div>
      </div>
    )
  }

  if (!hasPin) {
    return (
      <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-900/50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-100">Set parent PIN</h1>
                <p className="text-sm text-slate-400">Protect billing and profile management.</p>
              </div>
            </div>
            <form onSubmit={handleSetPin} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-lg tracking-[0.3em] text-center text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="••••"
              />
              {pinError && (
                <div className="rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-400">
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
      <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-900/50 flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-100">Parent dashboard</h1>
                <p className="text-sm text-slate-400">Enter your PIN to continue.</p>
              </div>
            </div>
            <form onSubmit={handleVerifyPin} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-lg tracking-[0.3em] text-center text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="••••"
              />
              {pinError && (
                <div className="rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-400">
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
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-100">Parent dashboard</h1>
            <p className="text-sm sm:text-base text-slate-400">
              Manage subscriptions and student profiles in one secure place.
            </p>
          </div>
          <button
            onClick={handleResetParentPin}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200"
            disabled={isPinBusy}
          >
            Reset parent PIN
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-slate-100">Subscription</h2>
            </div>
            <p className="text-sm text-slate-400 mb-2">Status</p>
            <div className="flex items-center gap-2">
              {subscriptionData?.subscription?.status === 'active' || subscriptionData?.subscription?.status === 'trialing' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-slate-500" />
              )}
              <span className="text-sm font-semibold text-slate-100">{subscriptionLabel}</span>
            </div>
            <button
              onClick={loadSubscription}
              className="mt-3 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              disabled={isCanceling}
            >
              Refresh status
            </button>
            {subscriptionData?.subscription?.trialEndDate && (
              <p className="text-xs text-emerald-400 mt-2">
                Trial ends {subscriptionData.subscription.trialEndDate}
              </p>
            )}
            {subscriptionData?.subscription?.cancelAtPeriodEnd && (
              <p className="text-xs text-amber-400 mt-2">
                Subscription will cancel at end of billing period.
              </p>
            )}
            {isCancelable && (
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
                className="mt-4 inline-flex items-center justify-center rounded-xl border border-rose-800 bg-rose-950/30 px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/50"
                disabled={isCanceling}
              >
                {isCanceling ? 'Canceling…' : 'Cancel subscription'}
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-slate-100">Profiles</h2>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Manage student details, interests, and PIN protection.
            </p>
            <div className="mb-4">
              {canAddProfile ? (
                <Link
                  href="/profiles/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add student profile
                </Link>
              ) : (
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-2 text-xs text-slate-400">
                  {subscriptionData?.planType === 'family'
                    ? 'Family plan limit reached. Remove a profile to add another.'
                    : 'Upgrade to the Family plan to add more profiles.'}
                </div>
              )}
            </div>
            <div className="space-y-4">
              {profiles.map((profile) => (
                <div key={profile.id} className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{profile.display_name}</p>
                      <p className="text-xs text-slate-400">{profile.grade_band} • {profile.grade || 'Grade not set'}</p>
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
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                      >
                        Edit profile
                      </Link>
                      <button
                        onClick={() => {
                          setPinTarget(profile)
                          setStudentPinValue('')
                          setStudentPinError(null)
                        }}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-200"
                      >
                        {profile.has_pin ? 'Reset PIN' : 'Set PIN'}
                      </button>
                      {profile.has_pin && (
                        <button
                          onClick={() => handleClearStudentPin(profile.id)}
                          className="text-xs font-semibold text-rose-400 hover:text-rose-300"
                        >
                          Remove PIN
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {profiles.length === 0 && (
                <div className="text-sm text-slate-400">No profiles found yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-slate-100 mb-2">This Week</h3>
          <WeeklySummary profiles={profiles} />
        </div>
      </div>

      {pinTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-100 mb-2">
              {pinTarget.has_pin ? 'Reset student PIN' : 'Set student PIN'}
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Enter a 4-digit PIN for {pinTarget.display_name}.
            </p>
            <form onSubmit={handleStudentPinSave} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={studentPinValue}
                onChange={(e) => setStudentPinValue(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-2 text-lg tracking-[0.3em] text-center text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="••••"
              />
              {studentPinError && (
                <div className="rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-400">
                  {studentPinError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPinTarget(null)}
                  className="flex-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800/50"
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

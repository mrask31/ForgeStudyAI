'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Shield, Lock, CreditCard, Users, CheckCircle, XCircle, Plus, Gift, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserClient } from '@supabase/ssr'
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
  trialEndsAt?: string | null // From profiles table
  trialDaysLeft?: number
}

const PIN_UNLOCK_KEY = 'parent_pin_unlocked'
const PIN_UNLOCK_TTL_MS = 30 * 60 * 1000

// Helper function to format grade band display
function formatGradeBand(gradeBand: string): string {
  switch (gradeBand) {
    case 'middle':
      return 'Middle School'
    case 'high':
      return 'High School'
    case 'elementary':
      return 'Elementary'
    default:
      return gradeBand
  }
}

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

// Referral Button Component
function ReferralButton() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    async function loadCode() {
      try {
        const res = await fetch('/api/stripe/subscription');
        if (res.ok) {
          // We need to get the referral code from the profile
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('referral_code')
              .eq('id', user.id)
              .single();
            setCode(profile?.referral_code || null);
          }
        }
      } catch {
        // Non-critical
      }
    }
    loadCode();
  }, []);

  const handleCopy = () => {
    if (!code) return;
    const url = `${window.location.origin}/signup?ref=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Referral link copied!');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  if (!code) return null;

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
    >
      <Gift className="w-4 h-4" />
      Copy Referral Link
      <Copy className="w-3.5 h-3.5" />
    </button>
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
  const [todaySummaries, setTodaySummaries] = useState<any[]>([])

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await getParentPinStatus()
        setHasPin(status.hasPin)
        // PIN auth state is intentionally NOT restored from sessionStorage
        // User must re-enter PIN every time they visit /parent
      } catch (error) {
        console.error('[Parent Dashboard] Failed to load PIN status:', error)
        setHasPin(false)
      }
    }

    loadStatus()

    // Cleanup: Clear PIN unlock state when component unmounts (user navigates away)
    return () => {
      sessionStorage.removeItem(PIN_UNLOCK_KEY)
    }
  }, [])

  const loadSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/subscription', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSubscriptionData(data)
      }
      
      // Also fetch trial/beta data
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Check beta_access table first
        const { data: betaAccess } = await supabase
          .from('beta_access')
          .select('is_beta, beta_expires_at, trial_expires_at')
          .eq('user_id', user.id)
          .single()

        if (betaAccess?.is_beta && betaAccess.beta_expires_at) {
          const expiresAt = new Date(betaAccess.beta_expires_at)
          const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          setSubscriptionData(prev => ({
            ...prev,
            trialEndsAt: betaAccess.beta_expires_at,
            trialDaysLeft: Math.max(0, daysLeft),
            status: 'beta',
            subscription: prev?.subscription || null,
            planType: prev?.planType
          }))
        } else if (betaAccess?.trial_expires_at) {
          const expiresAt = new Date(betaAccess.trial_expires_at)
          const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          setSubscriptionData(prev => ({
            ...prev,
            trialEndsAt: betaAccess.trial_expires_at,
            trialDaysLeft: Math.max(0, daysLeft),
            status: 'trialing',
            subscription: prev?.subscription || null,
            planType: prev?.planType
          }))
        } else {
          // Fall back to profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('trial_ends_at, subscription_status')
            .eq('id', user.id)
            .single()

          if (profile?.trial_ends_at) {
            const trialEnd = new Date(profile.trial_ends_at)
            const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            setSubscriptionData(prev => ({
              ...prev,
              trialEndsAt: profile.trial_ends_at,
              trialDaysLeft: Math.max(0, daysLeft),
              status: profile.subscription_status || prev?.status || 'none',
              subscription: prev?.subscription || null,
              planType: prev?.planType
            }))
          }
        }
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

    // Load today's session summaries
    fetch('/api/sessions/summary', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { summaries: [] })
      .then(d => setTodaySummaries(d.summaries || []))
      .catch(() => {})
  }, [isUnlocked])

  const unlockSession = () => {
    setIsUnlocked(true)
    // Note: sessionStorage is used only for within-session state, cleared on unmount
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
    // Beta member
    if (subscriptionData?.status === 'beta') {
      const daysLeft = subscriptionData.trialDaysLeft ?? 0
      return daysLeft > 0
        ? `🎓 Beta Member — ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining — Free`
        : 'Beta Expired'
    }

    // Trial user
    if (subscriptionData?.trialEndsAt && subscriptionData?.status === 'trialing') {
      const daysLeft = subscriptionData.trialDaysLeft ?? 0
      return daysLeft > 0
        ? `Free Trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`
        : 'Trial Expired'
    }

    // Stripe subscription
    if (!subscriptionData?.subscription) return 'Free Preview'
    if (subscriptionData.subscription.status === 'active') return 'Active'
    if (subscriptionData.subscription.status === 'trialing') return '7-Day Free Trial'
    if (subscriptionData.subscription.status === 'canceled') return 'Canceled'
    return subscriptionData.status || 'Free Preview'
  }, [subscriptionData])

  const isBeta = useMemo(() => {
    return subscriptionData?.status === 'beta' &&
           subscriptionData?.trialEndsAt &&
           new Date(subscriptionData.trialEndsAt) > new Date()
  }, [subscriptionData])

  const isTrialing = useMemo(() => {
    return (subscriptionData?.status === 'trialing' || subscriptionData?.status === 'beta') &&
           subscriptionData?.trialEndsAt &&
           new Date(subscriptionData.trialEndsAt) > new Date()
  }, [subscriptionData])

  const trialDaysLeft = useMemo(() => {
    return subscriptionData?.trialDaysLeft ?? 0
  }, [subscriptionData])

  const isCancelable = useMemo(() => {
    const status = subscriptionData?.subscription?.status || subscriptionData?.status
    if (!status) return false
    if (status === 'canceled') return false
    if (subscriptionData?.subscription?.cancelAtPeriodEnd) return false
    return ['trialing', 'active', 'past_due', 'incomplete'].includes(status)
  }, [subscriptionData])

  const canAddProfile = useMemo(() => {
    // Trial users can add up to 2 profiles
    if (isTrialing) {
      return profiles.length < 2
    }
    
    // Individual plan users can add 1 profile
    if (subscriptionData?.planType === 'individual') {
      return profiles.length < 1
    }
    
    // Family plan users can add up to 4 profiles
    if (subscriptionData?.planType === 'family') {
      return profiles.length < 4
    }
    
    // No subscription or expired - cannot add profiles
    return false
  }, [subscriptionData, profiles.length, isTrialing])

  const profileLimitMessage = useMemo(() => {
    if (isTrialing && profiles.length >= 2) {
      return 'Trial limit reached (2 profiles). Upgrade to add more.'
    }
    if (subscriptionData?.planType === 'individual' && profiles.length >= 1) {
      return 'Individual plan limit reached. Upgrade to Family plan for up to 4 profiles.'
    }
    if (subscriptionData?.planType === 'family' && profiles.length >= 4) {
      return 'Family plan limit reached. Remove a profile to add another.'
    }
    return 'Upgrade to add student profiles.'
  }, [subscriptionData, profiles.length, isTrialing])

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
              <div className="w-10 h-10 rounded-2xl bg-indigo-900/50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-400" />
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-lg tracking-[0.3em] text-center text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••"
              />
              {pinError && (
                <div className="rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-400">
                  {pinError}
                </div>
              )}
              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
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
              <div className="w-10 h-10 rounded-2xl bg-indigo-900/50 flex items-center justify-center">
                <Lock className="w-5 h-5 text-indigo-400" />
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-lg tracking-[0.3em] text-center text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••"
              />
              {pinError && (
                <div className="rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-400">
                  {pinError}
                </div>
              )}
              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
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
        {/* Navigation Header */}
        <div className="mb-6">
          <Link
            href="/profiles"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Return to Student View
          </Link>
        </div>

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

        {/* Today's Activity */}
        <div className="mb-6 rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">📖 Today's Activity</h2>
          {todaySummaries.length > 0 ? (
            <div className="space-y-3">
              {todaySummaries.map((s: any) => (
                <div key={s.id} className="p-3 bg-slate-800/40 rounded-xl">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <span className="font-medium text-indigo-400">{s.className}</span>
                    <span>·</span>
                    <span>{new Date(s.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                    {s.durationMinutes && <><span>·</span><span>{s.durationMinutes} min</span></>}
                  </div>
                  <p className="text-sm text-slate-300">{s.summary}</p>
                  {s.masteryBefore != null && s.masteryAfter != null && (
                    <p className="text-xs text-slate-500 mt-1">
                      Mastery: {s.masteryBefore} → {s.masteryAfter} {s.masteryAfter > s.masteryBefore ? '↑' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No study sessions yet today.</p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-100">Subscription</h2>
            </div>
            <p className="text-sm text-slate-400 mb-2">Status</p>
            <div className="flex items-center gap-2 mb-3">
              {subscriptionData?.subscription?.status === 'active' || subscriptionData?.subscription?.status === 'trialing' || isTrialing ? (
                <CheckCircle className="w-4 h-4 text-indigo-400" />
              ) : (
                <XCircle className="w-4 h-4 text-slate-500" />
              )}
              <span className={`text-sm font-semibold ${
                isTrialing && trialDaysLeft <= 3 ? 'text-amber-400' : 'text-slate-100'
              }`}>
                {subscriptionLabel}
              </span>
            </div>
            <div className="space-y-2">
              <button
                onClick={loadSubscription}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 block"
                disabled={isCanceling}
              >
                Refresh status
              </button>
              {isTrialing && !isBeta && (
                <Link
                  href="/checkout"
                  className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition-colors"
                >
                  Upgrade to keep your Galaxy →
                </Link>
              )}
              {isBeta && (
                <Link
                  href="/checkout"
                  className="w-full inline-flex items-center justify-center rounded-lg border border-slate-700 hover:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors"
                >
                  View subscription plans
                </Link>
              )}
              {subscriptionData?.subscription?.trialEndDate && !isTrialing && (
                <p className="text-xs text-slate-400">
                  Trial ends {subscriptionData.subscription.trialEndDate}
                </p>
              )}
              {subscriptionData?.subscription?.cancelAtPeriodEnd && (
                <p className="text-xs text-amber-400">
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
                  className="w-full inline-flex items-center justify-center rounded-xl bg-transparent border border-red-500/50 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                  disabled={isCanceling}
                >
                  {isCanceling ? 'Canceling…' : 'Cancel subscription'}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-100">Profiles</h2>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Manage student details, interests, and PIN protection.
            </p>
            <div className="mb-4">
              {canAddProfile ? (
                <Link
                  href="/profiles/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add student profile
                </Link>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-2 text-xs text-slate-400">
                    {profileLimitMessage}
                  </div>
                  {!isTrialing && subscriptionData?.planType !== 'family' && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/stripe/customer-portal', {
                            method: 'POST',
                            credentials: 'include',
                          })
                          const data = await res.json()
                          if (!res.ok) {
                            console.error('[Parent Dashboard] Portal error:', data)
                            toast.error(data.error || 'Failed to open billing portal')
                            return
                          }
                          if (data.url) {
                            window.location.href = data.url
                          } else {
                            toast.error('No redirect URL returned from billing portal')
                          }
                        } catch (error: any) {
                          console.error('[Parent Dashboard] Failed to open customer portal:', error)
                          toast.error('Failed to connect to billing. Please try again.')
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      Upgrade Plan
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-4">
              {profiles.map((profile) => (
                <div key={profile.id} className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{profile.display_name}</p>
                      <p className="text-xs text-slate-400">
                        {formatGradeBand(profile.grade_band)} • {profile.grade || 'Grade not set'}
                      </p>
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
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        Edit profile
                      </Link>
                      <button
                        onClick={() => {
                          setPinTarget(profile)
                          setStudentPinValue('')
                          setStudentPinError(null)
                        }}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
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

        {/* Referral Card */}
        <div className="mt-8 rounded-2xl border border-indigo-800/50 bg-indigo-950/30 backdrop-blur-xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-slate-100 mb-2">Give a Friend 30 Free Days</h3>
          <p className="text-sm text-slate-400 mb-4">
            Share your referral link. When a friend signs up, they get a 30-day free trial instead of 7.
          </p>
          <ReferralButton />
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-2 text-lg tracking-[0.3em] text-center text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
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

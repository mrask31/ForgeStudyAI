'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Mail, LogOut, CreditCard, Layout, GraduationCap, Calendar, XCircle, CheckCircle } from 'lucide-react'
import { useDensity } from '@/contexts/DensityContext'
import { getDensityTokens } from '@/lib/density-tokens'

interface SubscriptionData {
  subscription: {
    id: string
    status: string
    trialEnd: number | null
    trialEndDate: string | null
    cancelAtPeriodEnd: boolean
    currentPeriodEnd: number
  } | null
  status: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [graduationDate, setGraduationDate] = useState<string>('')
  const [preferredName, setPreferredName] = useState<string>('')
  const [programTrack, setProgramTrack] = useState<string>('')
  const [schoolName, setSchoolName] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [isCanceling, setIsCanceling] = useState(false)
  const { density, setDensity } = useDensity()
  const tokens = getDensityTokens(density)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        // Load profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('graduation_date, preferred_name, program_track, school_name')
          .eq('id', user.id)
          .single()
        
        if (profile?.graduation_date) {
          // Format date for input (YYYY-MM-DD)
          const date = new Date(profile.graduation_date)
          const formatted = date.toISOString().split('T')[0]
          setGraduationDate(formatted)
        }
        
        if (profile?.preferred_name) {
          setPreferredName(profile.preferred_name)
        }
        
        if (profile?.program_track) {
          setProgramTrack(profile.program_track)
        }
        
        if (profile?.school_name) {
          setSchoolName(profile.school_name)
        }

        // Load subscription data
        try {
          const subRes = await fetch('/api/stripe/subscription', {
            credentials: 'include',
          })
          if (subRes.ok) {
            const subData = await subRes.json()
            setSubscriptionData(subData)
          }
        } catch (error) {
          console.error('Error loading subscription:', error)
        }
      }
      
      setLoading(false)
    }
    
    loadProfile()
  }, [])

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="h-full bg-clinical-bg flex items-center justify-center">
        <div className="text-clinical-text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50">
      <div className={`${tokens.containerMaxWidth || 'max-w-4xl'} mx-auto px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pt-safe-t`}>
        {/* Header - Enhanced */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <Layout className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent">
              Settings
            </h1>
          </div>
          <p className="text-sm sm:text-base text-slate-600 ml-11 sm:ml-14 max-w-2xl leading-relaxed">
            Manage your account and preferences.
          </p>
        </div>

        {/* Identity Section - New */}
        <div className={`bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 ${tokens.cardPadding || 'p-4 sm:p-6'} mb-4 sm:mb-6`}>
          <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-clinical-text-secondary flex-shrink-0" />
            <h2 className={`${tokens.subheading} font-semibold text-clinical-text-primary`}>
              Identity
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={`block ${tokens.smallText} text-clinical-text-secondary mb-2`}>
                Preferred Name
              </label>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="e.g., Michael R."
                className={`w-full px-4 py-2 border border-clinical-border rounded-lg ${tokens.bodyText} text-clinical-text-primary focus:outline-none focus:ring-2 focus:ring-clinical-primary`}
              />
            </div>
            <div>
              <label className={`block ${tokens.smallText} text-clinical-text-secondary mb-2`}>
                Program / Track
              </label>
              <select
                value={programTrack}
                onChange={(e) => setProgramTrack(e.target.value)}
                className={`w-full px-4 py-2 border border-clinical-border rounded-lg ${tokens.bodyText} text-clinical-text-primary focus:outline-none focus:ring-2 focus:ring-clinical-primary bg-white`}
              >
                <option value="">Select program...</option>
                <option value="RN Track">RN Track</option>
                <option value="ADN">ADN</option>
                <option value="BSN">BSN</option>
                <option value="LPN">LPN</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={`block ${tokens.smallText} text-clinical-text-secondary mb-2`}>
                School Name <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g., State University"
                className={`w-full px-4 py-2 border border-clinical-border rounded-lg ${tokens.bodyText} text-clinical-text-primary focus:outline-none focus:ring-2 focus:ring-clinical-primary`}
              />
            </div>
            <button
              onClick={async () => {
                if (!user) return
                setIsSaving(true)
                try {
                  const supabase = createBrowserClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                  )
                  
                  const { error } = await supabase
                    .from('profiles')
                    .upsert({
                      id: user.id,
                      preferred_name: preferredName || null,
                      program_track: programTrack || null,
                      school_name: schoolName || null,
                    })
                  
                  if (error) throw error
                  alert('Identity information saved!')
                } catch (error) {
                  console.error('Error saving identity:', error)
                  alert('Failed to save identity information. Please try again.')
                } finally {
                  setIsSaving(false)
                }
              }}
              disabled={isSaving}
              className={`w-full px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl ${tokens.smallText || 'text-sm'} font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40`}
            >
              {isSaving ? 'Saving...' : 'Save Identity'}
            </button>
          </div>
        </div>

        {/* Display Density Section - Enhanced */}
        <div className={`bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 ${tokens.cardPadding || 'p-4 sm:p-6'} mb-4 sm:mb-6`}>
          <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
            <Layout className="w-4 h-4 sm:w-5 sm:h-5 text-clinical-text-secondary flex-shrink-0" />
            <h2 className={`${tokens.subheading} font-semibold text-clinical-text-primary`}>
              Display Density
            </h2>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <p className={`${tokens.smallText} text-clinical-text-secondary mb-2 sm:mb-3`}>
                Choose how much space and text size you prefer. Comfort is larger and easier to read; Compact fits more on screen.
              </p>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setDensity('comfort')}
                  className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    density === 'comfort'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md shadow-indigo-500/30'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  } ${tokens.bodyText || 'text-sm'} font-semibold`}
                >
                  Comfort
                </button>
                <button
                  onClick={() => setDensity('compact')}
                  className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    density === 'compact'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md shadow-indigo-500/30'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  } ${tokens.bodyText || 'text-sm'} font-semibold`}
                >
                  Compact
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Goals Section - Enhanced */}
        <div className={`bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 ${tokens.cardPadding || 'p-4 sm:p-6'} mb-4 sm:mb-6`}>
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="w-5 h-5 text-clinical-text-secondary" />
            <h2 className={`${tokens.subheading} font-semibold text-clinical-text-primary`}>
              Academic Goals
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={`block ${tokens.smallText} text-clinical-text-secondary mb-2`}>
                Graduation Date
              </label>
              <div className="flex gap-3">
                <input
                  type="date"
                  value={graduationDate}
                  onChange={(e) => setGraduationDate(e.target.value)}
                  className={`flex-1 px-4 py-2 border border-clinical-border rounded-lg ${tokens.bodyText} text-clinical-text-primary focus:outline-none focus:ring-2 focus:ring-clinical-primary`}
                />
                <button
                  onClick={async () => {
                    if (!user) return
                    setIsSaving(true)
                    try {
                      const supabase = createBrowserClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                      )
                      
                      const { error } = await supabase
                        .from('profiles')
                        .upsert({
                          id: user.id,
                          graduation_date: graduationDate || null,
                          preferred_name: preferredName || null,
                          program_track: programTrack || null,
                          school_name: schoolName || null,
                        })
                      
                      if (error) throw error
                      alert('Graduation date saved!')
                    } catch (error) {
                      console.error('Error saving graduation date:', error)
                      alert('Failed to save graduation date. Please try again.')
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  disabled={isSaving}
                  className={`px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl ${tokens.smallText || 'text-sm'} font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40`}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <p className={`${tokens.smallText} text-clinical-text-secondary mt-2`}>
                Set your graduation date to see a countdown on your dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Account Section - Enhanced */}
        <div className={`bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 ${tokens.cardPadding || 'p-4 sm:p-6'} mb-4 sm:mb-6 mt-6 sm:mt-8`}>
          <h2 className={`${tokens.subheading} font-semibold text-clinical-text-primary mb-4`}>
            Account
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-clinical-text-secondary" />
              <div>
                <p className={`${tokens.smallText} text-clinical-text-secondary`}>Email</p>
                <p className={`${tokens.smallText} font-medium text-clinical-text-primary`}>
                  {user?.email || 'Not available'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-50 to-rose-50 text-red-600 border-2 border-red-200 rounded-xl ${tokens.smallText || 'text-sm'} font-semibold hover:from-red-100 hover:to-rose-100 hover:border-red-300 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md`}
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>

        {/* Subscription Section - Enhanced */}
        <div className={`bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 ${tokens.cardPadding || 'p-4 sm:p-6'} mb-4 sm:mb-6`}>
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-clinical-text-secondary" />
            <h2 className={`${tokens.subheading} font-semibold text-clinical-text-primary`}>
              Subscription
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className={`${tokens.smallText} text-clinical-text-secondary mb-1`}>Status</p>
              <div className="flex items-center gap-2">
                {subscriptionData?.subscription ? (
                  <>
                    {subscriptionData.subscription.status === 'trialing' ? (
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                    ) : subscriptionData.subscription.status === 'active' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <p className={`${tokens.smallText} font-medium text-clinical-text-primary capitalize`}>
                      {subscriptionData.subscription.status === 'trialing' ? '7-Day Free Trial' : 
                       subscriptionData.subscription.status === 'active' ? 'Active' :
                       subscriptionData.subscription.status === 'canceled' ? 'Canceled' :
                       subscriptionData.status || 'Free Preview'}
                    </p>
                  </>
                ) : (
                  <p className={`${tokens.smallText} font-medium text-clinical-text-primary`}>
                    Free Preview
                  </p>
                )}
              </div>
            </div>

            {/* Trial End Date */}
            {subscriptionData?.subscription?.trialEndDate && (
              <div>
                <p className={`${tokens.smallText} text-clinical-text-secondary mb-1`}>Trial Ends</p>
                <p className={`${tokens.smallText} font-semibold text-indigo-600`}>
                  {subscriptionData.subscription.trialEndDate}
                </p>
              </div>
            )}

            {/* Cancel at Period End Notice */}
            {subscriptionData?.subscription?.cancelAtPeriodEnd && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className={`${tokens.smallText} text-amber-800`}>
                  Your subscription will be canceled at the end of the current billing period.
                </p>
              </div>
            )}

            {/* Cancel Subscription Button */}
            {subscriptionData?.subscription && 
             subscriptionData.subscription.status !== 'canceled' && 
             !subscriptionData.subscription.cancelAtPeriodEnd && (
              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period.')) {
                    return
                  }
                  
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
                    
                    // Reload subscription data
                    const subRes = await fetch('/api/stripe/subscription', {
                      credentials: 'include',
                    })
                    if (subRes.ok) {
                      const subData = await subRes.json()
                      setSubscriptionData(subData)
                    }
                    
                    alert('Your subscription will be canceled at the end of the current billing period.')
                  } catch (error: any) {
                    console.error('Error canceling subscription:', error)
                    alert(error.message || 'Failed to cancel subscription. Please try again or contact support.')
                  } finally {
                    setIsCanceling(false)
                  }
                }}
                disabled={isCanceling}
                className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-50 to-rose-50 text-red-600 border-2 border-red-200 rounded-lg ${tokens.smallText} font-semibold hover:from-red-100 hover:to-rose-100 hover:border-red-300 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-sm hover:shadow-md`}
              >
                <XCircle className="w-4 h-4" />
                {isCanceling ? 'Canceling...' : 'Cancel Subscription'}
              </button>
            )}
          </div>
        </div>

        {/* Support Section - Enhanced */}
        <div className={`bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 ${tokens.cardPadding || 'p-6'}`}>
          <h2 className={`${tokens.subheading} font-semibold text-clinical-text-primary mb-4`}>
            Support
          </h2>
          <p className={`${tokens.smallText} text-clinical-text-secondary`}>
            Need help? Email{' '}
            <a
Objective:
Push the ForgeStudy Platform landing page from “nice template” to “world-class, high-conversion, parent-emotional” — and move away from the purple ForgeNursing look.

Hard Constraints:
- NO database changes.
- NO auth rewrites.
- NO routing changes beyond existing /signup and /login CTA links.
- Grade band cards remain informational ONLY (not clickable).
- Keep current sections functional and responsive; this is a UI/UX + copy + styling overhaul.

Brand + Visual Direction:
- Remove purple as the primary brand color.
- Use a premium education palette: deep navy + teal/cyan accents + subtle warm highlight (amber) for emphasis.
- Background should be airy and clean with subtle gradients (no heavy purple slabs).
- Buttons: primary uses teal/cyan or a navy-to-teal gradient; secondary is outline.
- Improve typography hierarchy: stronger headlines, tighter subhead spacing, more breathing room.

Conversion Goal:
Parents should feel urgency: “I need this for my kids now.”
Accomplish this with parent-first copy, pain-to-promise storytelling, and more product realism.

Required Changes:

1) HERO SECTION (rewrite copy + visuals)
- Replace hero headline/subheadline with parent-first messaging:
  Headline option (use one):
  “Homework shouldn’t end in tears.”
  Subheadline: “ForgeStudy helps students (Grades 3–12) understand their work step-by-step so they build confidence and independence.”
- Add a small line: “Designed for Grades 3–12 (not for K–2).”
- Keep CTAs:
  Get Started → /signup (primary)
  Log In → /login (secondary)
- Keep benefit chips, but rewrite to be parent-centric:
  e.g., “Less fighting at home”, “Explains step-by-step”, “Profiles for families”
- Update the hero product preview panel to look more like a real app:
  Show “Readiness Dashboard”, “Tonight’s Focus”, “Progress”, and an “Ask a question” input.
  (It can remain a stylized mock — just make it feel real and premium.)

2) Add a “PARENT PAIN → RELIEF” SECTION right after hero
Title: “If homework time feels like this… you’re not alone.”
Include 4 short bullets that sound real (no exaggeration):
- “I don’t remember how to help.”
- “My kid shuts down when they get stuck.”
- “We spend forever and still feel behind.”
- “I’m worried they’re falling behind.”
Then a short promise line:
“ForgeStudy turns ‘stuck’ into progress — by teaching how to think, not what to copy.”

3) Value Props (tighten copy)
Rewrite to be more specific and less generic SaaS:
- “Explains step-by-step (not just answers)”
- “Builds study habits and independence”
- “Personal dashboards per student”
- “One parent account, multiple learners”

4) Grade Bands section
- Ensure Elementary is Grades 3–5 (already updated).
- REMOVE “Most Popular” badges from grade cards.
- Ensure cards are visually consistent and feel premium, but remain informational only.

5) How It Works
- Keep the 4-step flow but make it feel more premium and clearer:
  Create account → Add student profile(s) → Land in dashboard → Switch profiles anytime
- Add one short line under step 3: “Students land in the Readiness dashboard.”

6) Pricing (keep $9.99 / $19.99)
- Make pricing look more premium and confident.
- Individual: $9.99/mo
- Family: $19.99/mo (up to 4 students)
- Add note: “Monthly pricing. Cancel anytime.”
- Keep CTA buttons linking to /signup.

7) FAQ
- Keep current FAQ list but ensure answers are parent-trust oriented and aligned with “not cheating / real learning”.
- Style accordions to match new palette.

8) Final CTA section
- Replace the large purple block with a premium callout (navy/teal).
- Copy should be urgent but tasteful:
  “Make tonight’s homework easier.”
  “Get started in minutes.”

Deliverable:
Update the landing page component styles and copy to match the above.
The final page should feel premium, modern, emotional, and high-converting — without breaking any flows.
              href="mailto:support@forgestudy.com"
              className="text-clinical-primary hover:text-clinical-secondary transition-colors"
            >
              support@forgestudy.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}


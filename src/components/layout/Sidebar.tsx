'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { MessageSquare, FileText, Settings, Activity, BookOpen, Shield, Sparkles, Folder, Bookmark } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import HistoryButton from './HistoryButton'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'

const NAV_ITEMS = [
  { label: 'Home', href: '/app', icon: Sparkles, type: 'route' as const },
  { label: 'Tutor', href: '/tutor', icon: MessageSquare, type: 'route' as const },
  { label: 'Progress', href: '/progress', icon: Activity, type: 'route' as const },
  { label: 'Saved Sessions', href: '/saved', icon: Bookmark, type: 'route' as const },
  { label: 'Courses', href: '/courses', icon: Folder, type: 'route' as const },
  { label: 'Sources', href: '/sources', icon: FileText, type: 'route' as const },
  { label: 'Vocabulary Bank', href: '/dictionary', icon: BookOpen, type: 'route' as const },
] as const

interface SidebarProps {
  onNavigate?: () => void
}

export default function Sidebar({ onNavigate }: SidebarProps = {}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { activeProfileId, setActiveProfileId } = useActiveProfile()
  const [studentName, setStudentName] = useState<string | null>(null)
  const [gradeBand, setGradeBand] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true)
      try {
        const supabase = getSupabaseBrowser()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }

        // Check trial status
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, trial_ends_at')
          .eq('id', user.id)
          .single()

        if (profile?.subscription_status === 'trialing' && profile?.trial_ends_at) {
          const daysLeft = Math.ceil(
            (new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
          setTrialDaysLeft(daysLeft > 0 ? daysLeft : 0)
        } else {
          setTrialDaysLeft(null)
        }

        if (activeProfileId) {
          const { data: studentProfile } = await supabase
            .from('student_profiles')
            .select('display_name, grade_band')
            .eq('id', activeProfileId)
            .eq('owner_id', user.id)
            .single()

          if (studentProfile) {
            setStudentName(studentProfile.display_name || null)
            const normalizedBand = studentProfile.grade_band === 'elementary' ? 'middle' : studentProfile.grade_band
            setGradeBand(normalizedBand || null)
          } else {
            setStudentName(null)
            setGradeBand(null)
          }
        } else {
          // No active profile — auto-select if user has exactly one profile
          const { data: allProfiles } = await supabase
            .from('student_profiles')
            .select('id, display_name, grade_band')
            .eq('owner_id', user.id)

          if (allProfiles && allProfiles.length === 1) {
            const only = allProfiles[0]
            setActiveProfileId(only.id)
            setStudentName(only.display_name || null)
            const normalizedBand = only.grade_band === 'elementary' ? 'middle' : only.grade_band
            setGradeBand(normalizedBand || null)
          } else {
            setStudentName(null)
            setGradeBand(null)
          }
        }
      } catch (error) {
        console.error('[Sidebar] Error loading profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [activeProfileId])

  const gradeBandLabel = (band: string | null) => {
    if (band === 'middle') return 'Grades 6–8'
    if (band === 'high') return 'Grades 9–12'
    return null
  }

  // Always show full navigation structure - use skeleton during loading
  const navItems = NAV_ITEMS

  return (
    <aside className="flex w-full h-full flex-col bg-slate-900 text-slate-400">
      {/* Sidebar Content */}
      <div className="flex h-full flex-col px-6 py-8">
        <div className="mb-10 px-2">
          {/* Logo or Brand with Icon */}
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
            <span className="text-xl font-bold text-white tracking-tight">ForgeStudy Platform</span>
          </div>
        </div>
        
        {/* Nav Container - Show skeleton while loading */}
        <nav className="flex-1 space-y-2">
          {isLoading ? (
            // Skeleton loading state - same structure as real nav
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg px-4 py-3.5 bg-slate-800/40 animate-pulse"
                >
                  <div className="h-5 w-5 rounded bg-slate-700/50"></div>
                  <div className="h-4 w-32 rounded bg-slate-700/50"></div>
                </div>
              ))}
            </>
          ) : (
            // Real navigation items
            navItems.map((item) => {
              const isTutorRoute = item.href.startsWith('/tutor')
              const isTutorPath = pathname === '/tutor'
              const itemParams = isTutorRoute ? new URLSearchParams(item.href.split('?')[1] || '') : null
              const itemMode = itemParams?.get('mode')
              const itemTool = itemParams?.get('tool')
              const currentMode = searchParams.get('mode')
              const currentTool = searchParams.get('tool')
              const isTutorActive = isTutorPath && (
                (itemMode && currentMode === itemMode) ||
                (itemTool && currentTool === itemTool) ||
                (!itemMode && !itemTool && !currentMode && !currentTool)
              )

              const isActive = isTutorRoute
                ? isTutorActive
                : pathname === item.href ||
                  pathname.startsWith(item.href + '/') ||
                  (item.href === '/app' && pathname.startsWith('/app')) ||
                  (item.href === '/courses' && pathname.startsWith('/courses')) ||
                  (item.href === '/dictionary' && pathname.startsWith('/dictionary')) ||
                  (item.href === '/progress' && pathname.startsWith('/progress'))
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`
                    group flex items-center gap-3 rounded-lg px-4 py-3.5 text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-indigo-400"}
                  `}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })
          )}
        </nav>
        
        {/* History Button - Moved from TutorHeader */}
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
          <HistoryButton onNavigate={onNavigate} />
          <button
            onClick={() => {
              window.dispatchEvent(new Event('open-settings-drawer'));
              onNavigate?.();
            }}
            className="w-full group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-indigo-400"
          >
            <Settings className="h-5 w-5" />
            Settings
          </button>
          <Link
            href="/parent"
            onClick={onNavigate}
            className="group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-indigo-400"
          >
            <Shield className="h-5 w-5" />
            Parent Dashboard
          </Link>
        </div>
        
        {/* Trial Banner */}
        {trialDaysLeft !== null && (
          <div className="mt-4 mx-2 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-800/30">
            <p className="text-xs text-amber-400 font-medium">
              {trialDaysLeft > 0 ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in trial` : 'Trial expired'}
            </p>
            {trialDaysLeft <= 3 && (
              <Link href="/billing/payment-required?reason=trial_expired" onClick={onNavigate} className="text-xs text-amber-300 hover:text-amber-200 underline">
                Upgrade now
              </Link>
            )}
          </div>
        )}

        {/* User Profile / Footer */}
        <div className="mt-auto pt-6 border-t border-slate-800">
          {isLoading ? (
            // Skeleton for profile section
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-slate-800/40 animate-pulse"></div>
              <div className="flex flex-col gap-2 min-w-0 flex-1">
                <div className="h-4 w-24 rounded bg-slate-800/40 animate-pulse"></div>
                <div className="h-3 w-20 rounded bg-slate-800/40 animate-pulse"></div>
              </div>
            </div>
          ) : (
            <Link
              href="/profiles"
              onClick={onNavigate}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-600 border border-indigo-500/50 flex items-center justify-center shadow-sm">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                {studentName ? (
                  <>
                    <span className="text-sm font-bold text-white truncate">{studentName}</span>
                    {gradeBand ? (
                      <span className="text-xs text-slate-400 truncate">{gradeBandLabel(gradeBand)}</span>
                    ) : (
                      <span className="text-xs text-slate-400 truncate">Select a grade band</span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-white">Student Account</span>
                    <span className="text-xs text-slate-400">Choose a profile</span>
                  </>
                )}
              </div>
            </Link>
          )}
        </div>
      </div>
    </aside>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
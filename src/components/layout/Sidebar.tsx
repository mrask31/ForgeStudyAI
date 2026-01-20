'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { MessageSquare, FileText, Settings, Activity, GraduationCap, BookOpen, Shield, Sparkles, Folder } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import HistoryButton from './HistoryButton'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'

const NAV_ITEMS_BY_BAND = {
  elementary: [
    { label: 'Home', href: '/app/elementary', icon: Sparkles },
    { label: 'AI Tutor', href: '/tutor', icon: MessageSquare },
    { label: 'Spelling', href: '/tutor?mode=spelling', icon: BookOpen },
    { label: 'Reading', href: '/tutor?mode=reading', icon: BookOpen },
    { label: 'Upload', href: '/sources', icon: FileText },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  middle: [
    { label: 'Home', href: '/app/middle', icon: Sparkles },
    { label: 'Study Topics', href: '/study-topics', icon: Folder },
    { label: 'Study Map', href: '/tutor?tool=study-map', icon: MessageSquare },
    { label: 'Practice', href: '/tutor?tool=practice', icon: Activity },
    { label: 'Writing', href: '/tutor?tool=writing', icon: BookOpen },
    { label: 'Uploads', href: '/sources', icon: FileText },
    { label: 'Progress', href: '/readiness', icon: Activity },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  high: [
    { label: 'Home', href: '/app/high', icon: Sparkles },
    { label: 'Study Topics', href: '/study-topics', icon: Folder },
    { label: 'Study Maps', href: '/tutor?tool=study-map', icon: MessageSquare },
    { label: 'Practice / Review', href: '/tutor?tool=practice', icon: Activity },
    { label: 'Exam Sheets', href: '/tutor?tool=exam', icon: BookOpen },
    { label: 'Writing Lab', href: '/tutor?tool=writing', icon: BookOpen },
    { label: 'Uploads', href: '/sources', icon: FileText },
    { label: 'Progress', href: '/readiness', icon: Activity },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  default: [
    { label: 'Tutor Workspace', href: '/tutor', icon: MessageSquare },
    { label: 'My Classes', href: '/classes', icon: GraduationCap },
    { label: 'Sources', href: '/sources', icon: FileText },
    { label: 'Dashboard', href: '/readiness', icon: Activity },
    { label: 'Vocabulary Bank', href: '/dictionary', icon: BookOpen },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
} as const

interface SidebarProps {
  onNavigate?: () => void
}

export default function Sidebar({ onNavigate }: SidebarProps = {}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { activeProfileId } = useActiveProfile()
  const [studentName, setStudentName] = useState<string | null>(null)
  const [gradeBand, setGradeBand] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        if (activeProfileId) {
          const { data: studentProfile } = await supabase
            .from('student_profiles')
            .select('display_name, grade_band')
            .eq('id', activeProfileId)
            .eq('owner_id', user.id)
            .single()

          if (studentProfile) {
            setStudentName(studentProfile.display_name || null)
            setGradeBand(studentProfile.grade_band || null)
          } else {
            setStudentName(null)
            setGradeBand(null)
          }
        } else {
          setStudentName(null)
          setGradeBand(null)
        }
      } catch (error) {
        console.error('[Sidebar] Error loading profile:', error)
      }
    }

    loadProfile()
  }, [activeProfileId])

  const gradeBandLabel = (band: string | null) => {
    if (band === 'elementary') return 'Grades 3–5'
    if (band === 'middle') return 'Grades 6–8'
    if (band === 'high') return 'Grades 9–12'
    return null
  }

  const navItems = gradeBand && gradeBand in NAV_ITEMS_BY_BAND
    ? NAV_ITEMS_BY_BAND[gradeBand as keyof typeof NAV_ITEMS_BY_BAND]
    : NAV_ITEMS_BY_BAND.default

  return (
    <aside className="flex w-full h-full flex-col bg-gradient-to-br from-slate-950 via-teal-900 to-emerald-950 text-teal-100">
      {/* Sidebar Content */}
      <div className="flex h-full flex-col px-6 py-8">
        <div className="mb-10 px-2">
          {/* Logo or Brand with Icon */}
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-teal-400"></div>
            <span className="text-xl font-bold text-white tracking-tight">ForgeStudy Platform</span>
          </div>
        </div>
        
        {/* Nav Container - Increased padding */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
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
                (item.href === '/classes' && pathname.startsWith('/classes')) ||
                (item.href === '/dictionary' && pathname.startsWith('/dictionary'))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`
                  group flex items-center gap-3 rounded-lg px-4 py-3.5 text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md" 
                    : "text-teal-200 hover:bg-gradient-to-r hover:from-teal-900/50 hover:to-emerald-900/50 hover:text-white"}
                `}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        
        {/* History Button - Moved from TutorHeader */}
        <div className="mt-4 pt-4 border-t border-teal-900/50 space-y-2">
          <HistoryButton onNavigate={onNavigate} />
          <Link
            href="/parent"
            onClick={onNavigate}
            className="group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 text-teal-200 hover:bg-gradient-to-r hover:from-teal-900/50 hover:to-emerald-900/50 hover:text-white"
          >
            <Shield className="h-5 w-5" />
            Parent Dashboard
          </Link>
        </div>
        
        {/* User Profile / Footer */}
        <div className="mt-auto pt-6 border-t border-teal-900/50">
          <Link
            href="/profiles"
            onClick={onNavigate}
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-teal-900/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 border border-teal-500/50 flex items-center justify-center shadow-sm">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              {studentName ? (
                <>
                  <span className="text-sm font-bold text-white truncate">{studentName}</span>
                  {gradeBand ? (
                    <span className="text-xs text-teal-200 truncate">{gradeBandLabel(gradeBand)}</span>
                  ) : (
                    <span className="text-xs text-teal-200 truncate">Select a grade band</span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-white">Student Account</span>
                  <span className="text-xs text-teal-200">Choose a profile</span>
                </>
              )}
            </div>
          </Link>
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
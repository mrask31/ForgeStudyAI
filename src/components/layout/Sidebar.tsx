'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, FileText, Settings, Activity, GraduationCap, BookOpen } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import HistoryButton from './HistoryButton'

const NAV_ITEMS = [
  { label: 'Clinical Studio', href: '/tutor', icon: MessageSquare },
  { label: 'My Classes', href: '/classes', icon: GraduationCap },
  { label: 'Sources', href: '/sources', icon: FileText },
  { label: 'Dashboard', href: '/readiness', icon: Activity },
  { label: 'Medical Dictionary', href: '/dictionary', icon: BookOpen },
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  onNavigate?: () => void
}

export default function Sidebar({ onNavigate }: SidebarProps = {}) {
  const pathname = usePathname()
  const [preferredName, setPreferredName] = useState<string | null>(null)
  const [programTrack, setProgramTrack] = useState<string | null>(null)
  const [graduationDate, setGraduationDate] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_name, program_track, graduation_date')
          .eq('id', user.id)
          .single()

        if (profile) {
          setPreferredName(profile.preferred_name || null)
          setProgramTrack(profile.program_track || null)
          setGraduationDate(profile.graduation_date || null)
        }
      } catch (error) {
        console.error('[Sidebar] Error loading profile:', error)
      }
    }

    loadProfile()
  }, [])

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
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || 
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
        <div className="mt-4 pt-4 border-t border-teal-900/50">
          <HistoryButton onNavigate={onNavigate} />
        </div>
        
        {/* Switch Profile Link */}
        <div className="mt-4">
          <Link
            href="/profiles"
            onClick={onNavigate}
            className="group flex items-center gap-3 rounded-lg px-4 py-3.5 text-sm font-medium transition-all duration-200 text-teal-200 hover:bg-gradient-to-r hover:from-teal-900/50 hover:to-emerald-900/50 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Switch Profile
          </Link>
        </div>
        
        {/* User Profile / Footer */}
        <div className="mt-auto pt-6 border-t border-teal-900/50">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 border border-teal-500/50 flex items-center justify-center shadow-sm">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              {preferredName ? (
                <>
                  <span className="text-sm font-bold text-white truncate">{preferredName}</span>
                  {programTrack && graduationDate ? (
                    <span className="text-xs text-teal-200 truncate">
                      {programTrack} • Class of {new Date(graduationDate).getFullYear()}
                    </span>
                  ) : programTrack ? (
                    <span className="text-xs text-teal-200 truncate">{programTrack}</span>
                  ) : graduationDate ? (
                    <span className="text-xs text-teal-200 truncate">
                      Class of {new Date(graduationDate).getFullYear()}
                    </span>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-white">Student Account</span>
                  <span className="text-xs text-teal-200">{programTrack || 'RN Track'}</span>
                </>
              )}
            </div>
          </div>
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
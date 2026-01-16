'use client'

import { ReactNode, useState, useEffect } from 'react'
import { DensityProvider } from '@/contexts/DensityContext'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import { Menu } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface AppShellProps {
  children: ReactNode
  variant?: 'app' | 'public'
}

export function AppShell({ children, variant = 'app' }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [programTrack, setProgramTrack] = useState<string | null>(null)
  const [graduationYear, setGraduationYear] = useState<number | null>(null)

  useEffect(() => {
    if (variant !== 'app') return
    
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
          .select('program_track, graduation_date')
          .eq('id', user.id)
          .single()

        if (profile) {
          if (profile.program_track) {
            setProgramTrack(profile.program_track)
          }
          if (profile.graduation_date) {
            setGraduationYear(new Date(profile.graduation_date).getFullYear())
          }
        }
      } catch (error) {
        console.error('[AppShell] Error loading profile:', error)
      }
    }

    loadProfile()
  }, [variant])

  if (variant === 'public') {
    // Public pages (landing, login, signup, checkout) use simpler layout
    return (
      <div className="min-h-screen-dynamic bg-slate-50 flex flex-col">
        {/* Content will be wrapped by PublicLayout */}
        {children}
      </div>
    )
  }

  // App pages (tutor, dashboard, etc.) use full app shell with sidebar
  return (
    <DensityProvider>
      <div className="h-screen-dynamic bg-slate-50 flex flex-col lg:flex-row overflow-hidden">
        {/* Mobile Header Bar - Sticky, only on mobile */}
        <header className="lg:hidden sticky top-0 z-50 bg-gradient-to-br from-slate-950 via-teal-900 to-emerald-950 border-b border-teal-900/50 flex-shrink-0 safe-t">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="p-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-teal-400"></div>
              <span className="text-lg font-bold text-white tracking-tight">
                {programTrack && graduationYear 
                  ? `${programTrack} • Class of ${graduationYear}`
                  : programTrack 
                    ? programTrack
                    : 'ForgeStudy Platform'}
              </span>
            </div>
            <div className="w-10"></div>
          </div>
        </header>

        {/* Desktop Sidebar - Hidden on mobile, visible on lg+ - Fixed */}
        <aside className="hidden lg:flex lg:w-64 xl:w-72 flex-shrink-0 bg-gradient-to-br from-slate-950 via-teal-900 to-emerald-950 border-r border-teal-900/50 h-screen-dynamic overflow-y-auto">
          <Sidebar />
        </aside>
        
        {/* Main Content Area - Fixed height, no overflow */}
        <main className="flex-1 min-w-0 h-screen-dynamic overflow-hidden bg-slate-50 flex flex-col">
          {children}
        </main>

        {/* Mobile Navigation Drawer */}
        <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      </div>
    </DensityProvider>
  )
}


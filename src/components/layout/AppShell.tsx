'use client'

import { ReactNode, useState } from 'react'
import { DensityProvider } from '@/contexts/DensityContext'
import { UserProvider } from '@/contexts/UserContext'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import { Menu } from 'lucide-react'

interface AppShellProps {
  children: ReactNode
  variant?: 'app' | 'public'
}

export function AppShell({ children, variant = 'app' }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
    <UserProvider>
      <DensityProvider>
        <div className="h-screen-dynamic bg-slate-950 flex flex-col lg:flex-row overflow-hidden">
          {/* Mobile Header Bar - Sticky, only on mobile */}
          <header className="lg:hidden sticky top-0 z-50 bg-slate-900 border-b border-slate-800 flex-shrink-0 safe-t">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="p-2.5 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-colors"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                <span className="text-lg font-bold text-white tracking-tight">
                  ForgeStudy Platform
                </span>
              </div>
              <div className="w-10"></div>
            </div>
          </header>

          {/* Desktop Sidebar - Hidden on mobile, visible on lg+ - Fixed */}
          <aside className="hidden lg:flex lg:w-64 xl:w-72 flex-shrink-0 bg-slate-900 border-r border-slate-800 h-screen-dynamic overflow-y-auto">
            <Sidebar />
          </aside>
          
          {/* Main Content Area - Scrollable */}
          <main className="flex-1 min-w-0 h-screen-dynamic overflow-y-auto bg-slate-950 flex flex-col">
            {children}
          </main>

          {/* Mobile Navigation Drawer */}
          <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        </div>
      </DensityProvider>
    </UserProvider>
  )
}


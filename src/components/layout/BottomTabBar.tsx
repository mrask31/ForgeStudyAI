'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, BarChart3, User } from 'lucide-react'

const TABS = [
  { label: 'Study', href: '/app', icon: Home },
  { label: 'Progress', href: '/progress', icon: BarChart3 },
  { label: 'Me', href: '/me', icon: User },
] as const

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {TABS.map((tab) => {
          const isActive =
            tab.href === '/app'
              ? pathname === '/app'
              : pathname === tab.href || pathname.startsWith(tab.href + '/')

          const Icon = tab.icon

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 min-w-[64px] transition-colors ${
                isActive
                  ? 'text-indigo-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

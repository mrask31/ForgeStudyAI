'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, MessageSquare, BarChart3, Settings } from 'lucide-react'

const TABS = [
  { label: 'Home', href: '/app', icon: Home },
  { label: 'Tutor', href: '/tutor', icon: MessageSquare },
  { label: 'Progress', href: '/progress', icon: BarChart3 },
  { label: 'Settings', href: '__settings__', icon: Settings },
] as const

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-slate-800 safe-b">
      <div className="flex items-center justify-around px-2 py-1">
        {TABS.map((tab) => {
          if (tab.href === '__settings__') {
            const Icon = tab.icon
            return (
              <button
                key={tab.label}
                onClick={() => window.dispatchEvent(new Event('open-settings-drawer'))}
                className="flex flex-col items-center gap-0.5 px-3 py-2 min-w-[64px] text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            )
          }

          const isActive =
            tab.href === '/app'
              ? pathname === '/app'
              : pathname === tab.href || pathname.startsWith(tab.href + '/')

          const Icon = tab.icon

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 min-w-[64px] transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
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

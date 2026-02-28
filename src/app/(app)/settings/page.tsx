'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Mail, LogOut, Layout, Settings, Shield } from 'lucide-react'
import { useDensity } from '@/contexts/DensityContext'
import { getDensityTokens } from '@/lib/density-tokens'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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
      <div className="h-full bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      <div className={`${tokens.containerMaxWidth || 'max-w-4xl'} mx-auto px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pt-safe-t`}>
        {/* Header - Enhanced */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-200">
              Settings
            </h1>
          </div>
          <p className="text-sm sm:text-base text-slate-400 ml-11 sm:ml-14 max-w-2xl leading-relaxed">
            Manage your account and preferences.
          </p>
        </div>

        {/* Parent Access */}
        <div className={`bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl ${tokens.cardPadding || 'p-4 sm:p-6'} mb-4 sm:mb-6`}>
          <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 flex-shrink-0" />
            <h2 className={`${tokens.subheading} font-semibold text-slate-200`}>
              Parent access
            </h2>
          </div>
          <p className={`${tokens.smallText} text-slate-400 mb-4`}>
            Manage subscriptions and student profiles in a PIN-protected space.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/parent"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-500/30"
            >
              Open parent dashboard
            </Link>
            <Link
              href="/profiles"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-slate-700 text-slate-200 font-semibold hover:border-indigo-500/30 hover:bg-indigo-600/10 transition-colors"
            >
              Switch profile
            </Link>
          </div>
        </div>

        {/* Display Density Section - Enhanced */}
        <div className={`bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl ${tokens.cardPadding || 'p-4 sm:p-6'} mb-4 sm:mb-6`}>
          <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
            <Layout className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 flex-shrink-0" />
            <h2 className={`${tokens.subheading} font-semibold text-slate-200`}>
              Display Density
            </h2>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <p className={`${tokens.smallText} text-slate-400 mb-2 sm:mb-3`}>
                Choose how much space and text size you prefer. Comfort is larger and easier to read; Compact fits more on screen.
              </p>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setDensity('comfort')}
                  className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    density === 'comfort'
                      ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-500/30'
                      : 'bg-slate-900/60 text-slate-200 border-slate-700 hover:border-indigo-500/30 hover:bg-indigo-600/10'
                  } ${tokens.bodyText || 'text-sm'} font-semibold`}
                >
                  Comfort
                </button>
                <button
                  onClick={() => setDensity('compact')}
                  className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    density === 'compact'
                      ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-500/30'
                      : 'bg-slate-900/60 text-slate-200 border-slate-700 hover:border-indigo-500/30 hover:bg-indigo-600/10'
                  } ${tokens.bodyText || 'text-sm'} font-semibold`}
                >
                  Compact
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Account Section - Enhanced */}
        <div className={`bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl ${tokens.cardPadding || 'p-4 sm:p-6'} mb-4 sm:mb-6 mt-6 sm:mt-8`}>
          <h2 className={`${tokens.subheading} font-semibold text-slate-200 mb-4`}>
            Account
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-indigo-400" />
              <div>
                <p className={`${tokens.smallText} text-slate-400`}>Email</p>
                <p className={`${tokens.smallText} font-medium text-slate-200`}>
                  {user?.email || 'Not available'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-900/40 to-rose-900/40 text-red-400 border-2 border-red-800/50 rounded-xl ${tokens.smallText || 'text-sm'} font-semibold hover:from-red-900/60 hover:to-rose-900/60 hover:border-red-700/50 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md`}
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>

        {/* Support Section - Enhanced */}
        <div className={`bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl ${tokens.cardPadding || 'p-6'}`}>
          <h2 className={`${tokens.subheading} font-semibold text-slate-200 mb-4`}>
            Support
          </h2>
          <p className={`${tokens.smallText} text-slate-400`}>
            Need help? Email{' '}
            <a
              href="mailto:support@forgestudy.com"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              support@forgestudy.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}


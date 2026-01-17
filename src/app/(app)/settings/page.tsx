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
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50">
      <div className={`${tokens.containerMaxWidth || 'max-w-4xl'} mx-auto px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pt-safe-t`}>
        {/* Header - Enhanced */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20 flex-shrink-0">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
              Settings
            </h1>
          </div>
          <p className="text-sm sm:text-base text-slate-600 ml-11 sm:ml-14 max-w-2xl leading-relaxed">
            Manage your account and preferences.
          </p>
        </div>

        {/* Parent Access */}
        <div className={`bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 ${tokens.cardPadding || 'p-4 sm:p-6'} mb-4 sm:mb-6`}>
          <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
            <h2 className={`${tokens.subheading} font-semibold text-slate-900`}>
              Parent access
            </h2>
          </div>
          <p className={`${tokens.smallText} text-slate-600 mb-4`}>
            Manage subscriptions and student profiles in a PIN-protected space.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/parent"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 text-white font-semibold hover:from-teal-800 hover:to-teal-700 transition-colors shadow-md shadow-teal-500/30"
            >
              Open parent dashboard
            </Link>
            <Link
              href="/profiles"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:border-teal-300 hover:bg-teal-50 transition-colors"
            >
              Switch profile
            </Link>
          </div>
        </div>

        {/* Display Density Section - Enhanced */}
        <div className={`bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 ${tokens.cardPadding || 'p-4 sm:p-6'} mb-4 sm:mb-6`}>
          <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
            <Layout className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
            <h2 className={`${tokens.subheading} font-semibold text-slate-900`}>
              Display Density
            </h2>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <p className={`${tokens.smallText} text-slate-600 mb-2 sm:mb-3`}>
                Choose how much space and text size you prefer. Comfort is larger and easier to read; Compact fits more on screen.
              </p>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setDensity('comfort')}
                  className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    density === 'comfort'
                      ? 'bg-gradient-to-r from-teal-700 to-teal-600 text-white border-transparent shadow-md shadow-teal-500/30'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                  } ${tokens.bodyText || 'text-sm'} font-semibold`}
                >
                  Comfort
                </button>
                <button
                  onClick={() => setDensity('compact')}
                  className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    density === 'compact'
                      ? 'bg-gradient-to-r from-teal-700 to-teal-600 text-white border-transparent shadow-md shadow-teal-500/30'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                  } ${tokens.bodyText || 'text-sm'} font-semibold`}
                >
                  Compact
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Account Section - Enhanced */}
        <div className={`bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 ${tokens.cardPadding || 'p-4 sm:p-6'} mb-4 sm:mb-6 mt-6 sm:mt-8`}>
          <h2 className={`${tokens.subheading} font-semibold text-slate-900 mb-4`}>
            Account
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-emerald-600" />
              <div>
                <p className={`${tokens.smallText} text-slate-600`}>Email</p>
                <p className={`${tokens.smallText} font-medium text-slate-900`}>
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

        {/* Support Section - Enhanced */}
        <div className={`bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 ${tokens.cardPadding || 'p-6'}`}>
          <h2 className={`${tokens.subheading} font-semibold text-slate-900 mb-4`}>
            Support
          </h2>
          <p className={`${tokens.smallText} text-slate-600`}>
            Need help? Email{' '}
            <a
              href="mailto:support@forgestudy.com"
              className="text-teal-700 hover:text-teal-800 transition-colors"
            >
              support@forgestudy.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}


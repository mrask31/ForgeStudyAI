'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const checkUserAndSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      // Check subscription status if user is logged in
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', user.id)
          .single()
        
        const subscriptionStatus = profile?.subscription_status
        const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
        setHasActiveSubscription(isActive)
      } else {
        setHasActiveSubscription(false)
      }
    }

    checkUserAndSubscription()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      
      // Re-check subscription status when auth state changes
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', session.user.id)
          .single()
        
        const subscriptionStatus = profile?.subscription_status
        const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
        setHasActiveSubscription(isActive)
      } else {
        setHasActiveSubscription(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen-dynamic bg-slate-50 flex flex-col">
      {/* Top Navigation - Sticky header */}
      <nav className="sticky top-0 z-40 border-b-2 border-slate-200/60 bg-white/90 backdrop-blur-sm shadow-sm flex-shrink-0 safe-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-18">
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/30 group-hover:shadow-lg group-hover:shadow-indigo-500/40 transition-all duration-200">
                <span className="font-bold text-white text-sm sm:text-base leading-none">FN</span>
              </div>
              <span className="font-bold text-lg sm:text-xl text-slate-900 bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent">ForgeNursing</span>
            </Link>
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Show "Go to Tutor" for logged-in users with active subscription */}
              {user && hasActiveSubscription && pathname !== '/checkout' && (
                <Link
                  href="/tutor"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 min-h-[40px] sm:min-h-[44px] flex items-center transform hover:scale-105 active:scale-95"
                >
                  Go to Tutor
                </Link>
              )}
              {/* Show "Log In" when user is not logged in OR when on landing page (even if logged in without subscription) */}
              {(!user || (pathname === '/' && !hasActiveSubscription)) && (
                <Link
                  href="/login"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 text-slate-700 hover:text-indigo-700 text-xs sm:text-sm font-semibold transition-colors min-h-[40px] sm:min-h-[44px] flex items-center border-2 border-transparent hover:border-indigo-200 rounded-xl"
                >
                  Log In
                </Link>
              )}
              {/* Show "Get Started" on landing page when user is not logged in OR doesn't have active subscription */}
              {pathname === '/' && (!user || !hasActiveSubscription) && (
                <Link
                  href="/signup?plan=monthly"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 min-h-[40px] sm:min-h-[44px] flex items-center transform hover:scale-105 active:scale-95"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Content - Scrollable with safe area padding */}
      <main className="flex-1 w-full overflow-visible pb-safe-b">
        {children}
      </main>

      {/* Footer - Enhanced */}
      <footer className="border-t-2 border-slate-200/60 bg-white/80 backdrop-blur-sm mt-auto flex-shrink-0 pb-safe-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-600">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 items-center sm:items-start">
              <Link href="/terms" className="hover:text-slate-900 transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-slate-900 transition-colors">
                Privacy Policy
              </Link>
              <a href="mailto:support@forgenursing.com" className="hover:text-slate-900 transition-colors">
                Contact: support@forgenursing.com
              </a>
            </div>
            <div className="text-slate-500 text-center sm:text-right">
              <p>© 2025 MJR Intelligence Group LLC</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}


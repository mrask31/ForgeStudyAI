'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
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
    <div className="min-h-screen-dynamic bg-slate-950 flex flex-col">
      {/* Content - Full height, no global header */}
      <main className="flex-1 w-full overflow-visible">
        {children}
      </main>

      {/* Footer - Dark Space styling */}
      <footer className="border-t border-slate-800 bg-slate-950 mt-auto flex-shrink-0 pb-safe-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-400">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 items-center sm:items-start">
              <Link href="/terms" className="hover:text-slate-200 transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-slate-200 transition-colors">
                Privacy Policy
              </Link>
              <a href="mailto:support@forgestudy.com" className="hover:text-slate-200 transition-colors">
                Contact: support@forgestudy.com
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


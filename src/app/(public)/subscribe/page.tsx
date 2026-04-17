'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { SubscribeForm } from '@/components/subscribe-form'
import Link from 'next/link'
import { getSupabaseBrowser } from '@/lib/supabase/client'

function SubscribeContent() {
  const searchParams = useSearchParams()
  const fromContext = searchParams.get('from') as 'founding' | 'trial' | null

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowser()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">
            ForgeStudy AI
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Continue with ForgeStudy AI
            </h1>
            <p className="text-slate-400 max-w-md mx-auto">
              Pick a plan that works for your family. No auto-charge — you're choosing to subscribe.
            </p>
          </div>

          <SubscribeForm fromContext={fromContext} />

          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-sm">
              We don't auto-charge. On day 13 we email you — you subscribe or you don't. 
              If you paid annually and change your mind in 30 days, full refund. No forms. No survey.
            </p>
          </div>

          <div className="text-center">
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Not ready? Sign out and take a break →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <SubscribeContent />
    </Suspense>
  )
}

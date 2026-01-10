'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect /binder to /classes since we've unified the experience
export default function BinderPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/classes')
  }, [router])

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
        </div>
        <p className="text-lg font-medium text-slate-600">Redirecting to My Classes...</p>
      </div>
    </div>
  )
}

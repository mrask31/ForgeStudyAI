import { Suspense } from 'react'
import TutorPageClient from './TutorPageClient'

// Server component wrapper to handle dynamic export and Suspense boundary
// This page uses useSearchParams() which requires Suspense and dynamic rendering
export const dynamic = 'force-dynamic'

export default function TutorPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <TutorPageClient />
    </Suspense>
  )
}

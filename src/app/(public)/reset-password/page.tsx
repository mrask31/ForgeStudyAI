import { Suspense } from 'react'
import ResetPasswordClient from './ResetPasswordClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600 text-sm">Loading...</p>
      </div>
    }>
      <ResetPasswordClient />
    </Suspense>
  )
}

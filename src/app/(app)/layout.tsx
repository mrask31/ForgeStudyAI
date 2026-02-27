import { Suspense } from 'react'
import { AppShell } from '@/components/layout/AppShell'

// Force dynamic rendering for all app routes
export const dynamic = 'force-dynamic'

export default function AppRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600 text-sm">Loading...</p>
      </div>
    }>
      <AppShell variant="app">
        {children}
      </AppShell>
    </Suspense>
  )
}

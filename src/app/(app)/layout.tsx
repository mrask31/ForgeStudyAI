import { Suspense } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { SettingsDrawerWrapper } from '@/components/drawers/SettingsDrawerWrapper'
import { SubscriptionGuard } from '@/components/SubscriptionGuard'

// Force dynamic rendering for all app routes
export const dynamic = 'force-dynamic'

export default function AppRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#08080F] flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    }>
      <AppShell variant="app">
        <SubscriptionGuard>
          {children}
        </SubscriptionGuard>
        <SettingsDrawerWrapper />
      </AppShell>
    </Suspense>
  )
}

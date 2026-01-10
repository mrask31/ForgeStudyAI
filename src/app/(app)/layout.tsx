'use client'

import { AppShell } from '@/components/layout/AppShell'

export default function AppRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell variant="app">
      {children}
    </AppShell>
  )
}

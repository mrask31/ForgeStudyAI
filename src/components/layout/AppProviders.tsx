'use client'

import { ActiveProfileProvider } from '@/contexts/ActiveProfileContext'

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <ActiveProfileProvider>{children}</ActiveProfileProvider>
}

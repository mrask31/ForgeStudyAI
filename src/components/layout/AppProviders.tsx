'use client'

import { ActiveProfileProvider } from '@/contexts/ActiveProfileContext'
import { Toaster } from 'sonner'

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ActiveProfileProvider>
      {children}
      <Toaster position="top-right" richColors />
    </ActiveProfileProvider>
  )
}

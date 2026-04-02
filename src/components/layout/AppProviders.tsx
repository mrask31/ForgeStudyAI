'use client'

import { ActiveProfileProvider } from '@/contexts/ActiveProfileContext'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Toaster } from 'sonner'

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ActiveProfileProvider>
        {children}
        <Toaster position="top-right" richColors />
      </ActiveProfileProvider>
    </ThemeProvider>
  )
}

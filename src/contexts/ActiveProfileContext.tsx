'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'active_profile_id'

interface ActiveProfileContextValue {
  activeProfileId: string | null
  setActiveProfileId: (profileId: string | null) => void
}

const ActiveProfileContext = createContext<ActiveProfileContextValue | undefined>(undefined)

export function ActiveProfileProvider({ children }: { children: React.ReactNode }) {
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setActiveProfileIdState(stored)
      }
    } catch (error) {
      console.warn('[ActiveProfile] Failed to read localStorage:', error)
    }
  }, [])

  const setActiveProfileId = (profileId: string | null) => {
    setActiveProfileIdState(profileId)
    try {
      if (profileId) {
        window.localStorage.setItem(STORAGE_KEY, profileId)
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch (error) {
      console.warn('[ActiveProfile] Failed to write localStorage:', error)
    }
  }

  const value = useMemo(
    () => ({ activeProfileId, setActiveProfileId }),
    [activeProfileId]
  )

  return <ActiveProfileContext.Provider value={value}>{children}</ActiveProfileContext.Provider>
}

export function useActiveProfile() {
  const context = useContext(ActiveProfileContext)
  if (!context) {
    throw new Error('useActiveProfile must be used within ActiveProfileProvider')
  }
  return context
}

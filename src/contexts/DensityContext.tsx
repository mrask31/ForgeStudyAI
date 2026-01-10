'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type DensityMode = 'comfort' | 'compact'

interface DensityContextType {
  density: DensityMode
  setDensity: (mode: DensityMode) => void
}

const DensityContext = createContext<DensityContextType | undefined>(undefined)

const STORAGE_KEY = 'forgenursing-density-preference'

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<DensityMode>('comfort')

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as DensityMode | null
      if (saved === 'comfort' || saved === 'compact') {
        setDensityState(saved)
      }
    }
  }, [])

  const setDensity = (mode: DensityMode) => {
    setDensityState(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode)
    }
  }

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  )
}

export function useDensity() {
  const context = useContext(DensityContext)
  if (context === undefined) {
    throw new Error('useDensity must be used within a DensityProvider')
  }
  return context
}


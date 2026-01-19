'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'

export type ActiveProfileSummary = {
  id: string
  displayName: string | null
  gradeBand: 'elementary' | 'middle' | 'high'
  grade: string | null
}

export function useActiveProfileSummary() {
  const { activeProfileId } = useActiveProfile()
  const [summary, setSummary] = useState<ActiveProfileSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      if (!activeProfileId) {
        if (isMounted) {
          setSummary(null)
        }
        return
      }

      setIsLoading(true)
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (isMounted) {
            setSummary(null)
          }
          return
        }

        const { data: profile, error } = await supabase
          .from('student_profiles')
          .select('id, display_name, grade_band, grade')
          .eq('id', activeProfileId)
          .eq('owner_id', user.id)
          .single()

        if (error || !profile) {
          if (isMounted) {
            setSummary(null)
          }
          return
        }

        if (isMounted) {
          setSummary({
            id: profile.id,
            displayName: profile.display_name || null,
            gradeBand: profile.grade_band,
            grade: profile.grade || null,
          })
        }
      } catch (err) {
        console.error('[ActiveProfileSummary] Failed to load profile:', err)
        if (isMounted) {
          setSummary(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [activeProfileId])

  return { summary, isLoading }
}

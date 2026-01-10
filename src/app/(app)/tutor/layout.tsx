'use client'

import { useEffect } from 'react'

// Mark tutor routes as dynamic since they use useSearchParams
export const dynamic = 'force-dynamic'

export default function TutorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Lock body scroll when tutor layout is active
  useEffect(() => {
    document.body.classList.add('tutor-view')
    // Hide footer for tutor view
    const footer = document.querySelector('footer')
    if (footer) {
      footer.style.display = 'none'
    }
    
    return () => {
      document.body.classList.remove('tutor-view')
      // Restore footer when leaving tutor view
      const footer = document.querySelector('footer')
      if (footer) {
        footer.style.display = ''
      }
    }
  }, [])

  return (
    <div className="w-full h-full">
      {/* Main Content Area - works within parent flex layout */}
      {children}
    </div>
  )
}


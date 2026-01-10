'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function ComplianceDisclaimer() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if disclaimer has been dismissed
    const hasSeenDisclaimer = localStorage.getItem('forgenursing-compliance-disclaimer-dismissed')
    if (!hasSeenDisclaimer) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('forgenursing-compliance-disclaimer-dismissed', 'true')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="border-b border-slate-200/40 bg-slate-50/60 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] sm:text-[10px] text-slate-400 flex-1 leading-tight">
            <span className="font-medium">Educational use only.</span> Not a medical device.
          </p>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-slate-300 hover:text-slate-500 hover:bg-slate-200/30 rounded transition-all"
            aria-label="Dismiss disclaimer"
          >
            <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}


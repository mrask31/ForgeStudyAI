'use client'

import { Archive, X } from 'lucide-react'
import { useDensity } from '@/contexts/DensityContext'
import { getDensityTokens } from '@/lib/density-tokens'

interface ArchivedChatBannerProps {
  summary: string | null
  onDismiss?: () => void
}

export default function ArchivedChatBanner({ summary, onDismiss }: ArchivedChatBannerProps) {
  const { density } = useDensity()
  const tokens = getDensityTokens(density)

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4 md:p-6 mb-6">
      <div className="flex items-start gap-3">
        <Archive className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className={`${tokens.subheading} font-semibold text-amber-900 mb-2`}>
            Archived Session
          </h3>
          <p className={`${tokens.smallText} text-amber-800 mb-3`}>
            This session is archived. You can review it, but new messages won't be saved.
          </p>
          {summary && (
            <div className="bg-white/60 rounded p-3 border border-amber-200">
              <p className={`${tokens.smallText} font-medium text-amber-900 mb-2`}>Session Summary:</p>
              <div className={`${tokens.bodyText} text-amber-800 prose prose-slate max-w-none`}>
                <div className="whitespace-pre-line">{summary}</div>
              </div>
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-amber-600 hover:text-amber-800 transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}


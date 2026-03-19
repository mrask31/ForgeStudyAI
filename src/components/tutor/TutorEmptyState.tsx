'use client'

import { useRouter } from 'next/navigation'
import { BookOpen, Sparkles } from 'lucide-react'

interface TutorEmptyStateProps {
  activeChunkCount: number
  hasSeenOnboarding?: boolean
}

export default function TutorEmptyState({ activeChunkCount, hasSeenOnboarding = false }: TutorEmptyStateProps) {
  const router = useRouter()

  if (activeChunkCount > 0) {
    return null // Don't show empty state if files exist
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      {/* Empty State Card */}
      <div className="max-w-md w-full space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Sparkles className="w-12 h-12 text-indigo-400" />
          <h3 className="text-xl font-semibold text-slate-100">
            What would you like to study today?
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ask me anything — I&apos;m here to help you learn, practice, and understand your coursework.
          </p>
        </div>

        {/* Example prompts */}
        <div className="space-y-2 text-left">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Try asking:</p>
          {[
            'Help me understand this concept',
            'Quiz me on what we covered',
            'Explain this in simpler terms',
            'Give me a practice problem',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => {
                // Dispatch event to prefill the chat input
                window.dispatchEvent(new CustomEvent('tutor-prefill', { detail: { prompt } }))
              }}
              className="w-full text-left px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-slate-300 hover:bg-slate-700/60 hover:border-indigo-500/40 hover:text-slate-100 transition-all duration-200"
            >
              &ldquo;{prompt}&rdquo;
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

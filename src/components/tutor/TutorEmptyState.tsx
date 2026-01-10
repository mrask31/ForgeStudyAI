'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileText, ArrowRight } from 'lucide-react'

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
      {/* Onboarding Panel (only for first-time users) */}
      {!hasSeenOnboarding && (
        <div className="mb-8 max-w-lg w-full bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Start by loading your semester</h3>
          <ol className="text-left text-sm text-blue-800 space-y-2 mb-4">
            <li>1. Go to My Classes</li>
            <li>2. Select a class and upload your syllabus and textbooks</li>
            <li>3. Materials will automatically be available for study</li>
          </ol>
          <div className="text-left text-sm text-blue-700 mt-4">
            <p className="font-medium mb-2">Then try asking:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>"Explain the key goals from my syllabus."</li>
              <li>"Help me study Heart Failure from my textbook."</li>
            </ul>
          </div>
        </div>
      )}

      {/* Empty State Card */}
      <div className="bg-white border border-[var(--tutor-border-subtle)] rounded-lg p-8 max-w-md w-full shadow-sm">
        <div className="mb-4">
          <FileText className="w-12 h-12 text-[var(--tutor-text-muted)] mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--tutor-text-main)] mb-3">
          Get more out of your tutor with class materials
        </h3>
        <p className="text-sm text-[var(--tutor-text-muted)] mb-6 leading-relaxed">
          You don't have any active syllabus or textbook files yet.
          <br />
          Go to My Classes to upload materials for your courses.
        </p>
        <Button
          onClick={() => router.push('/classes')}
          className="w-full bg-[var(--tutor-primary)] hover:bg-[var(--tutor-primary)]/90 text-white"
        >
          Go to My Classes
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}


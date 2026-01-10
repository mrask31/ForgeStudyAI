'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import NotebookSidebar from '@/components/notebook/NotebookSidebar'
import NotebookTopicView from '@/components/notebook/NotebookTopicView'
import { NotebookTopic, StudentClass } from '@/lib/types'
import { listClasses } from '@/lib/api/classes'

export default function NotebookPage() {
  const params = useParams()
  const classId = params.classId as string
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<NotebookTopic | null>(null)
  const [classData, setClassData] = useState<StudentClass | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        loadClassData(user.id)
      }
    })
  }, [classId])

  const loadClassData = async (uid: string) => {
    const classes = await listClasses(uid)
    const found = classes.find((c) => c.id === classId)
    if (found) {
      setClassData(found)
    }
  }

  if (!userId) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center">
        <div className="text-[var(--tutor-text-muted)]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex overflow-hidden bg-[var(--tutor-bg)]">
      {/* Sidebar */}
      <div className="w-80 shrink-0">
        <NotebookSidebar
          userId={userId}
          classId={classId}
          onTopicSelect={setSelectedTopic}
          selectedTopicId={selectedTopic?.id}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <NotebookTopicView
          topic={selectedTopic}
          classCode={classData?.code}
          className={classData?.name}
          classId={classId}
          userId={userId || undefined}
          onTopicUpdated={(updatedTopic) => {
            setSelectedTopic(updatedTopic)
          }}
        />
      </div>
    </div>
  )
}


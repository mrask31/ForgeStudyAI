'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Calendar, ExternalLink } from 'lucide-react'
import { NotebookTopic } from '@/lib/types'
import { listNotebookTopics } from '@/lib/api/notebook'
import { getSupabaseBrowser } from '@/lib/supabase/client'

export default function SavedSessionsPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<NotebookTopic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowser()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const results = await listNotebookTopics(user.id)
        setTopics(results)
      } catch (err) {
        console.error('[SavedSessions] Error loading topics:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleOpen = (topic: NotebookTopic) => {
    router.push(`/tutor?sessionId=${topic.id}`)
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[var(--tutor-bg)] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Saved Sessions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Sessions you&apos;ve saved to your notebook from the Tutor.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
                <div className="h-5 w-2/3 bg-slate-200 rounded mb-3" />
                <div className="h-4 w-full bg-slate-100 rounded mb-2" />
                <div className="h-4 w-1/3 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600 font-medium">No saved sessions yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Open the Tutor and click &quot;Save to Notebook&quot; on any AI response.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleOpen(topic)}
                className="w-full text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-400 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                      {topic.title}
                    </h2>
                    {topic.description && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                        {topic.description}
                      </p>
                    )}
                    {topic.lastStudiedAt && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        Saved {new Date(topic.lastStudiedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 flex-shrink-0 mt-1 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

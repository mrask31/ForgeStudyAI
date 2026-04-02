'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, ArrowRight } from 'lucide-react'

const SUBJECTS = [
  'Math',
  'Science',
  'English/ELA',
  'History',
  'Foreign Language',
  'Art',
  'Other',
] as const

export function SubjectEntryForm() {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')

  const handleStart = () => {
    if (!subject) return

    const prefill = topic.trim()
      ? `I need help with ${subject}. Specifically: ${topic.trim()}`
      : `I need help with ${subject}. Can you help me study?`

    localStorage.setItem('forgestudy-tutor-prefill', prefill)
    localStorage.setItem('forgestudy-tutor-auto-send', 'true')
    router.push('/tutor?intent=new_question')
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-indigo-400" />
        <h3 className="text-base font-semibold text-white">What are you studying?</h3>
      </div>

      <div className="space-y-3">
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
        >
          <option value="" className="text-slate-400">Choose a subject...</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What specifically are you working on? (optional)"
          className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && subject) handleStart()
          }}
        />

        <button
          onClick={handleStart}
          disabled={!subject}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Start Studying
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { CalendarDays, X } from 'lucide-react'

export function TestCountdownBanner() {
  const searchParams = useSearchParams()
  const classId = searchParams.get('classId')
  const className = searchParams.get('className') || 'Class'
  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [testDate, setTestDate] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dateInput, setDateInput] = useState('')
  const [postTest, setPostTest] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!classId) return
    supabase
      .from('student_classes')
      .select('next_test_date')
      .eq('id', classId)
      .single()
      .then(({ data }: { data: any }) => {
        if (data?.next_test_date) {
          setTestDate(data.next_test_date)
        }
      })
      .catch(() => {})
  }, [classId, supabase])

  const saveTestDate = async () => {
    if (!classId || !dateInput) return
    const date = new Date(dateInput).toISOString()
    await supabase.from('student_classes').update({ next_test_date: date }).eq('id', classId)
    setTestDate(date)
    setShowDatePicker(false)
  }

  const clearTestDate = async () => {
    if (!classId) return
    await supabase.from('student_classes').update({ next_test_date: null }).eq('id', classId)
    setTestDate(null)
    setPostTest(false)
  }

  if (!classId || dismissed) return null

  // Calculate days until test
  if (testDate) {
    const now = new Date()
    const test = new Date(testDate)
    const diffMs = test.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    // Post-test check (within 48 hours after)
    if (diffDays < 0 && diffDays >= -2) {
      if (!postTest) setPostTest(true)
      return (
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/60 border-b border-slate-700/50">
          <span className="text-xs text-slate-300">How did your {decodeURIComponent(className)} test go?</span>
          <div className="flex items-center gap-2">
            <button onClick={() => { clearTestDate(); setDismissed(true) }} className="text-lg hover:scale-110 transition-transform" title="It went well">😊</button>
            <button onClick={() => {
              clearTestDate()
              // Dispatch message to tutor
              if (typeof window !== 'undefined') {
                localStorage.setItem('forgestudy-tutor-prefill', `I just got my ${decodeURIComponent(className)} test back and it didn't go well. Can we figure out what I missed?`)
                localStorage.setItem('forgestudy-tutor-auto-send', 'true')
                window.location.reload()
              }
            }} className="text-lg hover:scale-110 transition-transform" title="Not great">😟</button>
          </div>
        </div>
      )
    }

    // Past test (> 48 hours ago) — hide
    if (diffDays < -2) return null

    // Color based on urgency
    const color = diffDays <= 1 ? 'text-red-400' : diffDays <= 3 ? 'text-amber-400' : 'text-slate-400'

    return (
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/40 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <CalendarDays className={`w-3.5 h-3.5 ${color}`} />
          <span className={`text-xs font-medium ${color}`}>
            {decodeURIComponent(className)} test in {diffDays} day{diffDays !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-slate-600 hover:text-slate-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  // No test date — show "Set date" link
  if (showDatePicker) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/40 border-b border-slate-700/50">
        <input
          type="date"
          value={dateInput}
          onChange={e => setDateInput(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
        />
        <button onClick={saveTestDate} disabled={!dateInput} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">Save</button>
        <button onClick={() => setShowDatePicker(false)} className="text-xs text-slate-500">Cancel</button>
      </div>
    )
  }

  return (
    <div className="px-4 py-1.5 border-b border-slate-700/30">
      <button onClick={() => setShowDatePicker(true)} className="text-xs text-slate-500 hover:text-indigo-400 transition-colors">
        📝 Set test date
      </button>
    </div>
  )
}

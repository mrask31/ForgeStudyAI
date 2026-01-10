'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { StudentClass, ClassType } from '@/lib/types'
import { listClasses } from '@/lib/api/classes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Edit, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  fundamentals: 'Fundamentals',
  med_surg: 'Med-Surg',
  pharm: 'Pharmacology',
  peds: 'Pediatrics',
  ob: 'OB/GYN',
  psych: 'Psychiatric',
  other: 'Other',
}

interface ClassListProps {
  onEdit: (classItem: StudentClass) => void
  onAddClass?: () => void
}

export default function ClassList({ onEdit, onAddClass }: ClassListProps) {
  const router = useRouter()
  const [classes, setClasses] = useState<StudentClass[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        loadClasses(user.id)
      } else {
        setLoading(false)
      }
    })
  }, [])

  const loadClasses = async (uid: string) => {
    setLoading(true)
    const classList = await listClasses(uid)
    setClasses(classList)
    setLoading(false)
  }

  const handleOpenNotebook = (classId: string) => {
    router.push(`/classes/${classId}`)
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-[var(--tutor-text-muted)]">
        Loading classes...
      </div>
    )
  }

  if (classes.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-400" />
        <p className="text-[var(--tutor-text-muted)] mb-2">No classes added yet.</p>
        <p className="text-sm text-[var(--tutor-text-muted)] mb-6">
          Add your first class to personalize your tutor.
        </p>
        {onAddClass && (
          <button
            onClick={onAddClass}
            className="inline-flex items-center px-4 py-2 rounded-full border border-slate-300 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Add your first class
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {classes.map((classItem) => (
        <div
          key={classItem.id}
          className="bg-white border border-[var(--tutor-border-subtle)] rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[var(--tutor-text-main)] mb-1">
                {classItem.code}
              </h3>
              <p className="text-sm text-[var(--tutor-text-muted)]">
                {classItem.name}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(classItem)}
              className="shrink-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className="text-xs">
              {CLASS_TYPE_LABELS[classItem.type]}
            </Badge>
            {classItem.nextExamDate && (
              <div className="flex items-center gap-1 text-xs text-[var(--tutor-text-muted)]">
                <Calendar className="w-3 h-3" />
                <span>Exam: {new Date(classItem.nextExamDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--tutor-border-subtle)]">
            <span className="text-xs text-[var(--tutor-text-muted)]">
              Tracked in Clinical Notebook
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenNotebook(classItem.id)}
            >
              Open Notebook
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}


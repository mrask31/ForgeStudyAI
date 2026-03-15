'use client'

import { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { StudentClass, ClassType } from '@/lib/types'
import { createClass, updateClass } from '@/lib/api/classes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const CLASS_TYPES: { value: ClassType; label: string }[] = [
  { value: 'math', label: 'Math' },
  { value: 'science', label: 'Science' },
  { value: 'english', label: 'English' },
  { value: 'history', label: 'History' },
  { value: 'foreign_language', label: 'Foreign Language' },
  { value: 'arts', label: 'Arts' },
  { value: 'elective', label: 'Elective' },
  { value: 'other', label: 'Other' },
]

interface ClassFormProps {
  classItem?: StudentClass | null
  onSuccess: () => void
  onCancel: () => void
}

export default function ClassForm({ classItem, onSuccess, onCancel }: ClassFormProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'other' as ClassType,
    startDate: '',
    endDate: '',
    nextExamDate: '',
    notes: '',
  })

  useEffect(() => {
    const supabase = getSupabaseBrowser()

    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (user) {
        setUserId(user.id)
      }
    })
  }, [])

  useEffect(() => {
    if (classItem) {
      setFormData({
        code: classItem.code,
        name: classItem.name,
        type: classItem.type,
        startDate: classItem.startDate || '',
        endDate: classItem.endDate || '',
        nextExamDate: classItem.nextExamDate || '',
        notes: classItem.notes || '',
      })
    }
  }, [classItem])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setLoading(true)
    try {
      if (classItem) {
        await updateClass(userId, classItem.id, formData)
      } else {
        await createClass(userId, formData)
      }
      onSuccess()
    } catch (error) {
      console.error('Error saving class:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Class Code *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="MATH 101"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Class Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Algebra I"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Class Type *</Label>
        <select
          id="type"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as ClassType })}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          required
        >
          {CLASS_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nextExamDate">Next Exam</Label>
          <Input
            id="nextExamDate"
            type="date"
            value={formData.nextExamDate}
            onChange={(e) => setFormData({ ...formData, nextExamDate: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes about this class..."
          rows={3}
        />
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {classItem ? 'Update Class' : 'Add Class'}
        </Button>
      </div>
    </form>
  )
}


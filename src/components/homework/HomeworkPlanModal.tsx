'use client'

import { ClipboardList } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import ToolPanel from '@/components/ui/tool-panel'

interface HomeworkTask {
  title: string
  due_date?: string | null
  estimated_minutes?: number | null
  priority?: number | null
}

interface HomeworkPlanModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string | null
  tasks: HomeworkTask[]
  planMarkdown?: string | null
}

export default function HomeworkPlanModal({
  isOpen,
  onClose,
  title,
  tasks,
  planMarkdown,
}: HomeworkPlanModalProps) {
  if (!isOpen) return null

  return (
    <ToolPanel
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'Tonight Plan'}
      icon={<ClipboardList className="w-5 h-5 text-amber-600" />}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Extracted tasks</h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-600">No tasks extracted yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-700">
              {tasks.map((task, index) => (
                <li key={index} className="flex flex-col">
                  <span className="font-medium">{task.title}</span>
                  <span className="text-xs text-slate-500">
                    {task.due_date ? `Due ${task.due_date}` : 'No due date'} •{' '}
                    {task.estimated_minutes ? `${task.estimated_minutes} min` : 'No estimate'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Tonight plan</h3>
          {planMarkdown ? (
            <div className="prose prose-slate max-w-none text-sm text-slate-700">
              <ReactMarkdown>{planMarkdown}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-slate-600">No plan generated yet.</p>
          )}
        </div>
      </div>
    </ToolPanel>
  )
}

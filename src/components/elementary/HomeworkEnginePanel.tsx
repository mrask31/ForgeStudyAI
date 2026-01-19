'use client'

import { useEffect, useMemo, useState } from 'react'

interface HomeworkEnginePanelProps {
  profileId: string
  onStartSession: (prompt: string) => void
}

type HomeworkTask = { id: string; title: string; status: string; order_index: number }
type HomeworkList = { id: string; title: string; homework_tasks: HomeworkTask[] }

export default function HomeworkEnginePanel({ profileId, onStartSession }: HomeworkEnginePanelProps) {
  const [taskInput, setTaskInput] = useState('')
  const [lists, setLists] = useState<HomeworkList[]>([])
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [stepsInput, setStepsInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const activeList = lists[0]
  const activeTask = useMemo(() => activeList?.homework_tasks?.find((t) => t.id === activeTaskId) || null, [activeList, activeTaskId])

  useEffect(() => {
    const loadLists = async () => {
      const response = await fetch(`/api/elementary/homework/lists?profileId=${profileId}`)
      if (!response.ok) return
      const payload = await response.json()
      setLists(payload?.lists || [])
      const firstActive = payload?.lists?.[0]?.homework_tasks?.find((t: HomeworkTask) => t.status === 'active')
      setActiveTaskId(firstActive?.id || null)
    }
    loadLists()
  }, [profileId])

  const handleSaveList = async () => {
    if (!taskInput.trim()) return
    setIsSaving(true)
    const tasks = taskInput
      .split('\n')
      .map((task) => task.trim())
      .filter(Boolean)
    const response = await fetch('/api/elementary/homework/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, tasks }),
    })
    setIsSaving(false)
    if (!response.ok) return
    setTaskInput('')
    const refreshed = await fetch(`/api/elementary/homework/lists?profileId=${profileId}`)
    const payload = await refreshed.json()
    setLists(payload?.lists || [])
  }

  const pickFirstTask = async () => {
    if (!activeList) return
    const nextTask = activeList.homework_tasks.find((task) => task.status !== 'completed')
    if (!nextTask) return
    await fetch(`/api/elementary/homework/lists/${activeList.id}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, taskId: nextTask.id, status: 'active' }),
    })
    setActiveTaskId(nextTask.id)
    onStartSession(`Help me start this homework task: ${nextTask.title}. Break it into small steps.`)
  }

  const markTaskComplete = async (taskId: string) => {
    if (!activeList) return
    await fetch(`/api/elementary/homework/lists/${activeList.id}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, taskId, status: 'completed' }),
    })
    const refreshed = await fetch(`/api/elementary/homework/lists?profileId=${profileId}`)
    const payload = await refreshed.json()
    setLists(payload?.lists || [])
  }

  const handleSaveSteps = async () => {
    if (!activeTask) return
    const steps = stepsInput.split('\n').map((step) => step.trim()).filter(Boolean)
    if (steps.length === 0) return
    await fetch(`/api/elementary/homework/tasks/${activeTask.id}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, steps }),
    })
    setStepsInput('')
  }

  return (
    <div className="space-y-4">
      {activeTask && (
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Continue task</p>
              <p className="text-sm font-semibold text-slate-900">{activeTask.title}</p>
            </div>
            <button
              type="button"
              onClick={() => onStartSession(`Help me solve this task step-by-step: ${activeTask.title}`)}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Continue
            </button>
          </div>
        </div>
      )}
      <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Tonight’s homework list</h3>
        <p className="text-sm text-slate-600 mb-4">Add tasks one per line (math worksheet, reading pages, etc.).</p>
        <textarea
          value={taskInput}
          onChange={(event) => setTaskInput(event.target.value)}
          placeholder="Math worksheet\nRead 10 pages\nSpelling practice"
          className="w-full min-h-[110px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleSaveList}
          disabled={isSaving}
          className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Save homework list'}
        </button>
      </div>

      <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3">Pick one task</h3>
        <button
          type="button"
          onClick={pickFirstTask}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
        >
          Start with the next task
        </button>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          {activeList?.homework_tasks?.length ? (
            activeList.homework_tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-2">
                <span className={task.status === 'completed' ? 'line-through text-slate-400' : ''}>
                  {task.title}
                </span>
                {task.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => markTaskComplete(task.id)}
                    className="text-xs text-emerald-700 hover:underline"
                  >
                    Mark done
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Add tasks to get started.</p>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">One problem at a time</h3>
        <p className="text-sm text-slate-600 mb-3">
          {activeTask ? `Active task: ${activeTask.title}` : 'Pick a task to break it into steps.'}
        </p>
        <textarea
          value={stepsInput}
          onChange={(event) => setStepsInput(event.target.value)}
          placeholder="Step 1\nStep 2\nStep 3"
          className="w-full min-h-[90px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSaveSteps}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Save steps
          </button>
          {activeTask && (
            <button
              type="button"
              onClick={() => onStartSession(`Help me solve this task step-by-step: ${activeTask.title}`)}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Start the first step
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

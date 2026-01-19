'use client'

import { useEffect, useMemo, useState } from 'react'

interface HomeworkEnginePanelProps {
  profileId: string
  onStartSession: (prompt: string) => void
  onListStatusChange?: (info: { hasList: boolean; list?: HomeworkList }) => void
  onActiveTaskChange?: (task: HomeworkTask | null) => void
  showContinueCard?: boolean
  showListInput?: boolean
  showTaskPicker?: boolean
  showStepsPanel?: boolean
  listTitle?: string
  listHelperText?: string
  listPlaceholder?: string
  primaryListButtonLabel?: string
  primaryListMode?: 'save' | 'plan'
  showQuickAddRow?: boolean
  showTaskChecklist?: boolean
  taskPickerTitle?: string
  taskPickerButtonLabel?: string
  taskPickerMode?: 'default' | 'coach'
  stepsTitle?: string
  stepsHelperText?: string
  startStepButtonLabel?: string
}

type HomeworkTask = { id: string; title: string; status: string; order_index: number }
type HomeworkList = { id: string; title: string; homework_tasks: HomeworkTask[] }

export default function HomeworkEnginePanel({
  profileId,
  onStartSession,
  onListStatusChange,
  onActiveTaskChange,
  showContinueCard = true,
  showListInput = true,
  showTaskPicker = true,
  showStepsPanel = true,
  listTitle = 'Tonight’s homework list',
  listHelperText = 'Add tasks one per line (math worksheet, reading pages, etc.).',
  listPlaceholder = 'Math worksheet\nRead 10 pages\nSpelling practice',
  primaryListButtonLabel = 'Save homework list',
  primaryListMode = 'save',
  showQuickAddRow = false,
  showTaskChecklist = true,
  taskPickerTitle = 'Pick one task',
  taskPickerButtonLabel = 'Start with the next task',
  taskPickerMode = 'default',
  stepsTitle = 'One problem at a time',
  stepsHelperText,
  startStepButtonLabel = 'Start the first step',
}: HomeworkEnginePanelProps) {
  const [taskInput, setTaskInput] = useState('')
  const [lists, setLists] = useState<HomeworkList[]>([])
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [stepsInput, setStepsInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [quickTaskTitle, setQuickTaskTitle] = useState('')
  const [quickTaskCount, setQuickTaskCount] = useState('')
  const [showAllTasks, setShowAllTasks] = useState(false)

  const activeList = lists[0]
  const activeTask = useMemo(() => activeList?.homework_tasks?.find((t) => t.id === activeTaskId) || null, [activeList, activeTaskId])
  const draftTasks = useMemo(() => taskInput.split('\n').map((task) => task.trim()).filter(Boolean), [taskInput])
  const nextTask = useMemo(() => activeList?.homework_tasks?.find((task) => task.status !== 'completed') || null, [activeList])

  useEffect(() => {
    if (!onListStatusChange) return
    if (!activeList) {
      onListStatusChange({ hasList: false })
      return
    }
    onListStatusChange({ hasList: true, list: activeList })
  }, [activeList, onListStatusChange])

  useEffect(() => {
    if (onActiveTaskChange) {
      onActiveTaskChange(activeTask)
    }
  }, [activeTask, onActiveTaskChange])

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

  const buildPlanMessage = () => {
    if (!taskInput.trim()) {
      return "I’m in grade 3–5. I need help with homework. Make a simple plan and tell me what to do FIRST."
    }
    return `I’m in grade 3–5. Here are my tasks:\n${taskInput}\n\nMake a simple plan and tell me what to do FIRST.`
  }

  const handlePrimaryListAction = async () => {
    if (primaryListMode === 'save') {
      await handleSaveList()
      return
    }
    await handleSaveList()
    onStartSession(buildPlanMessage())
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

  const activateTask = async (task: HomeworkTask) => {
    if (!activeList) return
    await fetch(`/api/elementary/homework/lists/${activeList.id}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, taskId: task.id, status: 'active' }),
    })
    setActiveTaskId(task.id)
    onStartSession(`Help me start this homework task: ${task.title}. Break it into small steps.`)
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

  const handleQuickAdd = () => {
    if (!quickTaskTitle.trim()) return
    const countText = quickTaskCount.trim() ? ` (${quickTaskCount.trim()})` : ''
    const nextLine = `${quickTaskTitle.trim()}${countText}`
    setTaskInput((current) => (current ? `${current}\n${nextLine}` : nextLine))
    setQuickTaskTitle('')
    setQuickTaskCount('')
  }

  return (
    <div className="space-y-4">
      {showContinueCard && activeTask && (
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
      {showListInput && (
        <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">{listTitle}</h3>
          <p className="text-sm text-slate-600 mb-4">{listHelperText}</p>
          {showQuickAddRow && (
            <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_150px_auto]">
              <input
                value={quickTaskTitle}
                onChange={(event) => setQuickTaskTitle(event.target.value)}
                placeholder="Task name"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={quickTaskCount}
                onChange={(event) => setQuickTaskCount(event.target.value)}
                placeholder="How many?"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleQuickAdd}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                Add
              </button>
            </div>
          )}
          <textarea
            value={taskInput}
            onChange={(event) => setTaskInput(event.target.value)}
            placeholder={listPlaceholder}
            className="w-full min-h-[110px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handlePrimaryListAction}
            disabled={isSaving}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : primaryListButtonLabel}
          </button>
          {showTaskChecklist && (
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {(draftTasks.length ? draftTasks : activeList?.homework_tasks?.map((task) => task.title) || []).length ? (
                (draftTasks.length ? draftTasks : activeList?.homework_tasks?.map((task) => task.title) || []).map((task, index) => (
                  <div key={`${task}-${index}`} className="flex items-center gap-2">
                    <input type="checkbox" checked={false} readOnly />
                    <span>{task}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Add tasks to see your list.</p>
              )}
            </div>
          )}
        </div>
      )}

      {showTaskPicker && (
        <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">{taskPickerTitle}</h3>
          {taskPickerMode === 'coach' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
              <p className="text-xs uppercase text-emerald-700 font-semibold">Start here</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                Start with: {nextTask?.title || 'Add a task to get started'}
              </p>
              <p className="text-xs text-slate-600 mt-1">Why: quickest win / easiest first.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={pickFirstTask}
                  disabled={!nextTask}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Start this task
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllTasks(true)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  Pick a different task
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={pickFirstTask}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              {taskPickerButtonLabel}
            </button>
          )}
          <div className="space-y-2 text-sm text-slate-700">
            {(taskPickerMode !== 'coach' || showAllTasks) && activeList?.homework_tasks?.length ? (
              activeList.homework_tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-2">
                  <span className={task.status === 'completed' ? 'line-through text-slate-400' : ''}>
                    {task.title}
                  </span>
                  {task.status !== 'completed' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => activateTask(task)}
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        Start
                      </button>
                      <button
                        type="button"
                        onClick={() => markTaskComplete(task.id)}
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        Mark done
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : activeList?.homework_tasks?.length ? null : (
              <p className="text-sm text-slate-500">Add tasks to get started.</p>
            )}
          </div>
          {taskPickerMode === 'coach' && activeList?.homework_tasks?.length ? (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase text-slate-500 font-semibold">Tonight plan</p>
              <ol className="mt-2 space-y-1 text-sm text-slate-700">
                {activeList.homework_tasks.slice(0, 3).map((task, index) => (
                  <li key={task.id}>{index + 1}. {task.title}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      )}

      {showStepsPanel && (
        <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">{stepsTitle}</h3>
          <p className="text-sm text-slate-600 mb-3">
            {stepsHelperText || (activeTask ? `Active task: ${activeTask.title}` : 'Pick a task to break it into steps.')}
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
                {startStepButtonLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

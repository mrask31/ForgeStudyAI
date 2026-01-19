'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Clock, ChevronDown, ChevronUp, GraduationCap, Trash2, MessageSquare, FileText, Sparkles, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'

interface Chat {
  id: string
  title: string | null
  session_type: string | null
  updated_at: string
  metadata?: {
    classId?: string
    class_id?: string
    [key: string]: any
  }
}

type Mode = 'tutor' | 'reflections'

// Icon mapping for session types
const getSessionIcon = (sessionType: string | null) => {
  switch (sessionType) {
    case 'reflection':
      return Brain
    case 'snapshot':
      return Sparkles
    case 'question':
      return MessageSquare
    case 'notes':
      return FileText
    default:
      return MessageSquare
  }
}

// Badge text for session types
const getSessionBadge = (sessionType: string | null) => {
  switch (sessionType) {
    case 'reflection':
      return 'Reflection'
    case 'snapshot':
      return 'Snapshot'
    case 'question':
      return 'Question'
    case 'notes':
      return 'Notes'
    default:
      return 'General'
  }
}

interface HistorySheetProps {
  mode: Mode
  trigger?: React.ReactNode
}

export default function HistorySheet({ mode, trigger }: HistorySheetProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentMode = mode
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set(['general']))
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch chats for history (include archived chats)
  useEffect(() => {
    const fetchChats = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/chats/list?includeArchived=true', {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setChats(data.chats || [])
        } else {
          console.error('Failed to fetch chats:', response.status, response.statusText)
          setChats([])
        }
      } catch (error) {
        console.error('[HistorySheet] Failed to fetch chats:', error)
        setChats([])
      } finally {
        setIsLoading(false)
      }
    }

    if (isHistoryOpen) {
      fetchChats()
    }
  }, [isHistoryOpen])

  // Filter chats by mode
  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      if (currentMode === 'tutor') {
        return !chat.session_type || chat.session_type === 'general' || chat.session_type === 'question' || chat.session_type === 'snapshot'
      } else if (currentMode === 'reflections') {
        return chat.session_type === 'reflection'
      }
      return true
    })
  }, [chats, currentMode])

  const handleChatClick = (chatId: string, classId?: string | null) => {
    const url = classId
      ? `/tutor?mode=${currentMode}&sessionId=${chatId}&classId=${classId}`
      : `/tutor?mode=${currentMode}&sessionId=${chatId}`
    router.push(url)
    setIsHistoryOpen(false)
  }

  const handleToggleSelectAll = () => {
    if (selectedChatIds.size === filteredChats.length) {
      setSelectedChatIds(new Set())
    } else {
      setSelectedChatIds(new Set(filteredChats.map(chat => chat.id)))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedChatIds.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedChatIds.size} chat${selectedChatIds.size === 1 ? '' : 's'}? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/chats/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ chatIds: Array.from(selectedChatIds) }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('[HistorySheet] Failed to delete chats:', error)
        alert('Failed to delete chats. Please try again.')
        return
      }

      const currentSessionId = searchParams.get('sessionId') || searchParams.get('chatId')
      const wasCurrentSessionDeleted = currentSessionId && selectedChatIds.has(currentSessionId)
      
      setChats(prev => prev.filter(chat => !selectedChatIds.has(chat.id)))
      setSelectedChatIds(new Set())
      
      if (wasCurrentSessionDeleted) {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('sessionId')
        params.delete('chatId')
        params.delete('id')
        router.replace(`/tutor?${params.toString()}`)
      }
    } catch (error) {
      console.error('[HistorySheet] Error deleting chats:', error)
      alert('Failed to delete chats. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Group chats by class, then by time
  const groupChatsByClassAndTime = (chats: Chat[]) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)

    const chatsByClass = new Map<string, Chat[]>()
    
    chats.forEach((chat) => {
      const classId = chat.metadata?.classId || chat.metadata?.class_id || null
      const key = classId || 'general'
      
      if (!chatsByClass.has(key)) {
        chatsByClass.set(key, [])
      }
      chatsByClass.get(key)!.push(chat)
    })

    const result: Array<{
      classLabel: string
      classId: string | null
      timeGroups: Array<{ label: string; chats: Chat[] }>
    }> = []

    if (chatsByClass.has('general')) {
      const generalChats = chatsByClass.get('general')!
      const timeGroups: Array<{ label: string; chats: Chat[] }> = [
        { label: 'Today', chats: [] },
        { label: 'Yesterday', chats: [] },
        { label: 'Earlier this week', chats: [] },
        { label: 'Older', chats: [] },
      ]

      generalChats.forEach((chat) => {
        const chatDate = new Date(chat.updated_at)
        if (chatDate >= today) {
          timeGroups[0].chats.push(chat)
        } else if (chatDate >= yesterday) {
          timeGroups[1].chats.push(chat)
        } else if (chatDate >= thisWeek) {
          timeGroups[2].chats.push(chat)
        } else {
          timeGroups[3].chats.push(chat)
        }
      })

      result.push({
        classLabel: 'General Tutor',
        classId: null,
        timeGroups: timeGroups.filter(tg => tg.chats.length > 0)
      })
    }

    // Add class-based chats (you'd need to fetch class names here)
    chatsByClass.forEach((classChats, classId) => {
      if (classId === 'general') return

      const timeGroups: Array<{ label: string; chats: Chat[] }> = [
        { label: 'Today', chats: [] },
        { label: 'Yesterday', chats: [] },
        { label: 'Earlier this week', chats: [] },
        { label: 'Older', chats: [] },
      ]

      classChats.forEach((chat) => {
        const chatDate = new Date(chat.updated_at)
        if (chatDate >= today) {
          timeGroups[0].chats.push(chat)
        } else if (chatDate >= yesterday) {
          timeGroups[1].chats.push(chat)
        } else if (chatDate >= thisWeek) {
          timeGroups[2].chats.push(chat)
        } else {
          timeGroups[3].chats.push(chat)
        }
      })

      result.push({
        classLabel: `Class ${classId.substring(0, 8)}...`, // Placeholder - would need actual class name
        classId,
        timeGroups: timeGroups.filter(tg => tg.chats.length > 0)
      })
    })

    return result
  }

  const defaultTrigger = (
    <button className="group flex items-center gap-3 rounded-lg px-4 py-3.5 text-sm font-medium transition-all duration-200 text-indigo-300 hover:bg-gradient-to-r hover:from-indigo-900/50 hover:to-purple-900/50 hover:text-indigo-100 w-full">
      <Clock className="h-5 w-5" />
      <span>History</span>
    </button>
  )

  return (
    <Sheet open={isHistoryOpen} onOpenChange={(open) => {
      setIsHistoryOpen(open)
      if (!open) {
        setSelectedChatIds(new Set())
      }
    }}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent side="right" className="w-80 p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <SheetTitle className="text-slate-900 font-semibold tracking-tight">Session History</SheetTitle>
              <p className="text-xs text-slate-600 mt-1">
                Quickly return to past learning moments.
              </p>
            </div>
            {filteredChats.length > 0 && (
              <div className="flex items-center gap-2">
                {selectedChatIds.size > 0 ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={isDeleting}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete ({selectedChatIds.size})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedChatIds(new Set())}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleSelectAll}
                    className="text-xs text-slate-600"
                  >
                    Select
                  </Button>
                )}
              </div>
            )}
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="p-6 text-center text-slate-600">Loading...</div>
          ) : filteredChats.length === 0 ? (
            <div className="p-6 text-center text-slate-600">No chats yet</div>
          ) : (
            <div className="p-4">
              {groupChatsByClassAndTime(filteredChats).map((classGroup, classIndex) => {
                const classKey = classGroup.classId || 'general'
                const isExpanded = expandedClasses.has(classKey)
                const totalChats = classGroup.timeGroups.reduce((sum, tg) => sum + tg.chats.length, 0)

                return (
                  <div key={classKey} className={classIndex > 0 ? 'mt-6' : ''}>
                    <button
                      onClick={() => {
                        setExpandedClasses(prev => {
                          const next = new Set(prev)
                          if (next.has(classKey)) {
                            next.delete(classKey)
                          } else {
                            next.add(classKey)
                          }
                          return next
                        })
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2 py-2 mb-2 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <GraduationCap className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <h2 className="text-sm font-semibold text-slate-900 truncate">
                          {classGroup.classLabel}
                        </h2>
                        <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                          {totalChats} {totalChats === 1 ? 'chat' : 'chats'}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0 transition-colors" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0 transition-colors" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="pl-2">
                        {classGroup.timeGroups.map((timeGroup, timeIndex) => (
                          <div key={timeIndex} className="mb-6">
                            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide px-2 mb-2">
                              {timeGroup.label}
                            </h3>
                            {timeGroup.chats.map((chat) => {
                              const Icon = getSessionIcon(chat.session_type)
                              const badge = getSessionBadge(chat.session_type)
                              const currentSessionId = searchParams.get('sessionId') || searchParams.get('chatId')
                              const isActive = currentSessionId === chat.id
                              const isSelected = selectedChatIds.has(chat.id)

                              return (
                                <div
                                  key={chat.id}
                                  className={`w-full p-3 rounded-lg mb-1 transition-colors ${
                                    isActive && !isSelected
                                      ? 'bg-indigo-50 border border-indigo-200'
                                      : isSelected
                                      ? 'bg-blue-50 border border-blue-200'
                                      : 'hover:bg-slate-50 border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        setSelectedChatIds(prev => {
                                          const next = new Set(prev)
                                          if (checked) {
                                            next.add(chat.id)
                                          } else {
                                            next.delete(chat.id)
                                          }
                                          return next
                                        })
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="mt-0.5 flex-shrink-0"
                                    />
                                    <button
                                      onClick={(e) => {
                                        if (selectedChatIds.size > 0) {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          setSelectedChatIds(prev => {
                                            const next = new Set(prev)
                                            if (next.has(chat.id)) {
                                              next.delete(chat.id)
                                            } else {
                                              next.add(chat.id)
                                            }
                                            return next
                                          })
                                        } else {
                                          handleChatClick(chat.id, classGroup.classId)
                                        }
                                      }}
                                      className="flex-1 text-left min-w-0"
                                    >
                                      <div className="flex items-start gap-2">
                                        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-500" />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="text-sm font-medium text-slate-900 truncate">
                                              {chat.title || 'Untitled Chat'}
                                            </span>
                                            <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                              {badge}
                                            </span>
                                          </div>
                                          <span className="text-xs text-slate-500">
                                            {formatTime(chat.updated_at)}
                                          </span>
                                        </div>
                                      </div>
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}


'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { MessageSquare, FileText, Sparkles, Brain } from 'lucide-react'
import { listClasses } from '@/lib/api/classes'
import { StudentClass } from '@/lib/types'
import { createBrowserClient } from '@supabase/ssr'

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

interface HistoryButtonProps {
  onNavigate?: () => void
}

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

export default function HistoryButton({ onNavigate }: HistoryButtonProps) {
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [classes, setClasses] = useState<StudentClass[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set<string>())
  
  // Toggle class expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set<string>())
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch chats and classes for history
  useEffect(() => {
    if (!isHistoryOpen) return

    const fetchData = async () => {
      setIsLoading(true)
      try {
        await fetch('/api/chats/backfill-tools', { method: 'POST', credentials: 'include' })

        // Fetch chats
        const chatsResponse = await fetch('/api/chats/list?includeArchived=true', {
          credentials: 'include',
        })

        if (chatsResponse.ok) {
          const chatsData = await chatsResponse.json()
          setChats((chatsData.chats || []) as Chat[])
        }

        // Fetch classes to map IDs to names
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const userClasses = await listClasses(user.id)
          setClasses(userClasses)
        }
      } catch (error) {
        console.error('[HistoryButton] Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [isHistoryOpen])

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

  const getToolKey = (chat: Chat) => {
    const entryMode = chat.metadata?.entryMode
    if (entryMode && ['spelling', 'reading', 'homework'].includes(entryMode)) {
      return entryMode
    }
    const tool = chat.metadata?.tool
    if (tool && ['study-map', 'practice', 'exam', 'writing'].includes(tool)) {
      return tool
    }
    return 'general'
  }

  const getToolLabel = (toolKey: string) => {
    switch (toolKey) {
      case 'study-map':
        return 'Study Map'
      case 'practice':
        return 'Practice Mode'
      case 'exam':
        return 'Exam Sheets'
      case 'writing':
        return 'Writing Lab'
      case 'spelling':
        return 'Spelling'
      case 'reading':
        return 'Reading'
      case 'homework':
        return 'Homework Helper'
      default:
        return 'General Tutor'
    }
  }

  // Group chats by tool/class and time
  const groupedChats = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)

    // Create a map of classId -> class name/code
    const classMap = new Map<string, { code: string; name: string }>()
    classes.forEach((cls) => {
      classMap.set(cls.id, { code: cls.code, name: cls.name })
    })

    const chatsByGroup = new Map<string, { toolKey: string; classId: string; chats: Chat[] }>()
    
    chats.forEach((chat) => {
      const classId = chat.metadata?.classId || chat.metadata?.class_id || 'general'
      const toolKey = getToolKey(chat)
      const groupId = `${toolKey}:${classId}`
      if (!chatsByGroup.has(groupId)) {
        chatsByGroup.set(groupId, { toolKey, classId, chats: [] })
      }
      chatsByGroup.get(groupId)!.chats.push(chat)
    })

    const result: Array<{
      label: string
      groupId: string
      timeGroups: Array<{ label: string; chats: Chat[] }>
    }> = []

    chatsByGroup.forEach((group) => {
      const timeGroups: Array<{ label: string; chats: Chat[] }> = [
        { label: 'Today', chats: [] },
        { label: 'Yesterday', chats: [] },
        { label: 'Earlier this week', chats: [] },
        { label: 'Older', chats: [] },
      ]

      group.chats.forEach((chat) => {
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

      const filteredTimeGroups = timeGroups.filter(group => group.chats.length > 0)
      if (filteredTimeGroups.length > 0) {
        const toolLabel = getToolLabel(group.toolKey)
        let classLabel: string | null = null
        if (group.classId !== 'general') {
          const classInfo = classMap.get(group.classId)
          if (classInfo) {
            classLabel = `${classInfo.code} - ${classInfo.name}`
          } else {
            // Fallback if class not found (might have been deleted)
            classLabel = `Class ${group.classId.substring(0, 8)}...`
          }
        }
        const label = classLabel ? `${toolLabel} • ${classLabel}` : toolLabel
        
        result.push({
          label,
          groupId: `${group.toolKey}:${group.classId}`,
          timeGroups: filteredTimeGroups,
        })
      }
    })

    return result
  }, [chats, classes])

  const handleChatClick = (chat: Chat) => {
    const params = new URLSearchParams()
    if (chat.session_type === 'reflection') {
      params.set('mode', 'reflections')
    } else if (chat.metadata?.entryMode) {
      params.set('mode', chat.metadata.entryMode)
    } else if (chat.metadata?.tool) {
      params.set('tool', chat.metadata.tool)
    } else {
      params.set('mode', 'tutor')
    }
    params.set('sessionId', chat.id)
    const url = `/tutor?${params.toString()}`
    router.push(url)
    setIsHistoryOpen(false)
    onNavigate?.()
  }

  const handleDeleteSelected = async () => {
    if (selectedChatIds.size === 0) return

    setIsDeleting(true)
    try {
      const response = await fetch('/api/chats/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ chatIds: Array.from(selectedChatIds) }),
      })

      if (response.ok) {
        setChats(prev => prev.filter(chat => !selectedChatIds.has(chat.id)))
        setSelectedChatIds(new Set<string>())
      }
    } catch (error) {
      console.error('[HistoryButton] Error deleting chats:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Sheet open={isHistoryOpen} onOpenChange={(open) => {
      setIsHistoryOpen(open)
      if (!open) {
        setSelectedChatIds(new Set<string>())
      }
    }}>
      <SheetTrigger asChild>
        <button
          className="w-full flex items-center gap-3 rounded-lg px-4 py-3.5 text-sm font-medium transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-indigo-400"
        >
          <Clock className="h-5 w-5" />
          <span>History</span>
        </button>
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
            {selectedChatIds.size > 0 && (
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
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-sm">Loading history...</p>
            </div>
          ) : groupedChats.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-1">No session history yet</p>
              <p className="text-xs">Start a conversation to see it here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedChats.map((group) => {
                const isExpanded = expandedGroups.has(group.groupId)
                const totalChats = group.timeGroups.reduce((sum, tg) => sum + tg.chats.length, 0)
                
                return (
                  <div key={group.groupId} className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* Class Header - Clickable to expand/collapse */}
                    <button
                      onClick={() => toggleGroup(group.groupId)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        )}
                        <h3 className="text-sm font-semibold text-slate-700">
                          {group.label}
                        </h3>
                        <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                          {totalChats}
                        </span>
                      </div>
                    </button>
                    
                    {/* Time Groups - Only show when expanded */}
                    {isExpanded && (
                      <div className="px-4 py-3 space-y-4 bg-white">
                        {group.timeGroups.map((timeGroup) => (
                          <div key={timeGroup.label}>
                            <h4 className="text-xs font-medium text-slate-400 mb-2">{timeGroup.label}</h4>
                            <div className="space-y-1">
                              {timeGroup.chats.map((chat) => {
                                const Icon = getSessionIcon(chat.session_type)
                                const badge = getSessionBadge(chat.session_type)
                                const isSelected = selectedChatIds.has(chat.id)
                                return (
                                  <div
                                    key={chat.id}
                                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                                      isSelected
                                        ? 'bg-indigo-50 border-indigo-300'
                                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                                    }`}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        const isChecked = checked === true
                                        if (isChecked) {
                                          setSelectedChatIds((prev: Set<string>) => {
                                            const arr: string[] = Array.from(prev)
                                            arr.push(chat.id)
                                            return new Set<string>(arr)
                                          })
                                        } else {
                                          setSelectedChatIds((prev: Set<string>) => {
                                            const arr: string[] = Array.from(prev)
                                            const index = arr.indexOf(chat.id)
                                            if (index > -1) {
                                              arr.splice(index, 1)
                                            }
                                            return new Set<string>(arr)
                                          })
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <button
                                      onClick={() => handleChatClick(chat)}
                                      className="flex-1 text-left min-w-0 flex items-center gap-2"
                                    >
                                      <Icon className="w-4 h-4 flex-shrink-0 text-slate-500" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <span className="text-sm font-medium text-slate-900 truncate">
                                            {chat.title || 'Untitled Chat'}
                                          </span>
                                          <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded shrink-0">
                                            {badge}
                                          </span>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                          {formatTime(chat.updated_at)}
                                        </span>
                                      </div>
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
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


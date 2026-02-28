'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  AlertCircle, Calendar, 
  Flame, Target, GraduationCap, Bookmark, 
  CheckCircle2, Sparkles, Search, Folder, Tag,
  Brain, ChevronRight, MessageSquare, Trash2
} from 'lucide-react'
import { useDensity } from '@/contexts/DensityContext'
import { getDensityTokens } from '@/lib/density-tokens'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@supabase/ssr'
import { listClasses } from '@/lib/api/classes'
import type { StudentClass } from '@/lib/types'
import ReactMarkdown from 'react-markdown'

interface Chat {
  id: string
  title: string | null
  session_type: string | null
  updated_at: string
  metadata?: {
    classId?: string
    class_id?: string
    topicTitle?: string
    topicTerm?: string
    [key: string]: any
  }
}

interface Clip {
  id: string
  title: string
  content: string
  folder: string
  tags: string[]
  created_at: string
  chat_id: string | null
  class_id: string | null
  message_id: string | null
}

interface FocusArea {
  topic: string
  priority: 'high' | 'medium' | 'low'
  lastStudied?: string
  chatId?: string
  messageId?: string // For flagged message pairs
}

export default function LearningDashboard() {
  const { density } = useDensity()
  const tokens = getDensityTokens(density)
  const router = useRouter()
  const [classes, setClasses] = useState<StudentClass[]>([])
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([])
  const [allClips, setAllClips] = useState<Clip[]>([])
  const [filteredClips, setFilteredClips] = useState<Clip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [graduationDate, setGraduationDate] = useState<string | null>(null)
  const [preferredName, setPreferredName] = useState<string | null>(null)
  const [programTrack, setProgramTrack] = useState<string | null>(null)
  const [studyStreak, setStudyStreak] = useState<number>(0)
  const [activeDays, setActiveDays] = useState<number>(0)
  const [topicsStudied, setTopicsStudied] = useState<number>(0)
  const [clipsCount, setClipsCount] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [showAllClips, setShowAllClips] = useState(false)
  const [chatCountsByClass, setChatCountsByClass] = useState<Array<{ classId: string; className: string; classCode: string; count: number }>>([])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Load profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('graduation_date, preferred_name, program_track')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          if (profile.graduation_date) {
            setGraduationDate(profile.graduation_date)
          }
          if (profile.preferred_name) {
            setPreferredName(profile.preferred_name)
          }
          if (profile.program_track) {
            setProgramTrack(profile.program_track)
          }
        }

        // Load classes
        const userClasses = await listClasses(user.id)
        setClasses(userClasses)

        // Load all chats (including archived) to find needsHelp chats
        const chatsRes = await fetch('/api/chats/list?includeArchived=true', {
          credentials: 'include'
        })
        if (chatsRes.ok) {
          const chatsData = await chatsRes.json()
          const allChats = (chatsData.chats || []) as Chat[]
          
          // Filter to tutor mode chats only (not reflections)
          const tutorChats = allChats.filter(chat => 
            !chat.session_type || 
            chat.session_type === 'general' || 
            chat.session_type === 'question' || 
            chat.session_type === 'snapshot'
          )
          

          // Calculate consistency (active days in last 7)
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          const recentActiveDays = new Set(
            tutorChats
              .filter(chat => new Date(chat.updated_at) >= sevenDaysAgo)
              .map(chat => new Date(chat.updated_at).toDateString())
          ).size
          setActiveDays(recentActiveDays)

          // Calculate study streak (consecutive days with activity)
          const sortedChats = [...tutorChats].sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
          let streak = 0
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          for (let i = 0; i < sortedChats.length; i++) {
            const chatDate = new Date(sortedChats[i].updated_at)
            chatDate.setHours(0, 0, 0, 0)
            const daysDiff = Math.floor((today.getTime() - chatDate.getTime()) / (1000 * 60 * 60 * 24))
            
            if (daysDiff === streak) {
              streak++
            } else if (daysDiff > streak) {
              break
            }
          }
          setStudyStreak(streak)

          // Calculate concepts mastered (unique topics from chat titles/metadata)
          const uniqueTopics = new Set(
            tutorChats
              .map(chat => chat.title || chat.metadata?.topicTitle || chat.metadata?.topicTerm)
              .filter(Boolean)
          )
          setTopicsStudied(uniqueTopics.size)

          // Generate focus areas from flagged message pairs
          // Collect all flagged message IDs from all chats
          const flaggedMessagePairs: Array<{ chatId: string; messageId: string; chatTitle: string; updatedAt: string }> = []
          
          for (const chat of allChats) {
            const isTutorChat = !chat.session_type || 
              chat.session_type === 'general' || 
              chat.session_type === 'question' || 
              chat.session_type === 'snapshot'
            
            if (isTutorChat && chat.metadata?.flaggedMessages && Array.isArray(chat.metadata.flaggedMessages)) {
              const flaggedIds = chat.metadata.flaggedMessages as string[]
              for (const messageId of flaggedIds) {
                flaggedMessagePairs.push({
                  chatId: chat.id,
                  messageId,
                  chatTitle: chat.title || chat.metadata?.topicTitle || chat.metadata?.topicTerm || 'Untitled Topic',
                  updatedAt: chat.updated_at
                })
              }
            }
          }
          
          // Sort by most recently updated
          flaggedMessagePairs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          
          // Create focus areas from flagged message pairs
          const focusTopics: FocusArea[] = flaggedMessagePairs.map(pair => ({
            topic: `${pair.chatTitle} (Flagged Q&A)`,
            priority: 'high' as const,
            lastStudied: pair.updatedAt,
            chatId: pair.chatId,
            messageId: pair.messageId // Store messageId for navigation
          }))

          setFocusAreas(focusTopics)

          // Calculate chat counts by class
          const classChatCounts: Array<{ classId: string; className: string; classCode: string; count: number }> = []
          for (const classItem of userClasses) {
            const classChats = tutorChats.filter((chat: Chat) => {
              const chatClassId = chat.metadata?.classId || chat.metadata?.class_id
              return chatClassId === classItem.id
            })
            if (classChats.length > 0) {
              classChatCounts.push({
                classId: classItem.id,
                className: classItem.name,
                classCode: classItem.code,
                count: classChats.length
              })
            }
          }
          // Sort by count (descending)
          classChatCounts.sort((a, b) => b.count - a.count)
          setChatCountsByClass(classChatCounts)
        }

        // Load all clips
        const clipsRes = await fetch('/api/clips/list', {
          credentials: 'include'
        })
        if (clipsRes.ok) {
          const clipsData = await clipsRes.json()
          const clips = (clipsData.clips || []) as Clip[]
          setAllClips(clips)
          setClipsCount(clips.length)
          filterClips(clips, searchQuery, selectedFolder, selectedTag)
        }
      } catch (error) {
        console.error('[Dashboard] Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const filterClips = (clips: Clip[], query: string, folder: string | null, tag: string | null) => {
    let filtered = [...clips]

    if (query) {
      const searchQuery = query.toLowerCase()
      filtered = filtered.filter(
        clip => clip.title.toLowerCase().includes(searchQuery) || clip.content.toLowerCase().includes(searchQuery)
      )
    }

    if (folder) {
      filtered = filtered.filter(clip => clip.folder === folder)
    }

    if (tag) {
      filtered = filtered.filter(clip => clip.tags.includes(tag))
    }

    setFilteredClips(filtered)
  }

  useEffect(() => {
    filterClips(allClips, searchQuery, selectedFolder, selectedTag)
  }, [searchQuery, selectedFolder, selectedTag, allClips])

  const folders = Array.from(new Set(allClips.map(c => c.folder))).sort()
  const tags = Array.from(new Set(allClips.flatMap(c => c.tags))).sort()

  const handleFocusAreaClick = (area: FocusArea) => {
    if (area.chatId) {
      const params = new URLSearchParams()
      params.set('mode', 'tutor')
      params.set('sessionId', area.chatId)
      if (area.messageId) params.set('messageId', area.messageId)
      router.push(`/tutor?${params.toString()}`)
    }
  }

  const handleReviewClip = (clip: Clip) => {
    if (clip.chat_id) {
      const params = new URLSearchParams()
      params.set('mode', 'tutor')
      params.set('sessionId', clip.chat_id)
      if (clip.class_id) params.set('classId', clip.class_id)
      if (clip.message_id) params.set('messageId', clip.message_id)
      router.push(`/tutor?${params.toString()}`)
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('forgenursing-tutor-prefill', `Review this learning moment: ${clip.title}\n\n${clip.content}`)
      }
      const params = new URLSearchParams()
      params.set('mode', 'tutor')
      if (clip.class_id) params.set('classId', clip.class_id)
      router.push(`/tutor?${params.toString()}`)
    }
  }

  const handleDeleteClip = async (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the review clip action
    
    if (!confirm('Are you sure you want to delete this learning moment? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/clips?id=${clipId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete clip')
      }

      // Remove from local state - this will trigger the useEffect to re-filter
      const updatedClips = allClips.filter(c => c.id !== clipId)
      setAllClips(updatedClips)
      setClipsCount(prev => prev - 1)
    } catch (error) {
      console.error('Failed to delete clip:', error)
      alert('Failed to delete clip. Please try again.')
    }
  }

  const formatTimeAgo = (dateString: string) => {
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

  const calculateDaysUntilGraduation = () => {
    if (!graduationDate) return null
    const grad = new Date(graduationDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    grad.setHours(0, 0, 0, 0)
    const diff = grad.getTime() - today.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const daysUntilGrad = calculateDaysUntilGraduation()

  if (isLoading) {
    return (
      <div className="h-full bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
          </div>
          <p className="text-lg font-medium text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const displayClips = showAllClips ? filteredClips : filteredClips.slice(0, 6)

  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      <div className={`${tokens.containerMaxWidth || 'max-w-7xl'} mx-auto px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 pt-safe-t pb-safe-b`}>
        {/* Learning Dashboard Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-start justify-between mb-3 sm:mb-4 flex-wrap gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 flex-shrink-0">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-200">
                    Learning Dashboard
                  </h1>
                  <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-lg sm:rounded-xl shadow-sm">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-indigo-400 rounded-full animate-pulse shadow-sm shadow-indigo-500/50"></div>
                    <span className="text-xs sm:text-sm font-semibold text-indigo-400">Active</span>
                  </div>
                </div>
              </div>
              {/* Student Profile Header */}
              <div className="ml-11 sm:ml-14 max-w-2xl space-y-1 sm:space-y-1.5">
                <p className="text-sm sm:text-base font-medium text-slate-200">
                  Student: {preferredName || 'Student'} • {programTrack || 'General Track'}
                </p>
                {graduationDate && daysUntilGrad !== null && (
                  <p className="text-xs sm:text-sm text-slate-400">
                    {daysUntilGrad > 0 ? (
                      <>
                        Class of {new Date(graduationDate).getFullYear()} • {daysUntilGrad} day{daysUntilGrad === 1 ? '' : 's'} until {new Date(graduationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </>
                    ) : (
                      <>
                        Class of {new Date(graduationDate).getFullYear()} • Graduation reached
                      </>
                    )}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Study Signals Label */}
        <div className="mb-3 sm:mb-4">
          <h2 className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Study Signals
          </h2>
        </div>

        {/* Study Signals Row - Passive Data (Receded) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-xl p-3 sm:p-4 md:p-5 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-indigo-600/20 rounded-lg">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">Streak</span>
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-400 mb-1">{studyStreak}</div>
            <div className="text-xs sm:text-sm text-slate-500">day{studyStreak === 1 ? '' : 's'} consecutive</div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-xl p-3 sm:p-4 md:p-5 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-emerald-600/20 rounded-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">This Week</span>
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-400 mb-1">{activeDays}</div>
            <div className="text-xs sm:text-sm text-slate-500">active day{activeDays === 1 ? '' : 's'}</div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-xl p-3 sm:p-4 md:p-5 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-indigo-600/20 rounded-lg">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">Concepts</span>
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-400 mb-1">{topicsStudied}</div>
            <div className="text-xs sm:text-sm text-slate-500">topics explored</div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-xl p-3 sm:p-4 md:p-5 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-indigo-600/20 rounded-lg">
                <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">Saved</span>
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-400 mb-1">{clipsCount}</div>
            <div className="text-xs sm:text-sm text-slate-500">learning moments</div>
          </div>
        </div>

        {/* Study Activity by Class - Enhanced */}
        {chatCountsByClass.length > 0 && (
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl mb-8 overflow-hidden">
            <div className="bg-slate-900/80 border-b border-slate-800 px-6 py-4">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2.5 mb-1">
                <div className="p-1.5 bg-indigo-600/20 rounded-lg">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                </div>
                Study Activity by Class
              </h3>
              <p className="text-sm text-slate-400 ml-8">See where you're spending the most study time</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {chatCountsByClass.map((item) => (
                  <div
                    key={item.classId}
                    className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl hover:border-indigo-500/30 hover:shadow-md hover:shadow-indigo-500/10 transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-200 truncate">
                        {item.classCode}
                      </span>
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-600/20 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                        {item.count} {item.count === 1 ? 'session' : 'sessions'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{item.className}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid - Medical Chart Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-4 sm:mb-6">
          {/* Left Column: Flagged for Review & Graduation */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            {/* Focus Areas - Medical Alert Panel - Enhanced with Indigo Glow (Primary Action) */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-indigo-500/30 rounded-2xl shadow-xl shadow-[0_0_15px_rgba(99,102,241,0.1)] overflow-hidden">
              <div className="bg-amber-900/20 border-b border-amber-800/50 px-6 py-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold text-amber-400 flex items-center gap-2.5">
                    <div className="p-1.5 bg-amber-600/20 rounded-lg">
                      <Target className="w-4 h-4 text-amber-400" />
                    </div>
                    Flagged for Review
                  </h3>
                  {focusAreas.length > 0 && (
                    <span className="text-xs font-bold text-amber-400 bg-amber-600/20 px-3 py-1 rounded-lg border border-amber-500/30 shadow-sm">
                      {focusAreas.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-400/80 ml-8">Review Queue</p>
              </div>
              <div className="p-6">
                {focusAreas.length > 0 ? (
                  <div className="space-y-3">
                    {focusAreas.slice(0, 5).map((area, index) => (
                      <button
                        key={index}
                        onClick={() => handleFocusAreaClick(area)}
                        className="w-full flex items-center justify-between gap-3 p-4 bg-amber-900/20 border-2 border-amber-800/50 rounded-xl hover:border-amber-600/50 hover:bg-amber-900/30 transition-all duration-200 group text-left transform hover:scale-[1.02]"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                          <span className="text-sm font-semibold text-amber-300 truncate">
                            {area.topic}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600/20 mb-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-300">All clear</p>
                    <p className="text-xs text-slate-500 mt-1">No topics flagged</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Learning Library - Enhanced with Indigo Glow (Primary Action) */}
          <div>
            <div className="bg-slate-900/60 backdrop-blur-md border border-indigo-500/30 rounded-2xl shadow-xl shadow-[0_0_15px_rgba(99,102,241,0.1)] overflow-hidden">
              <div className="bg-slate-900/80 border-b border-slate-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-200 flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-600/20 rounded-lg">
                      <Bookmark className="w-4 h-4 text-indigo-400" />
                    </div>
                    Learning Library
                  </h3>
                  <span className="text-sm font-bold text-slate-400 bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-800">{clipsCount} total</span>
                </div>
              </div>
              
              {/* Search and Filters - Enhanced */}
              <div className="p-6 border-b border-slate-800 space-y-4 bg-slate-900/40">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search learning moments..."
                    className="w-full pl-12 pr-4 py-3 text-sm font-medium border-2 border-slate-800 rounded-xl bg-slate-900/60 backdrop-blur-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
                {(folders.length > 0 || tags.length > 0) && (
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={() => {
                        setSelectedFolder(null)
                        setSelectedTag(null)
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                        !selectedFolder && !selectedTag
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                          : 'bg-slate-900/60 text-slate-300 border-2 border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900/80 shadow-sm'
                      }`}
                    >
                      All
                    </button>
                    {folders.map(folder => (
                      <button
                        key={folder}
                        onClick={() => {
                          setSelectedFolder(folder)
                          setSelectedTag(null)
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center gap-1.5 ${
                          selectedFolder === folder
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                            : 'bg-slate-900/60 text-slate-300 border-2 border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900/80 shadow-sm'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5" />
                        {folder}
                      </button>
                    ))}
                    {tags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          setSelectedTag(tag)
                          setSelectedFolder(null)
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center gap-1.5 ${
                          selectedTag === tag
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                            : 'bg-slate-900/60 text-slate-300 border-2 border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900/80 shadow-sm'
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Clips List - Enhanced */}
              <div className="p-6">
                {displayClips.length > 0 ? (
                  <div className="space-y-4">
                    {displayClips.map((clip) => (
                      <div
                        key={clip.id}
                        className="relative group"
                      >
                        <button
                          onClick={() => handleReviewClip(clip)}
                          className="w-full text-left p-5 rounded-xl border-2 border-slate-800 bg-slate-900/40 hover:border-indigo-500/30 hover:bg-slate-900/60 transition-all duration-200 transform hover:scale-[1.01] shadow-sm hover:shadow-md hover:shadow-indigo-500/10"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                                <h4 className="text-base font-bold text-slate-200 truncate">
                                  {clip.title}
                                </h4>
                                <span className="text-xs font-semibold text-indigo-400 bg-indigo-600/20 px-3 py-1 rounded-lg border border-indigo-500/30">
                                  {clip.folder}
                                </span>
                              </div>
                              <div className="text-sm text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                                {clip.content.substring(0, 150)}...
                              </div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                {clip.tags.slice(0, 3).map(tag => (
                                  <span
                                    key={tag}
                                    className="text-xs font-medium px-2.5 py-1 bg-slate-800/60 text-slate-300 rounded-lg border border-slate-700"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                <span className="text-xs text-slate-500 font-medium">
                                  {formatTimeAgo(clip.created_at)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={(e) => handleDeleteClip(clip.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all duration-200 transform hover:scale-110"
                                title="Delete this learning moment"
                                aria-label="Delete clip"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all duration-200" />
                            </div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-600/20 mb-6">
                      <Bookmark className="w-10 h-10 text-indigo-400" />
                    </div>
                    <p className="text-base font-semibold text-slate-300 mb-2">
                      {allClips.length === 0 ? 'No learning moments saved yet' : 'No clips match your filters'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {allClips.length === 0 && 'Save learning moments during study sessions'}
                    </p>
                  </div>
                )}
                
                {filteredClips.length > 6 && (
                  <div className="mt-6 text-center">
                    <Button
                      onClick={() => setShowAllClips(!showAllClips)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 transition-all duration-200 transform hover:scale-105 active:scale-95 font-semibold"
                    >
                      {showAllClips ? 'Show Less' : `Show All (${filteredClips.length})`}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 italic">
            Dashboard metrics reflect study activity and engagement — not a guarantee of academic performance.
          </p>
        </div>
      </div>
    </div>
  )
}

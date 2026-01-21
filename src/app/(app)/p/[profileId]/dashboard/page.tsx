'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { getStudentProfile, type StudentProfile } from '@/app/actions/student-profiles'
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
  messageId?: string
}

export default function ProfileDashboard() {
  const { density } = useDensity()
  const tokens = getDensityTokens(density)
  const router = useRouter()
  const params = useParams()
  const profileId = params.profileId as string

  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [classes, setClasses] = useState<StudentClass[]>([])
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([])
  const [allClips, setAllClips] = useState<Clip[]>([])
  const [filteredClips, setFilteredClips] = useState<Clip[]>([])
  const [isLoading, setIsLoading] = useState(true)
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
        if (!user) {
          router.push('/login')
          return
        }

        // Load student profile
        const studentProfile = await getStudentProfile(profileId)
        if (!studentProfile) {
          // Profile not found or doesn't belong to user, redirect to profiles
          router.push('/profiles')
          return
        }
        setProfile(studentProfile)

        // Load classes (still uses user.id for now - can be scoped to profile later)
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
            messageId: pair.messageId
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
        console.error('[Profile Dashboard] Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (profileId) {
      loadData()
    }
  }, [profileId, router])

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
    e.stopPropagation()
    
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

  const getGradeBandLabel = (band: string) => {
    const normalizedBand = band === 'elementary' ? 'middle' : band
    switch (normalizedBand) {
      case 'high':
        return 'High School'
      case 'middle':
        return 'Middle School'
      default:
        return normalizedBand
    }
  }

  if (isLoading) {
    return (
      <div className="h-full bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
          </div>
          <p className="text-lg font-medium text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null // Will redirect
  }

  const displayClips = showAllClips ? filteredClips : filteredClips.slice(0, 6)

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50">
      <div className={`${tokens.containerMaxWidth || 'max-w-7xl'} mx-auto px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 pt-safe-t pb-safe-b`}>
        {/* Dashboard Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-start justify-between mb-3 sm:mb-4 flex-wrap gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 flex-shrink-0">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent">
                    Student Dashboard
                  </h1>
                  <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg sm:rounded-xl shadow-sm">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50"></div>
                    <span className="text-xs sm:text-sm font-semibold text-emerald-700">Active</span>
                  </div>
                </div>
              </div>
              {/* Profile Info Header */}
              <div className="ml-11 sm:ml-14 max-w-2xl space-y-1 sm:space-y-1.5">
                <p className="text-sm sm:text-base font-medium text-slate-900">
                  {profile.display_name} • {getGradeBandLabel(profile.grade_band)}
                </p>
                {profile.grade && (
                  <p className="text-xs sm:text-sm text-slate-600">
                    Grade {profile.grade}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Study Vitals Label */}
        <div className="mb-3 sm:mb-4">
          <h2 className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Study Vitals
          </h2>
        </div>

        {/* Vital Signs Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className="bg-white/80 backdrop-blur-sm border-l-4 border-l-orange-500 rounded-xl p-3 sm:p-4 md:p-5 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-orange-200/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">Streak</span>
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1">{studyStreak}</div>
            <div className="text-xs sm:text-sm text-slate-600">day{studyStreak === 1 ? '' : 's'} consecutive</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-l-4 border-l-blue-500 rounded-xl p-3 sm:p-4 md:p-5 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-blue-200/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">This Week</span>
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1">{activeDays}</div>
            <div className="text-xs sm:text-sm text-slate-600">active day{activeDays === 1 ? '' : 's'}</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-l-4 border-l-teal-500 rounded-xl p-3 sm:p-4 md:p-5 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-teal-200/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-teal-100 to-teal-50 rounded-lg">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">Concepts</span>
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1">{topicsStudied}</div>
            <div className="text-xs sm:text-sm text-slate-600">topics explored</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-l-4 border-l-purple-500 rounded-xl p-3 sm:p-4 md:p-5 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-purple-200/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg">
                <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">Saved</span>
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1">{clipsCount}</div>
            <div className="text-xs sm:text-sm text-slate-600">learning moments</div>
          </div>
        </div>

        {/* Rest of dashboard content (truncated for brevity - same as readiness page) */}
        {/* Study Activity by Class */}
        {chatCountsByClass.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border-b border-indigo-200/60 px-6 py-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2.5 mb-1">
                <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                Study Activity by Class
              </h3>
              <p className="text-sm text-slate-600 ml-8">See where you're spending the most study time</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {chatCountsByClass.map((item) => (
                  <div
                    key={item.classId}
                    className="p-4 bg-gradient-to-br from-slate-50/80 to-white border border-slate-200/60 rounded-xl hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-200/30 transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {item.classCode}
                      </span>
                      <span className="text-xs font-bold text-indigo-700 bg-gradient-to-r from-indigo-50 to-purple-50 px-2.5 py-1 rounded-lg border border-indigo-200/50">
                        {item.count} {item.count === 1 ? 'session' : 'sessions'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate">{item.className}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-4 sm:mb-6">
          {/* Left Column: Flagged for Review */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 border-b border-amber-200/60 px-6 py-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold text-amber-900 flex items-center gap-2.5">
                    <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    Flagged for Review
                  </h3>
                  {focusAreas.length > 0 && (
                    <span className="text-xs font-bold text-amber-700 bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-1 rounded-lg border border-amber-200/50 shadow-sm">
                      {focusAreas.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-700/80 ml-8">Review Queue</p>
              </div>
              <div className="p-6">
                {focusAreas.length > 0 ? (
                  <div className="space-y-3">
                    {focusAreas.slice(0, 5).map((area, index) => (
                      <button
                        key={index}
                        onClick={() => handleFocusAreaClick(area)}
                        className="w-full flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-amber-50/80 to-orange-50/80 border-2 border-amber-200/60 rounded-xl hover:border-amber-300 hover:from-amber-100 hover:to-orange-100 transition-all duration-200 group text-left transform hover:scale-[1.02]"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                          <span className="text-sm font-semibold text-amber-900 truncate">
                            {area.topic}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 mb-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">All clear</p>
                    <p className="text-xs text-slate-500 mt-1">No topics flagged</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Learning Library */}
          <div>
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border-b border-purple-200/60 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
                    <div className="p-1.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                      <Bookmark className="w-4 h-4 text-white" />
                    </div>
                    Learning Library
                  </h3>
                  <span className="text-sm font-bold text-slate-700 bg-white/60 px-3 py-1 rounded-lg border border-purple-200/50">{clipsCount} total</span>
                </div>
              </div>
              
              {/* Search and Filters */}
              <div className="p-6 border-b border-slate-200/60 space-y-4 bg-gradient-to-b from-slate-50/50 to-transparent">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search learning moments..."
                    className="w-full pl-12 pr-4 py-3 text-sm font-medium border-2 border-slate-200 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all duration-200 shadow-sm hover:shadow-md"
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
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                          : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-indigo-300 hover:bg-slate-50 shadow-sm'
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
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                            : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-indigo-300 hover:bg-slate-50 shadow-sm'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5" />
                        {folder}
                      </button>
                    ))}
                    {tags.map(tagItem => (
                      <button
                        key={tagItem}
                        onClick={() => {
                          setSelectedTag(tagItem)
                          setSelectedFolder(null)
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center gap-1.5 ${
                          selectedTag === tagItem
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                            : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-indigo-300 hover:bg-slate-50 shadow-sm'
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {tagItem}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Clips List */}
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
                          className="w-full text-left p-5 rounded-xl border-2 border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 hover:border-purple-300 hover:from-purple-50/80 hover:to-indigo-50/80 transition-all duration-200 transform hover:scale-[1.01] shadow-sm hover:shadow-md hover:shadow-purple-200/30"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                                <h4 className="text-base font-bold text-slate-900 truncate">
                                  {clip.title}
                                </h4>
                                <span className="text-xs font-semibold text-purple-700 bg-gradient-to-r from-purple-100 to-indigo-100 px-3 py-1 rounded-lg border border-purple-200/50">
                                  {clip.folder}
                                </span>
                              </div>
                              <div className="text-sm text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                                {clip.content.substring(0, 150)}...
                              </div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                {clip.tags.slice(0, 3).map(tag => (
                                  <span
                                    key={tag}
                                    className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200/50"
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
                                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 transform hover:scale-110"
                                title="Delete this learning moment"
                                aria-label="Delete clip"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all duration-200" />
                            </div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 mb-6">
                      <Bookmark className="w-10 h-10 text-purple-400" />
                    </div>
                    <p className="text-base font-semibold text-slate-700 mb-2">
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
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 transition-all duration-200 transform hover:scale-105 active:scale-95 font-semibold"
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

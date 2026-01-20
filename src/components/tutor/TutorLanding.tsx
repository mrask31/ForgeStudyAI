'use client'

import { useState, useEffect } from 'react'
import SuggestedPrompts from '@/components/tutor/SuggestedPrompts'
import MissionPanel from '@/components/elementary/MissionPanel'
import ProofStrip from '@/components/elementary/ProofStrip'
import SpellingEnginePanel from '@/components/elementary/SpellingEnginePanel'
import ReadingEnginePanel from '@/components/elementary/ReadingEnginePanel'
import HomeworkEnginePanel from '@/components/elementary/HomeworkEnginePanel'
import GradeBand35SpellingLayout from '@/components/elementary/GradeBand35SpellingLayout'
import GradeBand35ReadingLayout from '@/components/elementary/GradeBand35ReadingLayout'
import GradeBand35HomeworkLayout from '@/components/elementary/GradeBand35HomeworkLayout'

type TutorLandingMode = 'tutor' | 'spelling' | 'reading' | 'homework'

interface TutorLandingProps {
  onStartSession: (message: string) => Promise<void>
  attachedFiles?: { id: string, name: string, document_type: string | null }[]
  attachedContext?: 'none' | 'syllabus' | 'textbook' | 'mixed'
  selectedClassId?: string // To differentiate General Tutor from class-specific
  selectedClass?: { code: string; name: string } | null // Class info for welcome message
  gradeBand?: 'elementary' | 'middle' | 'high'
  mode?: TutorLandingMode
  profileId?: string | null
  sessionActive?: boolean
}

const MODE_CONFIG: Record<Exclude<TutorLandingMode, 'tutor'>, {
  heading: string
  subtext: string
  steps: string[]
  supplies: string[]
  focusAreas: string[]
  quickStarts: Array<{ label: string; prompt: string }>
}> = {
  spelling: {
    heading: 'Spelling practice, one small step at a time.',
    subtext: 'We will practice a short list, check your memory, and build confidence.',
    steps: [
      'Pick 5 words that match today’s level.',
      'Say them, use them, and spell them once.',
      'Do a quick check and fix the tough ones.',
    ],
    supplies: [
      'A short word list (or ask me to pick one).',
      'Paper and pencil for the quick check.',
      'One sentence to use each word.',
    ],
    focusAreas: [
      'Sound it out and break long words apart.',
      'Say it, spell it, then check it.',
      'Use the word in a sentence.',
    ],
    quickStarts: [
      { label: 'Start a 5-word check', prompt: 'Give me 5 spelling words and a quick check.' },
      { label: 'Practice sight words', prompt: 'Practice 5 sight words with me and then quiz me.' },
      { label: 'Make it a game', prompt: 'Make spelling practice into a short game with 5 words.' },
    ],
  },
  reading: {
    heading: 'Reading coach for short passages and check-ins.',
    subtext: 'We will read a short passage, answer a few questions, and summarize together.',
    steps: [
      'Read a short passage out loud or silently.',
      'Answer 2-3 comprehension questions.',
      'Summarize the main idea in one sentence.',
    ],
    supplies: [
      'A short passage (or ask me for one).',
      'One tricky word to explain.',
      'Your best one-sentence summary.',
    ],
    focusAreas: [
      'Find the main idea and key details.',
      'Explain new words in simple terms.',
      'Answer with evidence from the text.',
    ],
    quickStarts: [
      { label: 'Short passage + questions', prompt: 'Give me a short passage and 3 questions.' },
      { label: 'Main idea practice', prompt: 'Give me a short paragraph and ask for the main idea.' },
      { label: 'Vocabulary check', prompt: 'Give me a short passage and 3 vocabulary questions.' },
    ],
  },
  homework: {
    heading: 'Homework help: plan first, then solve.',
    subtext: 'We will organize tasks, choose the first step, and work through it together.',
    steps: [
      'List what is due and when it is due.',
      'Break the first task into small steps.',
      'Start the first step together.',
    ],
    supplies: [
      'List the assignments that are due.',
      'Paste one problem or question.',
      'Estimate how long each task takes.',
    ],
    focusAreas: [
      'Plan the order of tasks.',
      'Solve step-by-step, one part at a time.',
      'Check your work before moving on.',
    ],
    quickStarts: [
      { label: 'Plan tonight’s homework', prompt: 'Help me plan my homework steps for tonight.' },
      { label: 'Start my first problem', prompt: 'Help me start my first homework problem step-by-step.' },
      { label: 'Explain a tough question', prompt: 'Explain this homework question without giving the answer.' },
    ],
  },
}

export default function TutorLanding({ 
  onStartSession,
  attachedFiles = [],
  attachedContext = 'none',
  selectedClassId,
  selectedClass,
  gradeBand,
  mode = 'tutor',
  profileId = null,
  sessionActive = false,
}: TutorLandingProps) {
  const hasAttachedFiles = attachedFiles.length > 0
  const isGeneralTutor = !selectedClassId
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null)
  const [isLoadingWelcome, setIsLoadingWelcome] = useState(false)
  const [randomTopic, setRandomTopic] = useState<string | null>(null)
  const [lastChatMessage, setLastChatMessage] = useState<string | null>(null)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning."
    if (hour < 17) return "Good afternoon."
    return "Good evening."
  }

  const getMainHeading = () => {
    if (isGeneralTutor && mode !== 'tutor') {
      return MODE_CONFIG[mode].heading
    }
    if (isGeneralTutor) {
      return `${getGreeting()} I'm your Tutor — ready to help you learn!`
    }
    return `${getGreeting()} What are we studying today?`
  }

  // Fetch last chat and generate welcome message for class-specific landing
  useEffect(() => {
    if (isGeneralTutor || !selectedClassId) {
      setWelcomeMessage(null)
      return
    }

    const generateWelcomeMessage = async () => {
      setIsLoadingWelcome(true)
      try {
        // Get last chat for this class
        const lastChatRes = await fetch(`/api/chats/last?classId=${selectedClassId}`, {
          credentials: 'include'
        })
        
        let lastTopic = null
        let lastAssistantMessage = null
        if (lastChatRes.ok) {
          const lastChatData = await lastChatRes.json()
          lastTopic = lastChatData.lastTopic
          // Try to get the last assistant message from the last chat
          if (lastChatData.lastChatId) {
            try {
              const historyRes = await fetch(`/api/history?id=${lastChatData.lastChatId}`, {
                credentials: 'include'
              })
              if (historyRes.ok) {
                const messages = await historyRes.json()
                if (Array.isArray(messages) && messages.length > 0) {
                  // Find the last assistant message
                  const lastAssistMsg = messages.filter((m: any) => m.role === 'assistant').pop()
                  if (lastAssistMsg?.content) {
                    lastAssistantMessage = lastAssistMsg.content
                  }
                }
              }
            } catch (error) {
              console.error('[TutorLanding] Error fetching last chat message:', error)
            }
          }
        }
        
        setLastChatMessage(lastAssistantMessage)

        // Get class materials to suggest a random topic
        const binderRes = await fetch('/api/binder', { credentials: 'include' })
        let materials: any[] = []
        if (binderRes.ok) {
          const binderData = await binderRes.json()
          materials = (binderData.files || []).filter((f: any) => {
            const fileClassId = f.metadata?.class_id || f.metadata?.classId
            return fileClassId === selectedClassId && f.document_type !== 'syllabus'
          })
        }

        // Pick a random material for topic suggestion
        let topicSuggestion = null
        if (materials.length > 0) {
          const randomMaterial = materials[Math.floor(Math.random() * materials.length)]
          const filename = randomMaterial.filename || randomMaterial.name || 'your materials'
          // Extract a topic from filename (remove extension, clean up)
          topicSuggestion = filename.replace(/\.(pdf|docx?|txt)$/i, '').replace(/[_-]/g, ' ')
        }

        // Build welcome message
        let message = `Welcome back to ${selectedClass?.code || 'your class'}! 👋\n\n`
        
        if (lastTopic) {
          message += `You were last studying: **${lastTopic}**\n\n`
          message += `💡 Want to continue where you left off? Check your **History** tab to open your last chat.\n\n`
        }
        
        if (topicSuggestion) {
          message += `📚 **Suggested topic to explore:**\n`
          message += `"${topicSuggestion}"\n\n`
          message += `I can help you:\n`
          message += `  • Understand key concepts from this topic\n`
          message += `  • Practice questions\n`
          message += `  • Review step-by-step explanations\n`
          message += `  • Clarify anything you're unsure about\n\n`
        } else {
          message += `I can help you:\n`
          message += `  • Understand concepts from your materials\n`
          message += `  • Practice questions\n`
          message += `  • Review key topics step-by-step\n`
          message += `  • Clarify anything you're unsure about\n\n`
        }
        
        message += `What would you like to study today?`

        setWelcomeMessage(message)
        setRandomTopic(topicSuggestion)
      } catch (error) {
        console.error('[TutorLanding] Error generating welcome message:', error)
        // Fallback to default message
        setWelcomeMessage(null)
      } finally {
        setIsLoadingWelcome(false)
      }
    }

    generateWelcomeMessage()
  }, [selectedClassId, isGeneralTutor, selectedClass])

  const getSubtext = () => {
    if (isGeneralTutor && mode !== 'tutor') {
      return MODE_CONFIG[mode].subtext
    }
    if (isGeneralTutor) {
      return "I can help with coursework, practice questions, study strategies, and understanding concepts. Ask me anything!"
    }
    return "You can ask about class topics, practice questions, or coursework concepts."
  }

  const getHelperText = () => {
    if (mode !== 'tutor') {
      return null
    }
    if (!isGeneralTutor) {
      return null
    }
    return (
      <div className="mt-6 p-6 bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-200 rounded-xl max-w-2xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <span className="text-indigo-600">💡</span>
          How I can help you:
        </h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 mt-0.5">•</span>
            <span><strong>Explain concepts:</strong> Ask me to break down any topic step-by-step</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 mt-0.5">•</span>
            <span><strong>Practice questions:</strong> Request practice questions on any subject</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 mt-0.5">•</span>
            <span><strong>Study strategies:</strong> Get tips on how to study effectively</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 mt-0.5">•</span>
            <span><strong>Homework help:</strong> Get guidance on assignments and coursework</span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-slate-600 italic">
          💡 <strong>Tip:</strong> For class-specific help with your uploaded materials, select a class from the dropdown above.
        </p>
      </div>
    )
  }

  const getModePanel = () => {
    if (!isGeneralTutor || mode === 'tutor') {
      return null
    }
    if (gradeBand === 'elementary' && mode === 'spelling' && profileId) {
      return (
        <GradeBand35SpellingLayout
          profileId={profileId}
          hasSession={sessionActive}
          onStartSession={onStartSession}
        />
      )
    }
    if (gradeBand === 'elementary' && mode === 'reading' && profileId) {
      return (
        <GradeBand35ReadingLayout
          profileId={profileId}
          hasSession={sessionActive}
          onStartSession={onStartSession}
        />
      )
    }
    if (gradeBand === 'elementary' && mode === 'homework' && profileId) {
      return (
        <GradeBand35HomeworkLayout
          profileId={profileId}
          hasSession={sessionActive}
          onStartSession={onStartSession}
        />
      )
    }
    if (!profileId) {
      return (
        <div className="mt-4 sm:mt-6 w-full max-w-2xl text-left">
          <div className="p-4 sm:p-6 bg-white border border-amber-200 rounded-xl shadow-sm text-sm text-amber-700">
            Select a student profile to start today’s mission.
          </div>
        </div>
      )
    }

    return (
      <div className="mt-4 sm:mt-6 w-full max-w-2xl text-left space-y-4">
        <MissionPanel profileId={profileId} mode={mode} onStart={onStartSession} />
        <ProofStrip profileId={profileId} mode={mode} onStartSession={onStartSession} />
        {mode === 'spelling' && (
          <SpellingEnginePanel profileId={profileId} onStartSession={onStartSession} />
        )}
        {mode === 'reading' && (
          <ReadingEnginePanel profileId={profileId} onStartSession={onStartSession} />
        )}
        {mode === 'homework' && (
          <HomeworkEnginePanel profileId={profileId} onStartSession={onStartSession} />
        )}
      </div>
    )
  }

  const handleSuggestionClick = async (prompt: string) => {
    await onStartSession(prompt)
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 py-8 sm:py-12 text-center px-4">
      {!(gradeBand === 'elementary' && mode !== 'tutor' && sessionActive) && (
        <>
          {/* Primary Text */}
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 max-w-2xl">
            {getMainHeading()}
          </h1>

          {/* Secondary Text */}
          <p className="text-sm sm:text-base text-slate-600 max-w-xl">
            {getSubtext()}
          </p>
        </>
      )}

      {/* Class-specific Welcome Message */}
      {!isGeneralTutor && selectedClassId && (
        <div className="mt-4 sm:mt-6 w-full max-w-2xl">
          {isLoadingWelcome ? (
            <div className="p-4 sm:p-6 bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-200 rounded-xl">
              <p className="text-slate-600 text-xs sm:text-sm">Loading your study context...</p>
            </div>
          ) : welcomeMessage ? (
            <div className="p-4 sm:p-6 bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-200 rounded-xl text-left welcome-message-card">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-xs sm:text-sm text-slate-700 leading-relaxed max-w-full">
                  {welcomeMessage.split('**').map((part, i) => {
                    // Simple markdown bold rendering
                    if (i % 2 === 1) {
                      return <strong key={i}>{part}</strong>
                    }
                    return <span key={i}>{part}</span>
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Guided panel for mode-specific entry */}
      {getModePanel()}

      {/* Helper Text for General Tutor */}
      <div className="w-full max-w-2xl">
        {getHelperText()}
      </div>

      {/* Suggestion Chips - Mode-aware */}
      {!(gradeBand === 'elementary' && (mode === 'spelling' || mode === 'reading' || mode === 'homework')) && (
        <div className="w-full">
          <SuggestedPrompts 
            mode="tutor" 
            onPromptSelect={(prompt) => {
              // On landing, clicking a suggestion starts a session
              handleSuggestionClick(prompt)
            }}
            onSend={handleSuggestionClick}
            isVisible={true}
            isCompact={false}
            hasAttachedFiles={hasAttachedFiles}
            attachedContext={attachedContext}
            selectedClassId={selectedClassId}
            lastAssistantMessage={lastChatMessage || undefined}
            hasExistingConversation={!!lastChatMessage}
            gradeBand={gradeBand}
          />
        </div>
      )}
    </div>
  )
}


'use client'

import { useEffect } from 'react'
import {
  GENERAL_TUTOR_PROMPTS,
  CLASS_TUTOR_PROMPTS,
  MIDDLE_TUTOR_PROMPTS,
  HIGH_TUTOR_PROMPTS,
  TUTOR_PROMPTS,
  REFLECTION_PROMPTS,
  NOTES_PROMPTS,
} from '@/lib/constants'

type Mode = 'tutor' | 'reflections' | 'notes'

const SYLLABUS_PROMPTS = [
  "What's due this week based on this syllabus?",
  "List all exam dates and what they cover.",
  "Create a weekly study plan from this syllabus.",
  "Show me all graded items and their percentage weights."
]

const TEXTBOOK_PROMPTS = [
  "Summarize this chapter into a study guide.",
  "Create 10 practice questions from this reading.",
  "Explain the most confusing concepts in simple terms.",
  "Pull out the top 5 key concepts to remember."
]

const DEFAULT_FILE_PROMPTS = [
  "Summarize this document for me.",
  "Create a 10-question quiz from this file.",
  "What are the key takeaways from this?",
  "Explain the most important concepts for my exam."
]

const EXAM_PROMPTS = [
  "Walk me through the highest-yield concepts for this exam.",
  "Create 10 practice questions from my exam topics.",
  "Drill me on weak areas and track my confidence.",
  "Help me build a study schedule for this exam.",
]

interface SuggestedPromptsProps {
  mode: Mode
  onPromptSelect: (prompt: string) => void
  isVisible: boolean
  isCompact?: boolean
  onSend?: (prompt: string, intent?: string) => void // Auto-send callback with optional intent
  hasAttachedFiles?: boolean
  attachedContext?: 'none' | 'syllabus' | 'textbook' | 'mixed' // Context based on attached files
  hasActiveExam?: boolean // Exam Mode context
  selectedClassId?: string // Class ID to determine if prompts should be class-specific
  lastAssistantMessage?: string // Last assistant message from conversation to generate contextual prompts
  hasExistingConversation?: boolean // Whether there's an active conversation with messages
  gradeBand?: 'middle' | 'high'
}

// Generate contextual prompts from last assistant message (similar to FollowUpPrompts logic)
function generateContextualPrompts(lastMessage: string): string[] {
  const prompts: string[] = []
  const lowerContent = lastMessage.toLowerCase()

  // Detect key topics/concepts from the last message
  const hasFormula = /(formula|equation|solve|calculate|expression|variable)/i.test(lastMessage)
  const hasDefinition = /(definition|define|meaning|term|vocabulary|concept)/i.test(lastMessage)
  const hasExample = /(example|instance|demonstrate|illustration|scenario)/i.test(lastMessage)
  const hasProcess = /(process|steps|procedure|method|approach|strategy)/i.test(lastMessage)
  const hasPriority = /(priority|first|immediate|important|key|main|focus)/i.test(lastMessage)
  const hasQuestion = /(question|quiz|test|practice|exam|review)/i.test(lastMessage)
  const hasConcept = /(concept|topic|understand|explain|clarify)/i.test(lastMessage)
  const hasComparison = /(compare|contrast|difference|similar|relate|connection)/i.test(lastMessage)

  // Build contextual prompts based on detected topics
  if (hasFormula) {
    prompts.push("Can you walk me through solving this step-by-step?")
    prompts.push("What's a real-world example of this formula?")
    prompts.push("What mistakes do students commonly make here?")
  }

  if (hasDefinition) {
    prompts.push("Can you give me an example to make this clearer?")
    prompts.push("How does this connect to what I already know?")
    prompts.push("What's an easy way to remember this?")
  }

  if (hasExample) {
    prompts.push("Can you give me a harder example?")
    prompts.push("What's the general rule behind this example?")
    prompts.push("How would this show up on a test?")
  }

  if (hasProcess) {
    prompts.push("What's the most common mistake in this process?")
    prompts.push("Can you show me a shortcut?")
    prompts.push("When would I use a different approach?")
  }

  if (hasPriority) {
    prompts.push("Walk me through the reasoning step-by-step")
    prompts.push("What would change the answer in a different scenario?")
    prompts.push("How does this connect to other topics?")
  }

  if (hasQuestion || hasConcept) {
    prompts.push("Give me another practice question on this topic")
    prompts.push("What are common wrong answers for this type of question?")
    prompts.push("Can you break this down further?")
  }

  if (hasComparison) {
    prompts.push("Can you make a comparison chart?")
    prompts.push("What's the most important difference?")
    prompts.push("When would I choose one over the other?")
  }

  // Add some general follow-ups if we don't have enough
  if (prompts.length < 3) {
    prompts.push("Can you explain this in simpler terms?")
    prompts.push("What's the most important thing to remember?")
    prompts.push("How would this appear on a test?")
    prompts.push("Can you give me a practice problem?")
  }

  // Remove duplicates and limit to 4-5 prompts
  const uniquePrompts = Array.from(new Set(prompts))
  return uniquePrompts.slice(0, 5)
}

export default function SuggestedPrompts({
  mode,
  onPromptSelect,
  isVisible,
  isCompact = false,
  onSend,
  hasAttachedFiles = false,
  attachedContext = 'none',
  hasActiveExam = false,
  selectedClassId,
  lastAssistantMessage,
  hasExistingConversation = false,
  gradeBand,
}: SuggestedPromptsProps) {
  if (!isVisible) return null

  // Logging for debugging
  useEffect(() => {
    console.log('[SuggestedPrompts] Props:', {
      mode,
      hasAttachedFiles,
      attachedContext,
      hasExistingConversation,
      hasLastMessage: !!lastAssistantMessage,
    })
  }, [mode, hasAttachedFiles, attachedContext, hasExistingConversation, lastAssistantMessage])

  // Priority Logic:
  // 1. If there's an existing conversation with a last assistant message → Generate contextual prompts
  // 2. If hasActiveExam is true → Exam prompts
  // 3. If hasAttachedFiles is true, branch based on attachedContext
  // 4. If no files attached and no conversation → Use class-specific or General Tutor prompts
  let prompts: string[]
  
  // NEW: Generate contextual prompts from last assistant message if conversation exists
  if (hasExistingConversation && lastAssistantMessage && lastAssistantMessage.trim().length > 0) {
    prompts = generateContextualPrompts(lastAssistantMessage)
    console.log('[SuggestedPrompts] Generated contextual prompts from last message:', prompts.length)
  } else if (hasActiveExam) {
    prompts = EXAM_PROMPTS
  } else if (hasAttachedFiles) {
    if (attachedContext === 'syllabus') {
      prompts = SYLLABUS_PROMPTS
    } else if (attachedContext === 'textbook') {
      prompts = TEXTBOOK_PROMPTS
    } else {
      // 'mixed' or unknown context → Default file prompts
      prompts = DEFAULT_FILE_PROMPTS
    }
  } else {
    // No files attached and no existing conversation
    if (mode === 'reflections') {
      prompts = REFLECTION_PROMPTS
    } else {
      // Use General Tutor prompts if no class selected, Class prompts if class is selected
      if (selectedClassId) {
        prompts = CLASS_TUTOR_PROMPTS
      } else if (gradeBand === 'middle') {
        prompts = MIDDLE_TUTOR_PROMPTS
      } else if (gradeBand === 'high') {
        prompts = HIGH_TUTOR_PROMPTS
      } else {
        prompts = GENERAL_TUTOR_PROMPTS
      }
    }
  }
  
  // Log which prompt set is being used
  useEffect(() => {
    const isSyllabus = hasAttachedFiles && attachedContext === 'syllabus'
    const isTextbook = hasAttachedFiles && attachedContext === 'textbook'
    const isMixed = hasAttachedFiles && attachedContext === 'mixed'
    const isDefaultFile = hasAttachedFiles && !isSyllabus && !isTextbook
    const isReflection = !hasAttachedFiles && mode === 'reflections'
    
    const promptType = isSyllabus ? 'SYLLABUS'
      : isTextbook ? 'TEXTBOOK'
      : isMixed || isDefaultFile ? 'DEFAULT_FILE'
      : isReflection ? 'REFLECTION'
      : 'TUTOR'
    
    console.log('[SuggestedPrompts] Selected prompt set:', {
      promptType,
      hasAttachedFiles,
      attachedContext,
      mode,
      promptCount: prompts.length,
      firstPrompt: prompts[0]
    })
  }, [hasAttachedFiles, attachedContext, mode])

  const handleClick = (prompt: string) => {
    // If onSend is provided, auto-send immediately
    if (onSend) {
      onSend(prompt)
    } else {
      // Otherwise, just populate the input (legacy behavior)
      onPromptSelect(prompt)
    }
  }

  // Compact mode: single scrollable row (for bottom of screen)
  if (isCompact) {
    return (
      <div className="pb-1">
        <div className="flex flex-row overflow-x-auto gap-1.5 py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {prompts.map((prompt, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleClick(prompt)}
              className="inline-flex items-center rounded-full border border-slate-600/50 bg-slate-800/40 px-3 h-7 text-xs font-medium text-slate-300 transition-all hover:border-indigo-500/40 hover:text-slate-100 cursor-pointer whitespace-nowrap flex-shrink-0 shadow-sm"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Full mode: wrap layout (for empty state - not used in new design)
  return (
    <div className="pb-4">
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(prompt)}
            className="inline-flex items-center rounded-full border border-slate-600/50 bg-slate-800/40 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-indigo-500/40 hover:text-slate-100 cursor-pointer shadow-sm"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}


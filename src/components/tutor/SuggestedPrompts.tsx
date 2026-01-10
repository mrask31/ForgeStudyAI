'use client'

import { useEffect } from 'react'
import { GENERAL_TUTOR_PROMPTS, CLASS_TUTOR_PROMPTS, TUTOR_PROMPTS, REFLECTION_PROMPTS, NOTES_PROMPTS } from '@/lib/constants'

type Mode = 'tutor' | 'reflections' | 'notes'

const SYLLABUS_PROMPTS = [
  "What's due this week based on this syllabus?",
  "List all exam dates and what they cover.",
  "Create a weekly study plan from this syllabus.",
  "Show me all graded items and their percentage weights."
]

const TEXTBOOK_PROMPTS = [
  "Summarize this chapter into a study guide.",
  "Create 10 NCLEX-style questions from this reading.",
  "Explain the most confusing concepts in simple terms.",
  "Pull out the top 5 clinical must-know points."
]

const DEFAULT_FILE_PROMPTS = [
  "Summarize this document for me.",
  "Create a 10-question quiz from this file.",
  "What are the key clinical takeaways?",
  "Explain the most important concepts for my exam."
]

const EXAM_PROMPTS = [
  "Walk me through the highest-yield concepts for this exam.",
  "Create 10 NCLEX-style questions from my exam topics.",
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
}

// Generate contextual prompts from last assistant message (similar to FollowUpPrompts logic)
function generateContextualPrompts(lastMessage: string): string[] {
  const prompts: string[] = []
  const lowerContent = lastMessage.toLowerCase()

  // Detect key topics/concepts from the last message
  const hasMedication = /(medication|drug|med|dose|dosage|administration|pharmacology)/i.test(lastMessage)
  const hasPathophysiology = /(pathophysiology|patho|disease|disorder|condition|syndrome|diagnosis)/i.test(lastMessage)
  const hasAssessment = /(assessment|symptom|sign|finding|vital|lab|evaluate)/i.test(lastMessage)
  const hasIntervention = /(intervention|treatment|care|nursing action|management|therapy)/i.test(lastMessage)
  const hasPriority = /(priority|first|immediate|urgent|abc|maslow|most important)/i.test(lastMessage)
  const hasNCLEX = /(nclex|question|exam|test|practice|scenario)/i.test(lastMessage)
  const hasConcept = /(concept|topic|understand|explain|clarify)/i.test(lastMessage)
  const hasComplication = /(complication|risk|side effect|contraindication|warning)/i.test(lastMessage)

  // Build contextual prompts based on detected topics
  if (hasMedication) {
    prompts.push("What are the side effects I should watch for?")
    prompts.push("How do I prioritize medication administration?")
    prompts.push("What are the contraindications for this medication?")
  }

  if (hasPathophysiology) {
    prompts.push("What are the early warning signs of this condition?")
    prompts.push("What complications should I monitor for?")
    prompts.push("How does this relate to other conditions I've studied?")
  }

  if (hasAssessment) {
    prompts.push("What other assessments should I perform?")
    prompts.push("What findings would indicate a problem?")
    prompts.push("How do I prioritize these assessments?")
  }

  if (hasIntervention) {
    prompts.push("What are the expected outcomes of this intervention?")
    prompts.push("What should I monitor after this intervention?")
    prompts.push("Are there any safety considerations?")
  }

  if (hasPriority) {
    prompts.push("Walk me through the priority reasoning step-by-step")
    prompts.push("What would change the priority in different scenarios?")
    prompts.push("How does this apply to other patient situations?")
  }

  if (hasNCLEX || hasConcept) {
    prompts.push("Give me another practice question on this topic")
    prompts.push("What are common distractors for this type of question?")
    prompts.push("Can you break this down further?")
  }

  if (hasComplication) {
    prompts.push("How do I recognize this complication early?")
    prompts.push("What nursing interventions prevent this?")
    prompts.push("What are the priority actions if this occurs?")
  }

  // Add some general follow-ups if we don't have enough
  if (prompts.length < 3) {
    prompts.push("Can you explain this in simpler terms?")
    prompts.push("What's the most important thing to remember?")
    prompts.push("How would this appear on an NCLEX question?")
    prompts.push("Can you give me a practice scenario?")
  }

  // Remove duplicates and limit to 4-5 prompts
  const uniquePrompts = Array.from(new Set(prompts))
  return uniquePrompts.slice(0, 5)
}

export default function SuggestedPrompts({ mode, onPromptSelect, isVisible, isCompact = false, onSend, hasAttachedFiles = false, attachedContext = 'none', hasActiveExam = false, selectedClassId, lastAssistantMessage, hasExistingConversation = false }: SuggestedPromptsProps) {
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
      prompts = selectedClassId ? CLASS_TUTOR_PROMPTS : GENERAL_TUTOR_PROMPTS
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
              className="inline-flex items-center rounded-full border border-[var(--tutor-border-subtle)] bg-[var(--tutor-surface)] px-3 h-7 text-xs font-medium text-[var(--tutor-text-main)] transition-all hover:bg-[var(--tutor-primary)]/5 hover:border-[var(--tutor-primary)]/30 hover:text-[var(--tutor-primary)] cursor-pointer whitespace-nowrap flex-shrink-0 shadow-sm"
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
            className="inline-flex items-center rounded-full border border-[var(--tutor-border-subtle)] bg-[var(--tutor-surface)] px-4 py-2 text-sm font-medium text-[var(--tutor-text-main)] transition-all hover:bg-[var(--tutor-primary)]/5 hover:border-[var(--tutor-primary)]/30 hover:text-[var(--tutor-primary)] cursor-pointer shadow-sm"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}


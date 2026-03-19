'use client'

import { useMemo } from 'react'

interface FollowUpPromptsProps {
  messageContent: string
  onPromptClick: (prompt: string) => void
  isLastMessage?: boolean // Only show on the last assistant message
  gradeBand?: 'middle' | 'high'
}

// Generate contextual follow-up prompts based on message content
function generateFollowUpPrompts(content: string, gradeBand?: 'middle' | 'high'): string[] {
  const prompts: string[] = []
  const lowerContent = content.toLowerCase()

  // STATIC PROMPTS (always available)
  const staticPrompts = [
    "Give me a practice question based on this material",
    "Give me a different example",
    "Can you break this down into simpler steps?"
  ]

  // Detect topic/concept mentions for adaptive prompts
  const hasFormula = /(formula|equation|solve|calculate|expression|variable|function)/i.test(content)
  const hasDefinition = /(definition|define|meaning|term|vocabulary|concept|theory)/i.test(content)
  const hasProcess = /(process|steps|procedure|method|approach|strategy|technique)/i.test(content)
  const hasExample = /(example|instance|demonstrate|illustration|scenario|problem)/i.test(content)
  const hasPriority = /(priority|first|important|key|main|focus|critical)/i.test(content)
  const hasComparison = /(compare|contrast|difference|similar|relate|versus|vs)/i.test(content)
  const hasTimeline = /(timeline|period|era|date|century|event|history|sequence)/i.test(content)
  const hasWriting = /(essay|thesis|paragraph|argument|evidence|writing|draft)/i.test(content)

  // ADAPTIVE PROMPTS (context-specific, choose 2)
  const adaptivePrompts: string[] = []

  if (hasFormula) {
    adaptivePrompts.push("Can you walk me through solving this step-by-step?")
    adaptivePrompts.push("What's a real-world example of this formula?")
    adaptivePrompts.push("What mistakes do students commonly make here?")
  }

  if (hasDefinition) {
    adaptivePrompts.push("Can you give me an example to make this clearer?")
    adaptivePrompts.push("How does this connect to what I already know?")
    adaptivePrompts.push("What's an easy way to remember this?")
  }

  if (hasProcess) {
    adaptivePrompts.push("What's the most common mistake in this process?")
    adaptivePrompts.push("Can you show me a shortcut or trick?")
    adaptivePrompts.push("When would I use a different approach?")
  }

  if (hasExample) {
    adaptivePrompts.push("Can you give me a harder example?")
    adaptivePrompts.push("What's the general rule behind this?")
    adaptivePrompts.push("How would this show up on a test?")
  }

  if (hasPriority) {
    adaptivePrompts.push("Walk me through the reasoning step-by-step")
    adaptivePrompts.push("What would change the answer in a different scenario?")
    adaptivePrompts.push("How does this connect to other topics?")
  }

  if (hasComparison) {
    adaptivePrompts.push("Can you make a comparison chart?")
    adaptivePrompts.push("What's the most important difference?")
    adaptivePrompts.push("When would I choose one over the other?")
  }

  if (hasTimeline) {
    adaptivePrompts.push("What caused this event to happen?")
    adaptivePrompts.push("What were the consequences of this?")
    adaptivePrompts.push("How does this connect to modern times?")
  }

  if (hasWriting) {
    adaptivePrompts.push("How can I make my argument stronger?")
    adaptivePrompts.push("What evidence would support this point?")
  }

  // If no specific context detected, use general adaptive prompts
  if (adaptivePrompts.length === 0) {
    adaptivePrompts.push("What are the key concepts here?")
    adaptivePrompts.push("What's the most important thing to remember?")
    adaptivePrompts.push("How would this appear on a test?")
  }

  // Combine: 2 static + 2 adaptive (randomly selected from adaptive pool)
  prompts.push(...staticPrompts)
  
  // Randomly select 2 adaptive prompts to ensure variety
  const shuffledAdaptive = [...adaptivePrompts].sort(() => Math.random() - 0.5)
  prompts.push(...shuffledAdaptive.slice(0, 2))

  return prompts
}

export default function FollowUpPrompts({ 
  messageContent, 
  onPromptClick,
  isLastMessage = false,
  gradeBand
}: FollowUpPromptsProps) {
  // Only show on the last assistant message
  if (!isLastMessage) return null

  const prompts = useMemo(() => generateFollowUpPrompts(messageContent, gradeBand), [messageContent, gradeBand])

  if (prompts.length === 0) return null

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <p className="text-xs text-slate-500 mb-2 font-medium">Continue learning:</p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation()
              onPromptClick(prompt)
            }}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 cursor-pointer shadow-sm"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}


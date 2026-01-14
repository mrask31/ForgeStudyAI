'use client'

import { useMemo } from 'react'

interface FollowUpPromptsProps {
  messageContent: string
  onPromptClick: (prompt: string) => void
  isLastMessage?: boolean // Only show on the last assistant message
}

// Generate contextual follow-up prompts based on message content
function generateFollowUpPrompts(content: string): string[] {
  const prompts: string[] = []
  const lowerContent = content.toLowerCase()

  // STATIC PROMPTS (always available)
  const staticPrompts = [
    "Give me a practice question based on this material",
    "Give me a different example"
  ]

  // Detect topic/concept mentions for adaptive prompts
  const hasMedication = /(medication|drug|med|dose|dosage|administration|diuretic|beta-blocker|ace inhibitor|anticoagulant)/i.test(content)
  const hasPathophysiology = /(pathophysiology|patho|disease|disorder|condition|syndrome|failure|congestion)/i.test(content)
  const hasAssessment = /(assessment|symptom|sign|finding|vital|lab|monitor|auscultation|palpation)/i.test(content)
  const hasIntervention = /(intervention|treatment|care|nursing action|management|administer|educate)/i.test(content)
  const hasPriority = /(priority|first|immediate|urgent|abc|maslow|safety)/i.test(content)
  const hasHeartFailure = /(heart failure|cardiac|edema|jugular|hepatomegaly|ascites)/i.test(content)
  const hasRespiratory = /(respiratory|breathing|oxygen|dyspnea|crackles|wheezing|saturation)/i.test(content)
  const hasComplications = /(complication|risk|adverse|side effect|contraindication|warning)/i.test(content)

  // ADAPTIVE PROMPTS (context-specific, choose 2)
  const adaptivePrompts: string[] = []

  if (hasHeartFailure) {
    adaptivePrompts.push("What's the difference between left-sided and right-sided heart failure?")
    adaptivePrompts.push("What nursing interventions are priority for heart failure?")
    adaptivePrompts.push("How do I assess for worsening heart failure?")
  }

  if (hasMedication) {
    adaptivePrompts.push("What are the key side effects I should monitor for?")
    adaptivePrompts.push("What are the contraindications for this medication?")
    adaptivePrompts.push("How do I prioritize medication administration?")
  }

  if (hasPathophysiology && !hasHeartFailure) {
    adaptivePrompts.push("What are the early warning signs of this condition?")
    adaptivePrompts.push("What complications should I monitor for?")
    adaptivePrompts.push("How does this relate to other conditions I've studied?")
  }

  if (hasAssessment) {
    adaptivePrompts.push("What other assessments should I perform?")
    adaptivePrompts.push("What findings would indicate a problem?")
    adaptivePrompts.push("How do I prioritize these assessments using ABCs?")
  }

  if (hasIntervention) {
    adaptivePrompts.push("What are the expected outcomes of this intervention?")
    adaptivePrompts.push("What should I monitor after this intervention?")
    adaptivePrompts.push("Are there any safety considerations I need to know?")
  }

  if (hasPriority) {
    adaptivePrompts.push("Walk me through the priority reasoning step-by-step")
    adaptivePrompts.push("What would change the priority in this scenario?")
    adaptivePrompts.push("How does Maslow's hierarchy apply here?")
  }

  if (hasRespiratory) {
    adaptivePrompts.push("What are the priority assessments for respiratory distress?")
    adaptivePrompts.push("How do I differentiate between different respiratory conditions?")
    adaptivePrompts.push("What interventions are most critical for breathing problems?")
  }

  if (hasComplications) {
    adaptivePrompts.push("What are the most serious complications to watch for?")
    adaptivePrompts.push("How do I recognize early signs of complications?")
  }

  // If no specific context detected, use general adaptive prompts
  if (adaptivePrompts.length === 0) {
    adaptivePrompts.push("What are the key concepts here?")
    adaptivePrompts.push("Can you break this down into simpler steps?")
    adaptivePrompts.push("What's the most important thing to remember?")
    adaptivePrompts.push("How would this appear on a test question?")
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
  isLastMessage = false 
}: FollowUpPromptsProps) {
  // Only show on the last assistant message
  if (!isLastMessage) return null

  const prompts = useMemo(() => generateFollowUpPrompts(messageContent), [messageContent])

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


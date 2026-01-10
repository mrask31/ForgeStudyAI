// Suggested prompts for Clinical Studio modes

// General Tutor prompts (broad, NCLEX-focused for all nursing students)
export const GENERAL_TUTOR_PROMPTS = [
  "Walk me through an NCLEX-style priority question",
  "Explain a nursing concept step-by-step using ABCs",
  "Help me practice medication dosage calculations",
  "Give me an NCLEX practice question on pathophysiology",
  "Explain clinical reasoning for patient assessment",
  "Help me understand nursing interventions and prioritization",
]

// Class-specific prompts (when a class is selected)
export const CLASS_TUTOR_PROMPTS = [
  "Explain key concepts from this class step-by-step",
  "Create NCLEX-style practice questions from this class",
  "Help me understand the pathophysiology we're covering",
  "Walk me through nursing interventions for this class",
  "What are the priority concepts I should focus on?",
  "Test me on important topics from this class",
]

// Legacy: Keep for backward compatibility
export const TUTOR_PROMPTS = CLASS_TUTOR_PROMPTS

export const REFLECTION_PROMPTS = [
  "How do I manage feeling overwhelmed in clinical?",
  "Help me process a difficult patient interaction.",
  "I feel behind my classmates — help me reframe this.",
  "What's one small win I had this week?",
]

export const NOTES_PROMPTS = [
  "Test me on my uploaded notes — start simple.",
  "Turn my notes into fill-in-the-blank questions.",
  "Quiz me using real-life patient examples.",
  "Help me summarize the MOST important points.",
  "Ask me to teach this topic back to you.",
  "What should I prioritize learning first?",
  "Give me practice until I feel confident.",
]


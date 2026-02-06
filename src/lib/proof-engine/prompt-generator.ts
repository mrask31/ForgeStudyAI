/**
 * Explain-Back Prompt Generator
 * 
 * Generates contextual prompts that ask students to explain concepts in their own words.
 * 
 * Requirements:
 * - Reference specific concepts from last 3-4 teaching exchanges
 * - Explicitly request "in your own words"
 * - Must be open-ended (not yes/no questions)
 * - Grade-level adaptation (simpler for <=8, deeper for >=9)
 * - Deterministic fallback (no AI dependency required)
 */

import { z } from 'zod';
import type { Message } from './types';

// ============================================
// Zod Schema for AI Output Validation
// ============================================

const ExplainBackPromptSchema = z.object({
  prompt: z.string(),
  referencedConcepts: z.array(z.string()),
});

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate that prompt is open-ended (not yes/no)
 * 
 * Rejects prompts that begin with or contain yes-no patterns:
 * - "Is/Are/Do/Did/Can/Could/Would/Will you..."
 * 
 * @param prompt - Prompt to validate
 * @returns True if open-ended, false if yes/no
 */
function isOpenEnded(prompt: string): boolean {
  const yesNoPatterns = [
    /^Is\s/i,
    /^Are\s/i,
    /^Do\s/i,
    /^Does\s/i,
    /^Did\s/i,
    /^Can\s/i,
    /^Could\s/i,
    /^Would\s/i,
    /^Will\s/i,
    /^Have\s/i,
    /^Has\s/i,
    /^Should\s/i,
  ];

  for (const pattern of yesNoPatterns) {
    if (pattern.test(prompt.trim())) {
      return false;
    }
  }

  return true;
}

/**
 * Validate that prompt includes "in your own words"
 * 
 * @param prompt - Prompt to validate
 * @returns True if includes phrase, false otherwise
 */
function includesOwnWords(prompt: string): boolean {
  return /in your own words/i.test(prompt);
}

// ============================================
// Concept Extraction
// ============================================

/**
 * Extract concepts from teaching context
 * 
 * Priority:
 * 1. metadata.concept from recent messages
 * 2. Extract from assistant message content (look for key phrases)
 * 
 * @param teachingContext - Recent teaching messages
 * @returns Array of concept strings
 */
function extractConcepts(teachingContext: Message[]): string[] {
  const concepts: string[] = [];

  // Get last 3-4 assistant messages
  const recentTeaching = teachingContext
    .filter(m => m.role === 'assistant')
    .slice(-4);

  // Extract from metadata first
  for (const message of recentTeaching) {
    if (message.metadata?.concept) {
      concepts.push(message.metadata.concept);
    }
  }

  // If we have concepts from metadata, use those
  if (concepts.length > 0) {
    return Array.from(new Set(concepts)); // Deduplicate
  }

  // Fallback: extract from content (look for key phrases)
  for (const message of recentTeaching) {
    const content = message.content;
    
    // Look for "the concept of X", "X is", "X means", etc.
    const conceptPatterns = [
      /the concept of ([^,.!?]+)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*) is/,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*) means/,
      /understand ([^,.!?]+)/i,
      /explain ([^,.!?]+)/i,
    ];

    for (const pattern of conceptPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        concepts.push(match[1].trim());
      }
    }
  }

  return Array.from(new Set(concepts)).slice(0, 3); // Deduplicate and limit to 3
}

// ============================================
// Fallback Templates
// ============================================

/**
 * Generate fallback prompt for middle school (grades <=8)
 * 
 * @param concept - Main concept (or "the main idea we just covered")
 * @returns Fallback prompt
 */
function generateMiddleSchoolFallback(concept?: string | null): string {
  const conceptText = concept || 'the main idea we just covered';
  return `In your own words, can you explain what ${conceptText} means and give one example?`;
}

/**
 * Generate fallback prompt for high school (grades >=9)
 * 
 * @param concept - Main concept
 * @param relatedConcept - Related concept (optional)
 * @returns Fallback prompt
 */
function generateHighSchoolFallback(
  concept?: string | null,
  relatedConcept?: string | null
): string {
  const conceptText = concept || 'the main idea we just covered';
  
  if (relatedConcept) {
    return `In your own words, explain ${conceptText} and how it connects to ${relatedConcept}. Why does that relationship matter?`;
  }
  
  return `In your own words, explain ${conceptText} and why it's important. What makes this concept useful?`;
}

// ============================================
// Main Prompt Generator
// ============================================

/**
 * Generate explain-back prompt
 * 
 * @param input - Teaching context, grade level, and optional concept
 * @param callAI - Optional AI service function
 * @returns Generated prompt
 */
export async function generateExplainBackPrompt(
  input: {
    teachingContext: Message[];
    gradeLevel: number;
    concept?: string | null;
  },
  callAI?: (prompt: string) => Promise<string>
): Promise<string> {
  const { teachingContext, gradeLevel, concept } = input;

  // Extract concepts from teaching context
  const extractedConcepts = extractConcepts(teachingContext);
  const mainConcept = concept || extractedConcepts[0] || null;
  const relatedConcept = extractedConcepts[1] || null;

  // Try AI generation if available
  if (callAI) {
    try {
      const teachingText = teachingContext
        .filter(m => m.role === 'assistant')
        .slice(-4)
        .map(m => m.content)
        .join('\n\n');

      const gradeContext = gradeLevel <= 8 
        ? 'middle school (simpler phrasing, one idea at a time)'
        : 'high school (deeper reasoning, why/how framing)';

      const aiPrompt = `Generate an explain-back prompt for a student to demonstrate understanding.

Teaching Context (last 3-4 exchanges):
${teachingText}

Concepts to reference: ${extractedConcepts.join(', ') || 'main idea from teaching'}
Grade Level: ${gradeLevel} (${gradeContext})

Requirements:
- MUST include phrase "in your own words"
- MUST be open-ended (NOT yes/no questions)
- MUST reference specific concepts from teaching context
- ${gradeLevel <= 8 ? 'Use simpler phrasing, focus on one idea' : 'Use deeper reasoning, ask why/how'}
- Keep concise (1-2 sentences)

AVOID starting with: Is, Are, Do, Did, Can, Could, Would, Will

Return JSON:
{
  "prompt": "the explain-back prompt",
  "referencedConcepts": ["concept1", "concept2"]
}`;

      const response = await callAI(aiPrompt);
      const parsed = JSON.parse(response);
      const validated = ExplainBackPromptSchema.parse(parsed);

      // Validate open-ended and "in your own words"
      if (isOpenEnded(validated.prompt) && includesOwnWords(validated.prompt)) {
        return validated.prompt;
      }

      console.warn('[PromptGenerator] AI prompt failed validation, using fallback');
    } catch (error) {
      console.error('[PromptGenerator] AI generation failed:', error);
    }
  }

  // Fallback: use deterministic templates
  if (gradeLevel <= 8) {
    return generateMiddleSchoolFallback(mainConcept);
  } else {
    return generateHighSchoolFallback(mainConcept, relatedConcept);
  }
}

/**
 * Exported for testing - validate prompt is open-ended
 */
export function validateOpenEnded(prompt: string): boolean {
  return isOpenEnded(prompt);
}

/**
 * Exported for testing - validate prompt includes "in your own words"
 */
export function validateOwnWords(prompt: string): boolean {
  return includesOwnWords(prompt);
}

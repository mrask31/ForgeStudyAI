/**
 * Teaching Exchange Classifier
 * 
 * Determines whether an assistant message is a "teaching exchange" that should
 * count toward the checkpoint trigger threshold.
 * 
 * Classification Strategy:
 * 1. Metadata checks (primary) - fastest, most reliable
 * 2. Rules-based classifier - deterministic pattern matching
 * 3. AI-powered fallback (optional, feature-flagged) - only when uncertain
 * 
 * Teaching exchanges INCLUDE:
 * - Concept explanations
 * - Worked examples
 * - Structured hints
 * 
 * Teaching exchanges EXCLUDE:
 * - Checkpoint prompts (explain-back requests)
 * - Validation feedback (pass/partial/retry responses)
 * - Celebration messages
 * - Logistics (greetings, transitions, clarifications)
 */

import type { Message, TeachingExchangeClassification } from './types';

// Feature flag for AI classifier (default: rules-based only)
const ENABLE_AI_CLASSIFIER = false;

// Hard cap: max 1 AI call per response
let aiClassifierCallCount = 0;

/**
 * Primary classifier - checks message metadata first
 * 
 * @param message - Assistant message to classify
 * @returns True if metadata indicates teaching exchange
 */
function isTeachingExchangeByMetadata(message: Message): boolean {
  if (!message.metadata) {
    return false; // No metadata = uncertain, defer to rules-based
  }

  // Explicit exclusions via metadata
  if (
    message.metadata.isProofCheckpoint ||
    message.metadata.isValidationFeedback ||
    message.metadata.isCelebration
  ) {
    return false;
  }

  // Explicit inclusion via metadata
  if (message.metadata.isTeachingExchange === true) {
    return true;
  }

  // Metadata present but no explicit flag = uncertain
  return false;
}

/**
 * Rules-based classifier - deterministic pattern matching
 * 
 * Looks for:
 * - Concept keywords (e.g., "because", "therefore", "this means")
 * - Explanation patterns (e.g., "Let me explain", "Here's how")
 * - Example structures (e.g., "For example", "Consider")
 * - Step-by-step patterns (e.g., "First", "Next", "Finally")
 * 
 * @param content - Message content to analyze
 * @returns Classification result with confidence level
 */
function classifyByRules(content: string): TeachingExchangeClassification {
  const lowerContent = content.toLowerCase();

  // Exclusion patterns (high confidence)
  const exclusionPatterns = [
    /can you explain/i,
    /in your own words/i,
    /tell me about/i,
    /what do you think/i,
    /how would you describe/i,
    /excellent explanation/i,
    /great job/i,
    /you've proven/i,
    /let's try again/i,
    /no worries/i,
  ];

  for (const pattern of exclusionPatterns) {
    if (pattern.test(content)) {
      return {
        isTeaching: false,
        confidence: 'high',
        reason: 'Matched exclusion pattern (checkpoint/feedback/celebration)',
        usedAI: false,
      };
    }
  }

  // Inclusion patterns (teaching indicators)
  const teachingPatterns = [
    /let me explain/i,
    /here's how/i,
    /this is because/i,
    /the reason is/i,
    /for example/i,
    /consider this/i,
    /imagine that/i,
    /think of it as/i,
    /first.*second.*third/i,
    /step \d+/i,
    /this means that/i,
    /in other words/i,
    /to understand this/i,
    /the key concept/i,
    /remember that/i,
  ];

  let teachingScore = 0;
  for (const pattern of teachingPatterns) {
    if (pattern.test(content)) {
      teachingScore++;
    }
  }

  // High confidence if multiple teaching patterns found
  if (teachingScore >= 2) {
    return {
      isTeaching: true,
      confidence: 'high',
      reason: `Matched ${teachingScore} teaching patterns`,
      usedAI: false,
    };
  }

  // Low confidence if only one pattern found
  if (teachingScore === 1) {
    return {
      isTeaching: true,
      confidence: 'low',
      reason: 'Matched 1 teaching pattern (uncertain)',
      usedAI: false,
    };
  }

  // No patterns matched = likely not teaching
  return {
    isTeaching: false,
    confidence: 'low',
    reason: 'No teaching patterns matched (uncertain)',
    usedAI: false,
  };
}

/**
 * AI-powered classifier fallback (optional, feature-flagged)
 * 
 * Only called when:
 * - Rules-based classifier is uncertain (low confidence)
 * - Feature flag is enabled
 * - Hard cap not exceeded (max 1 call per response)
 * 
 * @param content - Message content to analyze
 * @param callAI - AI service function
 * @returns Classification result
 */
async function classifyByAI(
  content: string,
  callAI: (prompt: string) => Promise<string>
): Promise<TeachingExchangeClassification> {
  // Check hard cap
  if (aiClassifierCallCount >= 1) {
    return {
      isTeaching: false,
      confidence: 'low',
      reason: 'AI classifier hard cap exceeded',
      usedAI: false,
    };
  }

  try {
    aiClassifierCallCount++;

    const prompt = `Classify this tutor message as teaching or non-teaching.

Message:
"${content}"

Teaching exchanges include:
- Concept explanations
- Worked examples
- Structured hints

Non-teaching exchanges include:
- Checkpoint prompts (asking student to explain)
- Validation feedback (pass/partial/retry responses)
- Celebration messages
- Logistics (greetings, transitions)

Return JSON:
{
  "isTeaching": true/false,
  "reason": "brief explanation"
}`;

    const response = await callAI(prompt);
    const parsed = JSON.parse(response);

    return {
      isTeaching: parsed.isTeaching,
      confidence: 'high',
      reason: parsed.reason,
      usedAI: true,
    };
  } catch (error) {
    console.error('[ExchangeClassifier] AI classification failed:', error);
    return {
      isTeaching: false,
      confidence: 'low',
      reason: 'AI classification failed',
      usedAI: false,
    };
  }
}

/**
 * Main entry point - determines if a message is a teaching exchange
 * 
 * Classification pipeline:
 * 1. Check metadata (fastest, most reliable)
 * 2. Apply rules-based classifier (deterministic)
 * 3. Optionally use AI fallback (if uncertain and feature-flagged)
 * 
 * @param message - Assistant message to classify
 * @param callAI - Optional AI service function for fallback
 * @returns True if message is a teaching exchange
 */
export async function isTeachingExchange(
  message: Message,
  callAI?: (prompt: string) => Promise<string>
): Promise<boolean> {
  // Reset AI call counter for new message
  aiClassifierCallCount = 0;

  // Step 1: Check metadata (primary classifier)
  const metadataResult = isTeachingExchangeByMetadata(message);
  if (message.metadata && (
    message.metadata.isProofCheckpoint ||
    message.metadata.isValidationFeedback ||
    message.metadata.isCelebration ||
    message.metadata.isTeachingExchange === true
  )) {
    // Metadata gave us a definitive answer
    return metadataResult;
  }

  // Step 2: Apply rules-based classifier
  const rulesResult = classifyByRules(message.content);

  // If high confidence, use rules-based result
  if (rulesResult.confidence === 'high') {
    return rulesResult.isTeaching;
  }

  // Step 3: AI fallback (if enabled and uncertain)
  if (ENABLE_AI_CLASSIFIER && callAI && rulesResult.confidence === 'low') {
    const aiResult = await classifyByAI(message.content, callAI);
    return aiResult.isTeaching;
  }

  // Default: use rules-based result even if low confidence
  return rulesResult.isTeaching;
}

/**
 * Exported for testing - classify using AI (respects hard cap)
 */
export async function classifyAsTeaching(
  content: string,
  callAI: (prompt: string) => Promise<string>
): Promise<TeachingExchangeClassification> {
  return classifyByAI(content, callAI);
}

/**
 * Reset AI classifier call counter (for testing)
 */
export function resetAICallCounter(): void {
  aiClassifierCallCount = 0;
}

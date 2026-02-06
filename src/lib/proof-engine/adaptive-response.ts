/**
 * Adaptive Response Generator
 * 
 * Generates appropriate tutor responses based on validation results:
 * - Pass: Celebration + progress display + advancement
 * - Partial: Targeted hints + clarifying question
 * - Retry: Reteaching with different approach + new explain-back prompt
 * 
 * CRITICAL TONE RULES:
 * - NEVER use "fail/failed/wrong/bad" in student-facing text
 * - Use "retry / let's try again" phrasing
 * - Always supportive and encouraging
 */

import { z } from 'zod';
import type {
  ValidationResult,
  Message,
  AdaptiveResponseInput,
  AdaptiveResponse,
  ConversationState,
} from './types';

// ============================================
// Zod Schemas for AI Output Validation
// ============================================

const PassResponseSchema = z.object({
  celebration: z.string(),
  progressMessage: z.string(),
  transitionMessage: z.string(),
});

const PartialResponseSchema = z.object({
  encouragement: z.string(),
  targetedHint: z.string(),
  clarifyingQuestion: z.string(),
});

const RetryResponseSchema = z.object({
  supportiveOpening: z.string(),
  reteachingContent: z.string(),
  newExplainBackPrompt: z.string(),
});

// ============================================
// Adaptive Response Generator Class
// ============================================

export class AdaptiveResponseGenerator {
  private callAI?: (prompt: string) => Promise<string>;

  constructor(callAI?: (prompt: string) => Promise<string>) {
    this.callAI = callAI;
  }

  /**
   * Main entry point - routes to appropriate handler based on classification
   * 
   * @param input - Validation result, conversation state, teaching context, grade level
   * @returns Adaptive response with metadata
   */
  async generateResponse(input: AdaptiveResponseInput): Promise<AdaptiveResponse> {
    const { validationResult, conversationState, teachingContext, gradeLevel } = input;

    // Deterministic routing based on classification
    switch (validationResult.classification) {
      case 'pass':
        return this.generatePassResponse(
          conversationState.conceptsProvenCount,
          conversationState.currentConcept || 'this concept'
        );

      case 'partial':
        return this.generatePartialResponse(
          validationResult,
          teachingContext,
          gradeLevel
        );

      case 'retry':
        return this.generateRetryResponse(
          validationResult,
          teachingContext,
          gradeLevel
        );

      default:
        // Should never happen due to TypeScript types, but handle gracefully
        console.error('[AdaptiveResponseGenerator] Unknown classification:', validationResult.classification);
        return this.generateFallbackResponse();
    }
  }

  /**
   * Generate pass response
   * 
   * Requirements:
   * - Celebrate the achievement warmly
   * - Include progress: "You've proven {conceptCount} concepts today" (Requirement 11.1)
   * - Indicate readiness to move forward
   * - Keep tone encouraging but not over-the-top
   */
  private async generatePassResponse(
    conceptsProvenCount: number,
    currentConcept: string
  ): Promise<AdaptiveResponse> {
    if (this.callAI) {
      try {
        const prompt = `Generate a celebratory response for a student who successfully explained a concept.

Context:
- Concepts proven today: ${conceptsProvenCount}
- Current concept: ${currentConcept}

Requirements:
- Celebrate the achievement warmly (but not over-the-top)
- MUST include exact phrase: "You've proven ${conceptsProvenCount} concept${conceptsProvenCount === 1 ? '' : 's'} today"
- Indicate readiness to move forward
- Keep it concise (2-3 sentences)
- Tone: encouraging, supportive, genuine

Return JSON:
{
  "celebration": "warm celebration of understanding",
  "progressMessage": "You've proven ${conceptsProvenCount} concept${conceptsProvenCount === 1 ? '' : 's'} today",
  "transitionMessage": "readiness to move forward"
}`;

        const response = await this.callAI(prompt);
        const parsed = JSON.parse(response);
        const validated = PassResponseSchema.parse(parsed);

        const content = `${validated.celebration} ${validated.progressMessage} ${validated.transitionMessage}`;

        return {
          content,
          shouldAdvance: true,
          shouldReteach: false,
          metadata: {
            isCelebration: true,
            isValidationFeedback: true,
          },
        };
      } catch (error) {
        console.error('[AdaptiveResponseGenerator] Failed to generate pass response:', error);
        // Fall through to template
      }
    }

    // Template fallback
    const content = `Excellent explanation! You really understand ${currentConcept}. You've proven ${conceptsProvenCount} concept${conceptsProvenCount === 1 ? '' : 's'} today. Ready to move forward?`;

    return {
      content,
      shouldAdvance: true,
      shouldReteach: false,
      metadata: {
        isCelebration: true,
        isValidationFeedback: true,
      },
    };
  }

  /**
   * Generate partial response
   * 
   * Requirements:
   * - Provide targeted hints based on what's missing
   * - Give a clarifying question (not a full reteach)
   * - Supportive tone
   * - NEVER use "fail/failed/wrong/bad"
   */
  private async generatePartialResponse(
    validationResult: ValidationResult,
    teachingContext: Message[],
    gradeLevel: number
  ): Promise<AdaptiveResponse> {
    const teachingText = teachingContext
      .filter(m => m.role === 'assistant')
      .slice(-3) // Last 3 teaching messages
      .map(m => m.content)
      .join('\n\n');

    if (this.callAI) {
      try {
        const prompt = `Generate a partial understanding response with targeted hints.

Teaching Context:
${teachingText}

Validation Result:
- Key concepts present: ${validationResult.keyConcepts.join(', ')}
- Relationships explained: ${validationResult.relationships.join(', ')}
- Guidance: ${validationResult.guidance}

Grade Level: ${gradeLevel}

Requirements:
- Start with encouragement ("You're on the right track!")
- Provide a targeted hint about what's missing (don't reteach everything)
- End with a clarifying question to guide them
- Tone: supportive, never use "fail/failed/wrong/bad"
- Keep concise (2-3 sentences)

Return JSON:
{
  "encouragement": "supportive opening",
  "targetedHint": "specific hint about what's missing",
  "clarifyingQuestion": "question to guide them forward"
}`;

        const response = await this.callAI(prompt);
        const parsed = JSON.parse(response);
        const validated = PartialResponseSchema.parse(parsed);

        const content = `${validated.encouragement} ${validated.targetedHint} ${validated.clarifyingQuestion}`;

        return {
          content,
          shouldAdvance: false,
          shouldReteach: false,
          metadata: {
            isValidationFeedback: true,
          },
        };
      } catch (error) {
        console.error('[AdaptiveResponseGenerator] Failed to generate partial response:', error);
        // Fall through to template
      }
    }

    // Template fallback
    const content = `You're on the right track! ${validationResult.guidance} Can you explain how these concepts connect?`;

    return {
      content,
      shouldAdvance: false,
      shouldReteach: false,
      metadata: {
        isValidationFeedback: true,
      },
    };
  }

  /**
   * Generate retry response (reteaching)
   * 
   * Requirements:
   * - Use supportive, encouraging tone
   * - Reteach using DIFFERENT approach than original (new examples, analogies)
   * - Include the validation guidance
   * - Include optional diagnostic hint (ONE sentence, retry only)
   * - End with a new explain-back prompt
   * - NEVER use "fail/failed/wrong/bad"
   * - Use "let's try again" phrasing
   */
  private async generateRetryResponse(
    validationResult: ValidationResult,
    teachingContext: Message[],
    gradeLevel: number
  ): Promise<AdaptiveResponse> {
    const teachingText = teachingContext
      .filter(m => m.role === 'assistant')
      .slice(-3) // Last 3 teaching messages
      .map(m => m.content)
      .join('\n\n');

    if (this.callAI) {
      try {
        const diagnosticHintInstruction = validationResult.diagnosticHint
          ? `\n- Include this diagnostic hint (exactly as written): "${validationResult.diagnosticHint}"`
          : '';

        const prompt = `Generate a reteaching response for a student who needs another attempt.

Previous Teaching:
${teachingText}

Validation Result:
- Issues detected: ${validationResult.isParroting ? 'parroting' : ''} ${validationResult.isKeywordStuffing ? 'keyword stuffing' : ''} ${validationResult.isVagueAcknowledgment ? 'vague acknowledgment' : ''}
- Misconceptions: ${validationResult.misconceptions.join(', ')}
- Guidance: ${validationResult.guidance}${diagnosticHintInstruction}

Grade Level: ${gradeLevel}

Requirements:
- Start with supportive opening ("Let's try this again" or "No worries, let me explain differently")
- NEVER use "fail/failed/wrong/bad"${diagnosticHintInstruction}
- Reteach using DIFFERENT approach than previous teaching:
  * If previous used examples, use analogies
  * If previous used analogies, use step-by-step breakdown
  * If previous was abstract, make it concrete
  * If previous was concrete, show the pattern
- Include the guidance: "${validationResult.guidance}"
- End with a new explain-back prompt: "Now, can you explain [concept] in your own words?"
- Keep concise but complete (3-4 sentences)

Return JSON:
{
  "supportiveOpening": "encouraging opening with 'let's try again' phrasing",
  "reteachingContent": "reteaching with DIFFERENT approach",
  "newExplainBackPrompt": "new explain-back prompt"
}`;

        const response = await this.callAI(prompt);
        const parsed = JSON.parse(response);
        const validated = RetryResponseSchema.parse(parsed);

        // Build content with optional diagnostic hint
        let content = `${validated.supportiveOpening}`;
        if (validationResult.diagnosticHint) {
          content += ` ${validationResult.diagnosticHint}`;
        }
        content += ` ${validated.reteachingContent} ${validated.newExplainBackPrompt}`;

        return {
          content,
          shouldAdvance: false,
          shouldReteach: true,
          metadata: {
            isValidationFeedback: true,
            isProofCheckpoint: true, // Still in checkpoint mode
          },
        };
      } catch (error) {
        console.error('[AdaptiveResponseGenerator] Failed to generate retry response:', error);
        // Fall through to template
      }
    }

    // Template fallback
    let content = `No worries, let's try this again!`;
    if (validationResult.diagnosticHint) {
      content += ` ${validationResult.diagnosticHint}`;
    }
    content += ` ${validationResult.guidance} Let me explain it differently. Now, can you explain this concept in your own words?`;

    return {
      content,
      shouldAdvance: false,
      shouldReteach: true,
      metadata: {
        isValidationFeedback: true,
        isProofCheckpoint: true,
      },
    };
  }

  /**
   * Fallback response for unknown classification
   */
  private generateFallbackResponse(): AdaptiveResponse {
    return {
      content: "Let's continue with the lesson. What would you like to explore next?",
      shouldAdvance: false,
      shouldReteach: false,
      metadata: {
        isValidationFeedback: true,
      },
    };
  }
}

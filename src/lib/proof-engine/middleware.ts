/**
 * Proof Engine Middleware
 * 
 * Core state machine that orchestrates the proof checkpoint system.
 * 
 * Two modes:
 * - Teaching Mode: Count teaching exchanges, trigger checkpoints at adaptive intervals
 * - Checkpoint Mode: Validate student explanations, provide adaptive responses
 * 
 * Invariants:
 * - Never trigger checkpoints in first 2 teaching exchanges
 * - Never trigger new checkpoint while already in checkpoint mode
 * - Reteaching during checkpoint mode does NOT increment teachingExchangeCount
 * - nextCheckpointTarget must be 2-3, 3-4, or 4-5 based on performance
 */

import type {
  ConversationState,
  Message,
  ProcessedResponse,
  MiddlewareDependencies,
  ValidationResult,
} from './types';
import { generateResponseHash, sanitizeExcerpt } from './utils';

// ============================================
// Proof Engine Middleware Class
// ============================================

export class ProofEngineMiddleware {
  private deps: MiddlewareDependencies;

  constructor(deps: MiddlewareDependencies) {
    this.deps = deps;
  }

  /**
   * Main entry point - process a message through the proof engine
   * 
   * @param message - User message
   * @param state - Current conversation state
   * @param recentMessages - Recent conversation history
   * @param chatId - Chat session ID
   * @param studentId - Student user ID
   * @returns Processed response with updated state
   */
  async processMessage(
    message: string,
    state: ConversationState,
    recentMessages: Message[],
    chatId: string,
    studentId: string
  ): Promise<ProcessedResponse> {
    // Initialize state if needed
    state = this.initializeState(state);

    // Route based on mode
    if (state.isInCheckpointMode) {
      return this.handleCheckpointMode(message, state, recentMessages, chatId, studentId);
    } else {
      return this.handleTeachingMode(message, state, recentMessages);
    }
  }

  /**
   * Initialize missing state fields with safe defaults
   * 
   * @param state - Partial conversation state
   * @returns Complete conversation state
   */
  private initializeState(state: Partial<ConversationState>): ConversationState {
    return {
      mode: state.mode || 'teaching',
      teachingExchangeCount: state.teachingExchangeCount ?? 0,
      checkpointTarget: state.checkpointTarget ?? 3,
      validationHistory: state.validationHistory || [],
      currentConcept: state.currentConcept || null,
      conceptsProven: state.conceptsProven || [],
      conceptsProvenCount: state.conceptsProvenCount ?? 0,
      lastCheckpointAt: state.lastCheckpointAt || null,
      lastCheckpointAtExchange: state.lastCheckpointAtExchange ?? null, // Guard field
      isInCheckpointMode: state.isInCheckpointMode ?? false,
      currentCheckpointConcept: state.currentCheckpointConcept || null,
      lastThreeValidationResults: state.lastThreeValidationResults || [],
      conceptsProvenThisSession: state.conceptsProvenThisSession || [],
      nextCheckpointTarget: state.nextCheckpointTarget ?? 3,
      gradeLevel: state.gradeLevel ?? 8, // Default to grade 8 if not set
      lastCheckpointPrompt: state.lastCheckpointPrompt,
    };
  }

  /**
   * Handle Teaching Mode
   * 
   * Flow:
   * 1. Call tutor to get teaching response
   * 2. Classify if teaching exchange
   * 3. Increment counter if teaching
   * 4. Check if checkpoint should trigger
   * 5. If yes, generate explain-back prompt and enter checkpoint mode
   * 6. If no, return teaching response
   * 
   * @param message - User message
   * @param state - Current state
   * @param recentMessages - Recent conversation history
   * @returns Processed response
   */
  private async handleTeachingMode(
    message: string,
    state: ConversationState,
    recentMessages: Message[]
  ): Promise<ProcessedResponse> {
    // Step 1: Get tutor response
    const assistantText = await this.deps.callTutor({
      message,
      recentMessages,
    });

    // Step 2: Classify if teaching exchange
    const assistantMessage: Message = {
      role: 'assistant',
      content: assistantText,
    };

    const isTeaching = await this.deps.exchangeClassifier.isTeachingExchange(assistantMessage);

    // Step 3: Increment counter if teaching
    if (isTeaching) {
      state.teachingExchangeCount++;
    }

    // Step 4: Check if checkpoint should trigger
    const isIntroductoryPhase = state.teachingExchangeCount < 2;
    
    const shouldTrigger = this.deps.checkpointFrequency.shouldTriggerCheckpoint({
      validationHistory: state.lastThreeValidationResults,
      teachingExchangeCount: state.teachingExchangeCount,
      isInCheckpointMode: state.isInCheckpointMode,
      isIntroductoryPhase,
      lastCheckpointAtExchange: state.lastCheckpointAtExchange,
    });

    if (shouldTrigger.shouldTrigger) {
      // Step 5: Trigger checkpoint
      return this.triggerCheckpoint(state, recentMessages, assistantText);
    }

    // Step 6: Return teaching response
    return {
      assistantText,
      state,
      metadata: {
        isTeachingExchange: isTeaching,
      },
    };
  }

  /**
   * Trigger checkpoint - generate explain-back prompt and enter checkpoint mode
   * 
   * @param state - Current state
   * @param recentMessages - Recent conversation history
   * @param lastTeachingText - Last teaching response (to append to history)
   * @returns Processed response with checkpoint prompt
   */
  private async triggerCheckpoint(
    state: ConversationState,
    recentMessages: Message[],
    lastTeachingText: string
  ): Promise<ProcessedResponse> {
    // Extract concept from recent teaching
    const teachingContext = [
      ...recentMessages.filter(m => m.role === 'assistant').slice(-3),
      { role: 'assistant' as const, content: lastTeachingText },
    ];

    // Prefer metadata.concept from recent messages
    let concept: string | null = null;
    for (let i = teachingContext.length - 1; i >= 0; i--) {
      if (teachingContext[i].metadata?.concept) {
        concept = teachingContext[i].metadata!.concept!;
        break;
      }
    }

    // Generate explain-back prompt
    const explainBackPrompt = await this.deps.promptGenerator.generateExplainBackPrompt({
      teachingContext,
      gradeLevel: state.gradeLevel,
      concept,
    });

    // Update state
    state.isInCheckpointMode = true;
    state.mode = 'checkpoint';
    state.currentCheckpointConcept = concept;
    state.lastCheckpointPrompt = explainBackPrompt;
    state.lastCheckpointAtExchange = state.teachingExchangeCount; // Record exchange count when checkpoint triggered
    // NOTE: Do NOT reset teachingExchangeCount here - it continues to increment
    state.nextCheckpointTarget = this.deps.checkpointFrequency.updateCheckpointTarget(
      state.lastThreeValidationResults
    );
    state.lastCheckpointAt = new Date();

    // Return teaching response + checkpoint prompt
    const combinedText = `${lastTeachingText}\n\n${explainBackPrompt}`;

    return {
      assistantText: combinedText,
      state,
      metadata: {
        isProofCheckpoint: true,
        concept,
      },
    };
  }

  /**
   * Handle Checkpoint Mode
   * 
   * Flow:
   * 1. Treat user message as proof attempt
   * 2. Validate understanding
   * 3. Log proof event
   * 4. Update validation history
   * 5. Route to adaptive response (pass/partial/retry)
   * 
   * @param message - Student's proof attempt
   * @param state - Current state
   * @param recentMessages - Recent conversation history
   * @param chatId - Chat session ID
   * @param studentId - Student user ID
   * @returns Processed response with validation feedback
   */
  private async handleCheckpointMode(
    message: string,
    state: ConversationState,
    recentMessages: Message[],
    chatId: string,
    studentId: string
  ): Promise<ProcessedResponse> {
    // Step 1: Build validation request
    const teachingContext = recentMessages
      .filter(m => m.role === 'assistant')
      .slice(-4);

    const validationRequest = {
      studentResponse: message,
      teachingContext,
      explainBackPrompt: state.lastCheckpointPrompt || 'Explain the concept in your own words.',
      concept: state.currentCheckpointConcept || 'the concept',
      gradeLevel: state.gradeLevel,
    };

    // Step 2: Validate understanding
    const validationResult: ValidationResult = await this.deps.validator.validate(
      validationRequest.studentResponse,
      validationRequest.teachingContext,
      validationRequest.explainBackPrompt,
      validationRequest.gradeLevel
    );

    // Step 3: Log proof event
    try {
      const timestamp = new Date().toISOString();
      const responseHash = await generateResponseHash(chatId, message, timestamp);
      const excerpt = sanitizeExcerpt(message, 200);

      await this.deps.logger.logEvent({
        chat_id: chatId,
        student_id: studentId,
        concept: state.currentCheckpointConcept || 'unknown',
        prompt: state.lastCheckpointPrompt || '',
        student_response: message,
        student_response_excerpt: excerpt,
        response_hash: responseHash,
        validation_result: validationResult,
        classification: validationResult.classification,
      });
    } catch (error) {
      console.error('[ProofEngineMiddleware] Failed to log proof event:', error);
      // Continue despite logging failure
    }

    // Step 4: Update validation history (cap at 3)
    state.lastThreeValidationResults.push(validationResult.classification);
    if (state.lastThreeValidationResults.length > 3) {
      state.lastThreeValidationResults = state.lastThreeValidationResults.slice(-3);
    }

    // Also update main validation history
    state.validationHistory.push(validationResult.classification);

    // Step 5: Route to adaptive response
    return this.routeAdaptiveResponse(validationResult, state, teachingContext);
  }

  /**
   * Route to adaptive response based on validation classification
   * 
   * @param validationResult - Validation result
   * @param state - Current state
   * @param teachingContext - Recent teaching messages
   * @returns Processed response
   */
  private async routeAdaptiveResponse(
    validationResult: ValidationResult,
    state: ConversationState,
    teachingContext: Message[]
  ): Promise<ProcessedResponse> {
    const classification = validationResult.classification;

    // Generate adaptive response
    const adaptiveResponse = await this.deps.adaptiveResponses.generateResponse({
      validationResult,
      conversationState: state,
      teachingContext,
      gradeLevel: state.gradeLevel,
    });

    // Handle pass
    if (classification === 'pass') {
      // Add concept to proven list (dedupe)
      const concept = state.currentCheckpointConcept || 'concept';
      if (!state.conceptsProvenThisSession.includes(concept)) {
        state.conceptsProvenThisSession.push(concept);
      }
      if (!state.conceptsProven.includes(concept)) {
        state.conceptsProven.push(concept);
      }
      state.conceptsProvenCount = state.conceptsProven.length;

      // Exit checkpoint mode
      state.isInCheckpointMode = false;
      state.mode = 'teaching';
      state.currentCheckpointConcept = null;
      state.lastCheckpointPrompt = undefined;

      // Update next checkpoint target
      state.nextCheckpointTarget = this.deps.checkpointFrequency.updateCheckpointTarget(
        state.lastThreeValidationResults
      );

      return {
        assistantText: adaptiveResponse.content,
        state,
        metadata: {
          isValidationFeedback: true,
          classification: 'pass',
          isCelebration: true,
        },
      };
    }

    // Handle partial - remain in checkpoint mode
    if (classification === 'partial') {
      return {
        assistantText: adaptiveResponse.content,
        state,
        metadata: {
          isValidationFeedback: true,
          classification: 'partial',
        },
      };
    }

    // Handle retry - remain in checkpoint mode
    if (classification === 'retry') {
      // Update last checkpoint prompt if response includes new prompt
      // (adaptive response for retry should end with new explain-back prompt)
      return {
        assistantText: adaptiveResponse.content,
        state,
        metadata: {
          isValidationFeedback: true,
          classification: 'retry',
          isProofCheckpoint: true, // Still in checkpoint mode
        },
      };
    }

    // Fallback (should never reach here)
    return {
      assistantText: adaptiveResponse.content,
      state,
      metadata: {
        isValidationFeedback: true,
      },
    };
  }
}

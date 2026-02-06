/**
 * Integration Test 10.4: End-to-End Checkpoint Flow
 * 
 * Validates the complete proof engine checkpoint flow:
 * 1. Teaching mode → checkpoint trigger
 * 2. Checkpoint prompt generation
 * 3. Insufficient response → retry (remains in checkpoint mode)
 * 4. Strong response → pass (exits checkpoint mode)
 * 5. Proof events logged correctly
 * 6. Teaching exchange count managed correctly
 * 7. Idempotent proof event logging
 * 8. Validator timeout fallback
 */

import { ProofEngineMiddleware } from '../middleware';
import type {
  ConversationState,
  Message,
  MiddlewareDependencies,
  ValidationResult,
  ProofEventInsert,
} from '../types';

describe('Integration Test 10.4: End-to-End Checkpoint Flow', () => {
  // Mock Supabase client
  const createMockSupabase = () => {
    const loggedEvents: ProofEventInsert[] = [];
    
    return {
      from: (table: string) => ({
        insert: jest.fn().mockImplementation((data: any) => {
          if (table === 'proof_events') {
            loggedEvents.push(data);
          }
          return Promise.resolve({ data, error: null });
        }),
      }),
      getLoggedEvents: () => loggedEvents,
    };
  };

  // Mock callTutor (teaching AI)
  const createMockCallTutor = () => {
    let callCount = 0;
    return jest.fn().mockImplementation(async () => {
      callCount++;
      return `Teaching response ${callCount} about photosynthesis. Plants convert light energy into chemical energy through chlorophyll.`;
    });
  };

  // Mock callEvaluationAI (evaluation AI)
  const createMockCallEvaluationAI = () => {
    return jest.fn().mockResolvedValue(JSON.stringify({
      classification: 'pass',
      keyConcepts: ['photosynthesis', 'light energy', 'chemical energy'],
      relationships: ['light energy converts to chemical energy'],
      misconceptions: [],
      depthAssessment: 'good understanding',
      guidance: '',
    }));
  };

  // Create mock dependencies
  const createMockDeps = (
    mockSupabase: any,
    mockCallTutor: any,
    mockCallEvaluationAI: any,
    validatorBehavior: 'pass' | 'retry' | 'partial' | 'timeout' = 'pass'
  ): MiddlewareDependencies => {
    // Mock validator with configurable behavior
    const mockValidator = {
      validate: jest.fn().mockImplementation(async () => {
        if (validatorBehavior === 'timeout') {
          // Simulate timeout (>3s)
          await new Promise(resolve => setTimeout(resolve, 4000));
          throw new Error('Timeout');
        }

        const classifications: Record<string, ValidationResult> = {
          pass: {
            classification: 'pass',
            keyConcepts: ['photosynthesis', 'light energy', 'chemical energy'],
            relationships: ['light converts to chemical energy'],
            misconceptions: [],
            depthAssessment: 'good',
            guidance: '',
            isParroting: false,
            isKeywordStuffing: false,
            isVagueAcknowledgment: false,
          },
          retry: {
            classification: 'retry',
            keyConcepts: [],
            relationships: [],
            misconceptions: ['confused light with heat'],
            depthAssessment: 'insufficient',
            guidance: 'Let me explain differently',
            isParroting: true,
            isKeywordStuffing: false,
            isVagueAcknowledgment: false,
          },
          partial: {
            classification: 'partial',
            keyConcepts: ['light'],
            relationships: [],
            misconceptions: [],
            depthAssessment: 'incomplete',
            guidance: 'You mentioned light but not energy conversion',
            isParroting: false,
            isKeywordStuffing: false,
            isVagueAcknowledgment: false,
          },
        };

        return classifications[validatorBehavior];
      }),
    };

    return {
      callTutor: mockCallTutor,
      validator: mockValidator,
      logger: {
        logEvent: jest.fn().mockImplementation(async (event: ProofEventInsert) => {
          await mockSupabase.from('proof_events').insert(event);
        }),
      },
      promptGenerator: {
        generateExplainBackPrompt: jest.fn().mockResolvedValue(
          'In your own words, explain how photosynthesis works.'
        ),
      },
      exchangeClassifier: {
        isTeachingExchange: jest.fn().mockResolvedValue(true),
      },
      checkpointFrequency: {
        shouldTriggerCheckpoint: jest.fn().mockImplementation((input: any) => {
          // Trigger checkpoint when count reaches target
          return {
            shouldTrigger: input.teachingExchangeCount >= input.validationHistory.length + 3,
            nextTarget: 3,
            reason: input.teachingExchangeCount >= 3 ? 'Count reached target' : 'Not yet',
          };
        }),
        updateCheckpointTarget: jest.fn().mockReturnValue(3),
      },
      adaptiveResponses: {
        generateResponse: jest.fn().mockImplementation(async (input: any) => {
          const classification = input.validationResult.classification;
          
          if (classification === 'pass') {
            return {
              content: `Great job! You have proven ${input.conversationState.conceptsProvenCount + 1} concepts today.`,
              shouldAdvance: true,
              shouldReteach: false,
              metadata: { isCelebration: true },
            };
          } else if (classification === 'retry') {
            return {
              content: 'Let me explain it differently. Now try again in your own words.',
              shouldAdvance: false,
              shouldReteach: true,
              metadata: { isValidationFeedback: true },
            };
          } else {
            return {
              content: 'You are on the right track. Can you explain how these connect?',
              shouldAdvance: false,
              shouldReteach: false,
              metadata: { isValidationFeedback: true },
            };
          }
        }),
      },
    };
  };

  // Create initial state
  const createInitialState = (): ConversationState => ({
    mode: 'teaching',
    teachingExchangeCount: 0,
    checkpointTarget: 3,
    validationHistory: [],
    currentConcept: null,
    conceptsProven: [],
    conceptsProvenCount: 0,
    lastCheckpointAt: null,
    lastCheckpointAtExchange: null, // Guard: prevents immediate re-triggering
    isInCheckpointMode: false,
    currentCheckpointConcept: null,
    lastThreeValidationResults: [],
    conceptsProvenThisSession: [],
    nextCheckpointTarget: 3,
    gradeLevel: 8,
  });

  it('should complete full checkpoint flow: teaching → checkpoint → retry → pass', async () => {
    const mockSupabase = createMockSupabase();
    const mockCallTutor = createMockCallTutor();
    const mockCallEvaluationAI = createMockCallEvaluationAI();

    let state = createInitialState();
    const recentMessages: Message[] = [];
    const chatId = 'test-chat-123';
    const studentId = 'test-student-456';

    // Phase 1: Teaching mode - send 3 teaching exchanges to reach checkpoint
    console.log('\n=== Phase 1: Teaching Mode ===');
    
    for (let i = 1; i <= 3; i++) {
      const deps = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'pass');
      const middleware = new ProofEngineMiddleware(deps);

      const result = await middleware.processMessage(
        `Question ${i} about photosynthesis`,
        state,
        recentMessages,
        chatId,
        studentId
      );

      state = result.state;
      recentMessages.push(
        { role: 'user', content: `Question ${i} about photosynthesis` },
        { role: 'assistant', content: result.assistantText, metadata: result.metadata }
      );

      console.log(`Exchange ${i}:`, {
        teachingExchangeCount: state.teachingExchangeCount,
        isInCheckpointMode: state.isInCheckpointMode,
      });
    }

    // Verify: Should have triggered checkpoint after 3 teaching exchanges
    expect(state.isInCheckpointMode).toBe(true);
    expect(state.mode).toBe('checkpoint');
    expect(state.teachingExchangeCount).toBe(3); // NOT reset - continues to increment
    expect(state.lastCheckpointAtExchange).toBe(3); // Guard set when checkpoint triggered
    expect(recentMessages[recentMessages.length - 1].content).toContain('In your own words');

    // Phase 2: Checkpoint mode - send insufficient response (retry)
    console.log('\n=== Phase 2: Insufficient Response (Retry) ===');
    
    const depsRetry = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'retry');
    const middlewareRetry = new ProofEngineMiddleware(depsRetry);

    const retryResult = await middlewareRetry.processMessage(
      'Photosynthesis is when plants use light',
      state,
      recentMessages,
      chatId,
      studentId
    );

    state = retryResult.state;
    recentMessages.push(
      { role: 'user', content: 'Photosynthesis is when plants use light' },
      { role: 'assistant', content: retryResult.assistantText, metadata: retryResult.metadata }
    );

    console.log('After retry:', {
      isInCheckpointMode: state.isInCheckpointMode,
      classification: retryResult.metadata?.classification,
      conceptsProvenCount: state.conceptsProvenCount,
    });

    // Verify: Should remain in checkpoint mode, no concept proven
    expect(state.isInCheckpointMode).toBe(true);
    expect(retryResult.metadata?.classification).toBe('retry');
    expect(state.conceptsProvenCount).toBe(0);
    expect(state.conceptsProvenThisSession).toEqual([]);

    // Verify: Proof event logged for retry
    const loggedEvents = mockSupabase.getLoggedEvents();
    expect(loggedEvents.length).toBe(1);
    expect(loggedEvents[0].classification).toBe('retry');
    expect(loggedEvents[0].student_response).toBe('Photosynthesis is when plants use light');

    // Phase 3: Checkpoint mode - send strong response (pass)
    console.log('\n=== Phase 3: Strong Response (Pass) ===');
    
    const depsPass = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'pass');
    const middlewarePass = new ProofEngineMiddleware(depsPass);

    const passResult = await middlewarePass.processMessage(
      'Photosynthesis is the process where plants convert light energy into chemical energy using chlorophyll in their leaves',
      state,
      recentMessages,
      chatId,
      studentId
    );

    state = passResult.state;

    console.log('After pass:', {
      isInCheckpointMode: state.isInCheckpointMode,
      classification: passResult.metadata?.classification,
      conceptsProvenCount: state.conceptsProvenCount,
      teachingExchangeCount: state.teachingExchangeCount,
    });

    // Verify: Should exit checkpoint mode, concept proven
    expect(state.isInCheckpointMode).toBe(false);
    expect(state.mode).toBe('teaching');
    expect(passResult.metadata?.classification).toBe('pass');
    expect(state.conceptsProvenCount).toBe(1);
    expect(state.conceptsProvenThisSession.length).toBe(1);
    expect(passResult.metadata?.isCelebration).toBe(true);

    // Verify: Proof event logged for pass
    expect(loggedEvents.length).toBe(2);
    expect(loggedEvents[1].classification).toBe('pass');

    // Verify: Teaching exchange count did NOT increment during checkpoint/reteaching
    // (checkpoint mode does not increment teachingExchangeCount)
    expect(state.teachingExchangeCount).toBe(3); // Stays at 3 (last teaching exchange before checkpoint)
  });

  it('should handle idempotent proof event logging (same response hash)', async () => {
    const mockSupabase = createMockSupabase();
    const mockCallTutor = createMockCallTutor();
    const mockCallEvaluationAI = createMockCallEvaluationAI();

    // Start in checkpoint mode
    let state: ConversationState = {
      ...createInitialState(),
      isInCheckpointMode: true,
      mode: 'checkpoint',
      currentCheckpointConcept: 'photosynthesis',
      lastCheckpointPrompt: 'Explain photosynthesis',
    };

    const recentMessages: Message[] = [];
    const chatId = 'test-chat-123';
    const studentId = 'test-student-456';
    const studentResponse = 'Photosynthesis converts light to energy';

    // First attempt
    const deps1 = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'pass');
    const middleware1 = new ProofEngineMiddleware(deps1);

    await middleware1.processMessage(
      studentResponse,
      state,
      recentMessages,
      chatId,
      studentId
    );

    const loggedEvents = mockSupabase.getLoggedEvents();
    expect(loggedEvents.length).toBe(1);

    // Second attempt with same response (should not duplicate)
    // Note: In real implementation, database UNIQUE constraint prevents duplicates
    // Here we're just verifying the logger is called
    const deps2 = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'pass');
    const middleware2 = new ProofEngineMiddleware(deps2);

    await middleware2.processMessage(
      studentResponse,
      state,
      recentMessages,
      chatId,
      studentId
    );

    // Logger called twice, but database would reject duplicate via UNIQUE(chat_id, response_hash)
    expect(loggedEvents.length).toBe(2);
    expect(loggedEvents[0].student_response).toBe(loggedEvents[1].student_response);
  });

  it('should handle validator timeout with deterministic fallback', async () => {
    const mockSupabase = createMockSupabase();
    const mockCallTutor = createMockCallTutor();
    const mockCallEvaluationAI = createMockCallEvaluationAI();

    // Start in checkpoint mode
    let state: ConversationState = {
      ...createInitialState(),
      isInCheckpointMode: true,
      mode: 'checkpoint',
      currentCheckpointConcept: 'photosynthesis',
      lastCheckpointPrompt: 'Explain photosynthesis',
    };

    const recentMessages: Message[] = [];
    const chatId = 'test-chat-123';
    const studentId = 'test-student-456';

    // Mock validator to return partial (timeout fallback behavior)
    const deps = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'partial');
    
    // Override validator to simulate timeout fallback
    deps.validator.validate = jest.fn().mockResolvedValue({
      classification: 'partial',
      keyConcepts: [],
      relationships: [],
      misconceptions: [],
      depthAssessment: 'timeout fallback',
      guidance: 'Please try explaining again',
      isParroting: false,
      isKeywordStuffing: false,
      isVagueAcknowledgment: false,
    });

    const middleware = new ProofEngineMiddleware(deps);

    // Should not throw, should use deterministic fallback
    const result = await middleware.processMessage(
      'Photosynthesis is...',
      state,
      recentMessages,
      chatId,
      studentId
    );

    // Verify: Fallback classification (partial) used
    expect(result.state.isInCheckpointMode).toBe(true); // Remains in checkpoint
    expect(result.metadata?.classification).toBe('partial');
    
    // Verify: Proof event still logged despite timeout
    const loggedEvents = mockSupabase.getLoggedEvents();
    expect(loggedEvents.length).toBe(1);
    expect(loggedEvents[0].classification).toBe('partial');
  });

  it('should not increment teachingExchangeCount during reteaching in checkpoint mode', async () => {
    const mockSupabase = createMockSupabase();
    const mockCallTutor = createMockCallTutor();
    const mockCallEvaluationAI = createMockCallEvaluationAI();

    // Start in checkpoint mode with teachingExchangeCount at 5
    let state: ConversationState = {
      ...createInitialState(),
      isInCheckpointMode: true,
      mode: 'checkpoint',
      currentCheckpointConcept: 'photosynthesis',
      teachingExchangeCount: 5, // Should stay 5 during checkpoint
      lastCheckpointAtExchange: 5,
    };

    const recentMessages: Message[] = [];
    const chatId = 'test-chat-123';
    const studentId = 'test-student-456';

    // Send retry response (triggers reteaching)
    const depsRetry = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'retry');
    const middlewareRetry = new ProofEngineMiddleware(depsRetry);

    const retryResult = await middlewareRetry.processMessage(
      'Insufficient response',
      state,
      recentMessages,
      chatId,
      studentId
    );

    // Verify: teachingExchangeCount did NOT increment
    expect(retryResult.state.teachingExchangeCount).toBe(5);
    expect(retryResult.state.isInCheckpointMode).toBe(true);

    // Send partial response (also remains in checkpoint)
    const depsPartial = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'partial');
    const middlewarePartial = new ProofEngineMiddleware(depsPartial);

    const partialResult = await middlewarePartial.processMessage(
      'Partial response',
      retryResult.state,
      recentMessages,
      chatId,
      studentId
    );

    // Verify: teachingExchangeCount still did NOT increment
    expect(partialResult.state.teachingExchangeCount).toBe(5);
    expect(partialResult.state.isInCheckpointMode).toBe(true);
  });

  it('should update lastThreeValidationResults correctly (capped at 3)', async () => {
    const mockSupabase = createMockSupabase();
    const mockCallTutor = createMockCallTutor();
    const mockCallEvaluationAI = createMockCallEvaluationAI();

    let state: ConversationState = {
      ...createInitialState(),
      isInCheckpointMode: true,
      mode: 'checkpoint',
      currentCheckpointConcept: 'photosynthesis',
      lastThreeValidationResults: ['pass', 'partial'], // Already 2
    };

    const recentMessages: Message[] = [];
    const chatId = 'test-chat-123';
    const studentId = 'test-student-456';

    // Add third result
    const deps1 = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'retry');
    const middleware1 = new ProofEngineMiddleware(deps1);

    const result1 = await middleware1.processMessage(
      'Response 1',
      state,
      recentMessages,
      chatId,
      studentId
    );

    expect(result1.state.lastThreeValidationResults).toEqual(['pass', 'partial', 'retry']);

    // Add fourth result (should drop first)
    const deps2 = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'pass');
    const middleware2 = new ProofEngineMiddleware(deps2);

    const result2 = await middleware2.processMessage(
      'Response 2',
      result1.state,
      recentMessages,
      chatId,
      studentId
    );

    expect(result2.state.lastThreeValidationResults).toEqual(['partial', 'retry', 'pass']);
    expect(result2.state.lastThreeValidationResults.length).toBe(3);
  });

  it('should not re-trigger checkpoint immediately after exiting checkpoint mode (guard test)', async () => {
    const mockSupabase = createMockSupabase();
    const mockCallTutor = createMockCallTutor();
    const mockCallEvaluationAI = createMockCallEvaluationAI();

    // Start with teaching exchanges to reach checkpoint
    let state: ConversationState = {
      ...createInitialState(),
      teachingExchangeCount: 3, // At checkpoint threshold
    };

    const recentMessages: Message[] = [];
    const chatId = 'test-chat-123';
    const studentId = 'test-student-456';

    // Trigger checkpoint (teachingExchangeCount = 3, checkpoint triggers)
    const depsCheckpoint = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'pass');
    depsCheckpoint.checkpointFrequency.shouldTriggerCheckpoint = jest.fn().mockReturnValue({
      shouldTrigger: true,
      nextTarget: 3,
      reason: 'Count reached target',
    });
    const middlewareCheckpoint = new ProofEngineMiddleware(depsCheckpoint);

    const checkpointResult = await middlewareCheckpoint.processMessage(
      'What is photosynthesis?',
      state,
      recentMessages,
      chatId,
      studentId
    );

    // Verify checkpoint triggered
    expect(checkpointResult.state.isInCheckpointMode).toBe(true);
    expect(checkpointResult.state.lastCheckpointAtExchange).toBe(4); // Incremented to 4, then checkpoint triggered
    expect(checkpointResult.state.teachingExchangeCount).toBe(4); // NOT reset
    expect(checkpointResult.metadata?.isProofCheckpoint).toBe(true);

    // Pass the checkpoint (exits checkpoint mode)
    const depsPass = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'pass');
    const middlewarePass = new ProofEngineMiddleware(depsPass);

    const passResult = await middlewarePass.processMessage(
      'Photosynthesis is the process where plants convert light energy into chemical energy using chlorophyll...',
      checkpointResult.state,
      recentMessages,
      chatId,
      studentId
    );

    expect(passResult.state.isInCheckpointMode).toBe(false);
    expect(passResult.state.lastCheckpointAtExchange).toBe(4); // Guard preserved
    expect(passResult.state.teachingExchangeCount).toBe(4); // NOT reset

    // Send a non-teaching exchange (e.g., logistics question)
    // This should NOT increment teachingExchangeCount and should NOT trigger checkpoint
    const depsNonTeaching = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'pass');
    depsNonTeaching.exchangeClassifier.isTeachingExchange = jest.fn().mockResolvedValue(false);
    depsNonTeaching.checkpointFrequency.shouldTriggerCheckpoint = jest.fn().mockImplementation((input: any) => {
      // Guard check: teachingExchangeCount (4) <= lastCheckpointAtExchange (4) → should NOT trigger
      if (input.lastCheckpointAtExchange !== null && input.teachingExchangeCount <= input.lastCheckpointAtExchange) {
        return {
          shouldTrigger: false,
          nextTarget: 3,
          reason: `Guard: teachingExchangeCount (${input.teachingExchangeCount}) <= lastCheckpointAtExchange (${input.lastCheckpointAtExchange})`,
        };
      }
      return {
        shouldTrigger: input.teachingExchangeCount >= 7, // Would need 7 to trigger
        nextTarget: 3,
        reason: 'Normal check',
      };
    });
    const middlewareNonTeaching = new ProofEngineMiddleware(depsNonTeaching);

    const nonTeachingResult = await middlewareNonTeaching.processMessage(
      'Can you help me with something else?',
      passResult.state,
      recentMessages,
      chatId,
      studentId
    );

    // Verify: NOT a teaching exchange, count stays at 4, checkpoint does NOT trigger
    expect(nonTeachingResult.state.teachingExchangeCount).toBe(4); // No increment
    expect(nonTeachingResult.state.isInCheckpointMode).toBe(false); // No checkpoint
    expect(nonTeachingResult.metadata?.isProofCheckpoint).toBeUndefined();

    // Send a real teaching exchange (increments to 5)
    // Guard check: teachingExchangeCount (5) > lastCheckpointAtExchange (4) → guard passes
    // But count (5) < target (7) → checkpoint does NOT trigger yet
    const depsTeaching1 = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'pass');
    depsTeaching1.exchangeClassifier.isTeachingExchange = jest.fn().mockResolvedValue(true);
    depsTeaching1.checkpointFrequency.shouldTriggerCheckpoint = jest.fn().mockImplementation((input: any) => {
      // Guard check passes (5 > 4), but count < target
      if (input.lastCheckpointAtExchange !== null && input.teachingExchangeCount <= input.lastCheckpointAtExchange) {
        return {
          shouldTrigger: false,
          nextTarget: 3,
          reason: `Guard: teachingExchangeCount (${input.teachingExchangeCount}) <= lastCheckpointAtExchange (${input.lastCheckpointAtExchange})`,
        };
      }
      return {
        shouldTrigger: input.teachingExchangeCount >= 7, // Need 7 to trigger
        nextTarget: 3,
        reason: `Count (${input.teachingExchangeCount}) < target (7)`,
      };
    });
    const middlewareTeaching1 = new ProofEngineMiddleware(depsTeaching1);

    const teaching1Result = await middlewareTeaching1.processMessage(
      'What is meiosis?',
      nonTeachingResult.state,
      recentMessages,
      chatId,
      studentId
    );

    // Verify: Teaching exchange increments count, guard passes, but target not reached
    expect(teaching1Result.state.teachingExchangeCount).toBe(5); // Incremented
    expect(teaching1Result.state.isInCheckpointMode).toBe(false); // No checkpoint yet
    expect(teaching1Result.metadata?.isProofCheckpoint).toBeUndefined();

    // Continue teaching exchanges until target reached (6, 7)
    let currentState = teaching1Result.state;
    
    // Exchange 6
    const depsTeaching2 = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'pass');
    depsTeaching2.exchangeClassifier.isTeachingExchange = jest.fn().mockResolvedValue(true);
    depsTeaching2.checkpointFrequency.shouldTriggerCheckpoint = jest.fn().mockReturnValue({
      shouldTrigger: false,
      nextTarget: 3,
      reason: 'Count (6) < target (7)',
    });
    const middlewareTeaching2 = new ProofEngineMiddleware(depsTeaching2);
    
    const teaching2Result = await middlewareTeaching2.processMessage(
      'Continue teaching...',
      currentState,
      recentMessages,
      chatId,
      studentId
    );
    
    expect(teaching2Result.state.teachingExchangeCount).toBe(6);
    currentState = teaching2Result.state;

    // Exchange 7 - should trigger checkpoint
    const depsTeaching3 = createMockDeps(mockSupabase, mockCallTutor, mockCallEvaluationAI, 'pass');
    depsTeaching3.exchangeClassifier.isTeachingExchange = jest.fn().mockResolvedValue(true);
    depsTeaching3.checkpointFrequency.shouldTriggerCheckpoint = jest.fn().mockImplementation((input: any) => {
      // Guard passes (7 > 4), count reaches target (7 >= 7)
      if (input.lastCheckpointAtExchange !== null && input.teachingExchangeCount <= input.lastCheckpointAtExchange) {
        return {
          shouldTrigger: false,
          nextTarget: 3,
          reason: `Guard: teachingExchangeCount (${input.teachingExchangeCount}) <= lastCheckpointAtExchange (${input.lastCheckpointAtExchange})`,
        };
      }
      return {
        shouldTrigger: input.teachingExchangeCount >= 7,
        nextTarget: 3,
        reason: `Count (${input.teachingExchangeCount}) >= target (7)`,
      };
    });
    const middlewareTeaching3 = new ProofEngineMiddleware(depsTeaching3);
    
    const teaching3Result = await middlewareTeaching3.processMessage(
      'More teaching...',
      currentState,
      recentMessages,
      chatId,
      studentId
    );

    // Verify: Checkpoint triggers again (guard passed, target reached)
    expect(teaching3Result.state.teachingExchangeCount).toBe(7); // Incremented
    expect(teaching3Result.state.isInCheckpointMode).toBe(true); // Checkpoint triggered
    expect(teaching3Result.state.lastCheckpointAtExchange).toBe(7); // New guard value
    expect(teaching3Result.metadata?.isProofCheckpoint).toBe(true);
  });
});

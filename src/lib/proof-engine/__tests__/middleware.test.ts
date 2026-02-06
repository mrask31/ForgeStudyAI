/**
 * Unit Tests for Proof Engine Middleware
 * 
 * Tests:
 * - State initialization with safe defaults
 * - Teaching exchange counting
 * - Checkpoint triggering when count reaches target
 * - Pass exits checkpoint mode and increments conceptsProvenThisSession
 * - Partial/retry remain in checkpoint mode
 * - Reteaching does not increment teachingExchangeCount
 */

import { ProofEngineMiddleware } from '../middleware';
import type {
  ConversationState,
  Message,
  MiddlewareDependencies,
  ValidationResult,
} from '../types';

describe('ProofEngineMiddleware', () => {
  // Mock dependencies
  const createMockDeps = (): MiddlewareDependencies => ({
    callTutor: jest.fn().mockResolvedValue('Teaching response about photosynthesis'),
    validator: {
      validate: jest.fn().mockResolvedValue({
        classification: 'pass',
        keyConcepts: ['photosynthesis'],
        relationships: [],
        misconceptions: [],
        depthAssessment: 'good',
        guidance: '',
        isParroting: false,
        isKeywordStuffing: false,
        isVagueAcknowledgment: false,
      }),
    },
    logger: {
      logEvent: jest.fn().mockResolvedValue(undefined),
    },
    promptGenerator: {
      generateExplainBackPrompt: jest.fn().mockResolvedValue('In your own words, explain photosynthesis.'),
    },
    exchangeClassifier: {
      isTeachingExchange: jest.fn().mockResolvedValue(true),
    },
    checkpointFrequency: {
      shouldTriggerCheckpoint: jest.fn().mockReturnValue({
        shouldTrigger: false,
        nextTarget: 3,
        reason: 'Not yet',
      }),
      updateCheckpointTarget: jest.fn().mockReturnValue(3),
    },
    adaptiveResponses: {
      generateResponse: jest.fn().mockResolvedValue({
        content: 'Great job!',
        shouldAdvance: true,
        shouldReteach: false,
        metadata: { isCelebration: true },
      }),
    },
  });

  const createInitialState = (): Partial<ConversationState> => ({
    mode: 'teaching',
    teachingExchangeCount: 0,
    isInCheckpointMode: false,
    gradeLevel: 8,
  });

  describe('State Initialization', () => {
    it('should initialize missing fields with safe defaults', async () => {
      const deps = createMockDeps();
      const middleware = new ProofEngineMiddleware(deps);

      const partialState: Partial<ConversationState> = {
        mode: 'teaching',
      };

      const result = await middleware.processMessage(
        'What is photosynthesis?',
        partialState as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.teachingExchangeCount).toBe(1); // Incremented from 0
      expect(result.state.isInCheckpointMode).toBe(false);
      expect(result.state.conceptsProvenThisSession).toEqual([]);
      expect(result.state.lastThreeValidationResults).toEqual([]);
      expect(result.state.gradeLevel).toBe(8);
      expect(result.state.nextCheckpointTarget).toBe(3);
    });

    it('should preserve existing state fields', async () => {
      const deps = createMockDeps();
      const middleware = new ProofEngineMiddleware(deps);

      const existingState: Partial<ConversationState> = {
        mode: 'teaching',
        teachingExchangeCount: 2,
        conceptsProvenThisSession: ['mitosis'],
        gradeLevel: 10,
      };

      const result = await middleware.processMessage(
        'What is photosynthesis?',
        existingState as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.teachingExchangeCount).toBe(3); // Incremented from 2
      expect(result.state.conceptsProvenThisSession).toContain('mitosis');
      expect(result.state.gradeLevel).toBe(10);
    });
  });

  describe('Teaching Mode - Exchange Counting', () => {
    it('should increment teachingExchangeCount when isTeachingExchange is true', async () => {
      const deps = createMockDeps();
      deps.exchangeClassifier.isTeachingExchange = jest.fn().mockResolvedValue(true);
      
      const middleware = new ProofEngineMiddleware(deps);
      const state = createInitialState();

      const result = await middleware.processMessage(
        'What is photosynthesis?',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.teachingExchangeCount).toBe(1);
      expect(result.metadata?.isTeachingExchange).toBe(true);
    });

    it('should not increment teachingExchangeCount when isTeachingExchange is false', async () => {
      const deps = createMockDeps();
      deps.exchangeClassifier.isTeachingExchange = jest.fn().mockResolvedValue(false);
      
      const middleware = new ProofEngineMiddleware(deps);
      const state = createInitialState();

      const result = await middleware.processMessage(
        'Hello',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.teachingExchangeCount).toBe(0);
      expect(result.metadata?.isTeachingExchange).toBe(false);
    });

    it('should accumulate teachingExchangeCount across multiple teaching exchanges', async () => {
      const deps = createMockDeps();
      deps.exchangeClassifier.isTeachingExchange = jest.fn().mockResolvedValue(true);
      
      const middleware = new ProofEngineMiddleware(deps);
      let state = createInitialState() as ConversationState;

      // First exchange
      let result = await middleware.processMessage('Question 1', state, [], 'chat-123', 'student-456');
      state = result.state;
      expect(state.teachingExchangeCount).toBe(1);

      // Second exchange
      result = await middleware.processMessage('Question 2', state, [], 'chat-123', 'student-456');
      state = result.state;
      expect(state.teachingExchangeCount).toBe(2);

      // Third exchange
      result = await middleware.processMessage('Question 3', state, [], 'chat-123', 'student-456');
      state = result.state;
      expect(state.teachingExchangeCount).toBe(3);
    });
  });

  describe('Teaching Mode - Checkpoint Triggering', () => {
    it('should trigger checkpoint when shouldTriggerCheckpoint returns true', async () => {
      const deps = createMockDeps();
      deps.exchangeClassifier.isTeachingExchange = jest.fn().mockResolvedValue(true);
      deps.checkpointFrequency.shouldTriggerCheckpoint = jest.fn().mockReturnValue({
        shouldTrigger: true,
        nextTarget: 3,
        reason: 'Count reached target',
      });
      
      const middleware = new ProofEngineMiddleware(deps);
      const state: Partial<ConversationState> = {
        ...createInitialState(),
        teachingExchangeCount: 2, // Will be 3 after increment
      };

      const result = await middleware.processMessage(
        'What is photosynthesis?',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.isInCheckpointMode).toBe(true);
      expect(result.state.mode).toBe('checkpoint');
      expect(result.state.teachingExchangeCount).toBe(3); // NOT reset - continues incrementing
      expect(result.metadata?.isProofCheckpoint).toBe(true);
      expect(result.assistantText).toContain('In your own words');
    });

    it('should not trigger checkpoint in introductory phase (< 2 exchanges)', async () => {
      const deps = createMockDeps();
      deps.exchangeClassifier.isTeachingExchange = jest.fn().mockResolvedValue(true);
      
      const middleware = new ProofEngineMiddleware(deps);
      const state: Partial<ConversationState> = {
        ...createInitialState(),
        teachingExchangeCount: 0,
      };

      const result = await middleware.processMessage(
        'What is photosynthesis?',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.isInCheckpointMode).toBe(false);
      expect(result.state.teachingExchangeCount).toBe(1);
    });

    it('should not trigger checkpoint when already in checkpoint mode', async () => {
      const deps = createMockDeps();
      
      const middleware = new ProofEngineMiddleware(deps);
      const state: Partial<ConversationState> = {
        ...createInitialState(),
        isInCheckpointMode: true,
        mode: 'checkpoint',
        teachingExchangeCount: 5,
      };

      const result = await middleware.processMessage(
        'Photosynthesis is...',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      // Should handle as checkpoint mode (validation), not trigger new checkpoint
      expect(deps.validator.validate).toHaveBeenCalled();
    });
  });

  describe('Checkpoint Mode - Pass Classification', () => {
    it('should exit checkpoint mode on pass', async () => {
      const deps = createMockDeps();
      deps.validator.validate = jest.fn().mockResolvedValue({
        classification: 'pass',
        keyConcepts: ['photosynthesis'],
        relationships: [],
        misconceptions: [],
        depthAssessment: 'good',
        guidance: '',
        isParroting: false,
        isKeywordStuffing: false,
        isVagueAcknowledgment: false,
      });
      
      const middleware = new ProofEngineMiddleware(deps);
      const state: Partial<ConversationState> = {
        ...createInitialState(),
        isInCheckpointMode: true,
        mode: 'checkpoint',
        currentCheckpointConcept: 'photosynthesis',
        lastCheckpointPrompt: 'Explain photosynthesis',
      };

      const result = await middleware.processMessage(
        'Photosynthesis is the process where plants convert light into energy...',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.isInCheckpointMode).toBe(false);
      expect(result.state.mode).toBe('teaching');
      expect(result.state.currentCheckpointConcept).toBe(null);
      expect(result.metadata?.classification).toBe('pass');
      expect(result.metadata?.isCelebration).toBe(true);
    });

    it('should add concept to conceptsProvenThisSession on pass', async () => {
      const deps = createMockDeps();
      deps.validator.validate = jest.fn().mockResolvedValue({
        classification: 'pass',
        keyConcepts: ['photosynthesis'],
        relationships: [],
        misconceptions: [],
        depthAssessment: 'good',
        guidance: '',
        isParroting: false,
        isKeywordStuffing: false,
        isVagueAcknowledgment: false,
      });
      
      const middleware = new ProofEngineMiddleware(deps);
      const state: Partial<ConversationState> = {
        ...createInitialState(),
        isInCheckpointMode: true,
        mode: 'checkpoint',
        currentCheckpointConcept: 'photosynthesis',
        conceptsProvenThisSession: [],
      };

      const result = await middleware.processMessage(
        'Photosynthesis is...',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.conceptsProvenThisSession).toContain('photosynthesis');
      expect(result.state.conceptsProven).toContain('photosynthesis');
      expect(result.state.conceptsProvenCount).toBe(1);
    });

    it('should deduplicate concepts in conceptsProvenThisSession', async () => {
      const deps = createMockDeps();
      deps.validator.validate = jest.fn().mockResolvedValue({
        classification: 'pass',
        keyConcepts: ['photosynthesis'],
        relationships: [],
        misconceptions: [],
        depthAssessment: 'good',
        guidance: '',
        isParroting: false,
        isKeywordStuffing: false,
        isVagueAcknowledgment: false,
      });
      
      const middleware = new ProofEngineMiddleware(deps);
      const state: Partial<ConversationState> = {
        ...createInitialState(),
        isInCheckpointMode: true,
        mode: 'checkpoint',
        currentCheckpointConcept: 'photosynthesis',
        conceptsProvenThisSession: ['photosynthesis'], // Already proven
      };

      const result = await middleware.processMessage(
        'Photosynthesis is...',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.conceptsProvenThisSession).toEqual(['photosynthesis']);
      expect(result.state.conceptsProvenThisSession.length).toBe(1);
    });
  });

  describe('Checkpoint Mode - Partial Classification', () => {
    it('should remain in checkpoint mode on partial', async () => {
      const deps = createMockDeps();
      deps.validator.validate = jest.fn().mockResolvedValue({
        classification: 'partial',
        keyConcepts: ['light'],
        relationships: [],
        misconceptions: [],
        depthAssessment: 'incomplete',
        guidance: 'You mentioned light but not energy conversion',
        isParroting: false,
        isKeywordStuffing: false,
        isVagueAcknowledgment: false,
      });
      
      const middleware = new ProofEngineMiddleware(deps);
      const state: Partial<ConversationState> = {
        ...createInitialState(),
        isInCheckpointMode: true,
        mode: 'checkpoint',
        currentCheckpointConcept: 'photosynthesis',
      };

      const result = await middleware.processMessage(
        'Photosynthesis uses light...',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.isInCheckpointMode).toBe(true);
      expect(result.state.mode).toBe('checkpoint');
      expect(result.metadata?.classification).toBe('partial');
    });

    it('should not add concept to conceptsProvenThisSession on partial', async () => {
      const deps = createMockDeps();
      deps.validator.validate = jest.fn().mockResolvedValue({
        classification: 'partial',
        keyConcepts: ['light'],
        relationships: [],
        misconceptions: [],
        depthAssessment: 'incomplete',
        guidance: 'You mentioned light but not energy conversion',
        isParroting: false,
        isKeywordStuffing: false,
        isVagueAcknowledgment: false,
      });
      
      const middleware = new ProofEngineMiddleware(deps);
      const state: Partial<ConversationState> = {
        ...createInitialState(),
        isInCheckpointMode: true,
        mode: 'checkpoint',
        currentCheckpointConcept: 'photosynthesis',
        conceptsProvenThisSession: [],
      };

      const result = await middleware.processMessage(
        'Photosynthesis uses light...',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.conceptsProvenThisSession).toEqual([]);
    });
  });

  describe('Checkpoint Mode - Retry Classification', () => {
    it('should remain in checkpoint mode on retry', async () => {
      const deps = createMockDeps();
      deps.validator.validate = jest.fn().mockResolvedValue({
        classification: 'retry',
        keyConcepts: [],
        relationships: [],
        misconceptions: ['confused light with heat'],
        depthAssessment: 'insufficient',
        guidance: 'Let me explain differently',
        isParroting: true,
        isKeywordStuffing: false,
        isVagueAcknowledgment: false,
      });
      
      const middleware = new ProofEngineMiddleware(deps);
      const state: Partial<ConversationState> = {
        ...createInitialState(),
        isInCheckpointMode: true,
        mode: 'checkpoint',
        currentCheckpointConcept: 'photosynthesis',
      };

      const result = await middleware.processMessage(
        'Photosynthesis is when plants use light...',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.isInCheckpointMode).toBe(true);
      expect(result.state.mode).toBe('checkpoint');
      expect(result.metadata?.classification).toBe('retry');
      expect(result.metadata?.isProofCheckpoint).toBe(true);
    });

    it('should not add concept to conceptsProvenThisSession on retry', async () => {
      const deps = createMockDeps();
      deps.validator.validate = jest.fn().mockResolvedValue({
        classification: 'retry',
        keyConcepts: [],
        relationships: [],
        misconceptions: [],
        depthAssessment: 'insufficient',
        guidance: 'Let me explain differently',
        isParroting: true,
        isKeywordStuffing: false,
        isVagueAcknowledgment: false,
      });
      
      const middleware = new ProofEngineMiddleware(deps);
      const state: Partial<ConversationState> = {
        ...createInitialState(),
        isInCheckpointMode: true,
        mode: 'checkpoint',
        currentCheckpointConcept: 'photosynthesis',
        conceptsProvenThisSession: [],
      };

      const result = await middleware.processMessage(
        'Photosynthesis is...',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.conceptsProvenThisSession).toEqual([]);
    });
  });

  describe('Validation History Management', () => {
    it('should update lastThreeValidationResults on validation', async () => {
      const deps = createMockDeps();
      deps.validator.validate = jest.fn().mockResolvedValue({
        classification: 'pass',
        keyConcepts: ['photosynthesis'],
        relationships: [],
        misconceptions: [],
        depthAssessment: 'good',
        guidance: '',
        isParroting: false,
        isKeywordStuffing: false,
        isVagueAcknowledgment: false,
      });
      
      const middleware = new ProofEngineMiddleware(deps);
      const state: Partial<ConversationState> = {
        ...createInitialState(),
        isInCheckpointMode: true,
        mode: 'checkpoint',
        currentCheckpointConcept: 'photosynthesis',
        lastThreeValidationResults: [],
      };

      const result = await middleware.processMessage(
        'Photosynthesis is...',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.lastThreeValidationResults).toEqual(['pass']);
    });

    it('should cap lastThreeValidationResults at 3 entries', async () => {
      const deps = createMockDeps();
      deps.validator.validate = jest.fn().mockResolvedValue({
        classification: 'pass',
        keyConcepts: ['photosynthesis'],
        relationships: [],
        misconceptions: [],
        depthAssessment: 'good',
        guidance: '',
        isParroting: false,
        isKeywordStuffing: false,
        isVagueAcknowledgment: false,
      });
      
      const middleware = new ProofEngineMiddleware(deps);
      const state: Partial<ConversationState> = {
        ...createInitialState(),
        isInCheckpointMode: true,
        mode: 'checkpoint',
        currentCheckpointConcept: 'photosynthesis',
        lastThreeValidationResults: ['pass', 'partial', 'retry'], // Already 3
      };

      const result = await middleware.processMessage(
        'Photosynthesis is...',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.lastThreeValidationResults).toEqual(['partial', 'retry', 'pass']);
      expect(result.state.lastThreeValidationResults.length).toBe(3);
    });
  });

  describe('Proof Event Logging', () => {
    it('should log proof event on validation', async () => {
      const deps = createMockDeps();
      deps.validator.validate = jest.fn().mockResolvedValue({
        classification: 'pass',
        keyConcepts: ['photosynthesis'],
        relationships: [],
        misconceptions: [],
        depthAssessment: 'good',
        guidance: '',
        isParroting: false,
        isKeywordStuffing: false,
        isVagueAcknowledgment: false,
      });
      
      const middleware = new ProofEngineMiddleware(deps);
      const state: Partial<ConversationState> = {
        ...createInitialState(),
        isInCheckpointMode: true,
        mode: 'checkpoint',
        currentCheckpointConcept: 'photosynthesis',
        lastCheckpointPrompt: 'Explain photosynthesis',
      };

      await middleware.processMessage(
        'Photosynthesis is the process...',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(deps.logger.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: 'chat-123',
          student_id: 'student-456',
          concept: 'photosynthesis',
          prompt: 'Explain photosynthesis',
          student_response: 'Photosynthesis is the process...',
          classification: 'pass',
        })
      );
    });

    it('should continue despite logging failure', async () => {
      const deps = createMockDeps();
      deps.logger.logEvent = jest.fn().mockRejectedValue(new Error('Database error'));
      deps.validator.validate = jest.fn().mockResolvedValue({
        classification: 'pass',
        keyConcepts: ['photosynthesis'],
        relationships: [],
        misconceptions: [],
        depthAssessment: 'good',
        guidance: '',
        isParroting: false,
        isKeywordStuffing: false,
        isVagueAcknowledgment: false,
      });
      
      const middleware = new ProofEngineMiddleware(deps);
      const state: Partial<ConversationState> = {
        ...createInitialState(),
        isInCheckpointMode: true,
        mode: 'checkpoint',
        currentCheckpointConcept: 'photosynthesis',
      };

      // Should not throw
      const result = await middleware.processMessage(
        'Photosynthesis is...',
        state as ConversationState,
        [],
        'chat-123',
        'student-456'
      );

      expect(result.state.isInCheckpointMode).toBe(false); // Still processed
    });
  });
});

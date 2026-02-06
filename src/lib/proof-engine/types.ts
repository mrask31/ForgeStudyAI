/**
 * Proof Engine Type Definitions
 * 
 * Central type definitions for the Proof Engine system.
 * All components import from this file to avoid duplication.
 */

// ============================================
// Core Data Models
// ============================================

/**
 * Conversation state tracking for proof engine
 */
export interface ConversationState {
  mode: 'teaching' | 'checkpoint';
  teachingExchangeCount: number;
  checkpointTarget: number;
  validationHistory: ValidationClassification[];
  currentConcept: string | null;
  conceptsProven: string[];
  conceptsProvenCount: number;
  lastCheckpointAt: Date | null;
  lastCheckpointAtExchange: number | null; // Guard: prevents immediate re-triggering
  // Additional fields for middleware
  isInCheckpointMode: boolean;
  currentCheckpointConcept: string | null;
  lastThreeValidationResults: ValidationClassification[];
  conceptsProvenThisSession: string[];
  nextCheckpointTarget: number;
  gradeLevel: number;
  lastCheckpointPrompt?: string;
}

/**
 * Validation classification types
 */
export type ValidationClassification = 'pass' | 'partial' | 'retry';

/**
 * Validation result from understanding validator
 */
export interface ValidationResult {
  classification: ValidationClassification;
  keyConcepts: string[];
  relationships: string[];
  misconceptions: string[];
  depthAssessment: string;
  guidance: string;
  isParroting: boolean;
  isKeywordStuffing: boolean;
  isVagueAcknowledgment: boolean;
  diagnosticHint?: string; // Optional: ONE sentence explaining what's missing (retry only, never stored)
}

/**
 * Proof event record (database model)
 */
export interface ProofEvent {
  id: string;
  chat_id: string;
  student_id: string;
  concept: string;
  prompt: string;
  student_response: string;
  student_response_excerpt: string;
  response_hash: string;
  validation_result: ValidationResult;
  classification: ValidationClassification;
  created_at: Date;
}

/**
 * Proof event insert (for database operations)
 */
export interface ProofEventInsert {
  chat_id: string;
  student_id: string;
  concept: string;
  prompt: string;
  student_response: string;
  student_response_excerpt: string;
  response_hash: string;
  validation_result: ValidationResult;
  classification: ValidationClassification;
}

/**
 * Proof statistics aggregation
 */
export interface ProofStats {
  totalAttempts: number;
  passCount: number;
  partialCount: number;
  retryCount: number;
  passRate: number;
  conceptsProven: string[];
}

/**
 * Message with metadata
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: MessageMetadata;
}

/**
 * Message metadata for proof engine tracking
 */
export interface MessageMetadata {
  isTeachingExchange?: boolean;
  isProofCheckpoint?: boolean;
  isProofAttempt?: boolean;
  isValidationFeedback?: boolean;
  isCelebration?: boolean;
  concept?: string;
  validationResult?: ValidationResult;
}

// ============================================
// Validation Pipeline Types
// ============================================

/**
 * Insufficient response check result
 */
export interface InsufficientResponseCheck {
  isInsufficient: boolean;
  isParroting: boolean;
  isKeywordStuffing: boolean;
  isVagueAcknowledgment: boolean;
  reason: string;
}

/**
 * Comprehension assessment result
 */
export interface ComprehensionAssessment {
  keyConcepts: string[];
  relationships: string[];
  misconceptions: string[];
  depthAssessment: string;
  gradeLevel: number;
}

// ============================================
// Adaptive Response Types
// ============================================

/**
 * Adaptive response generation input
 */
export interface AdaptiveResponseInput {
  validationResult: ValidationResult;
  conversationState: ConversationState;
  teachingContext: Message[];
  gradeLevel: number;
}

/**
 * Adaptive response output
 */
export interface AdaptiveResponse {
  content: string;
  shouldAdvance: boolean;
  shouldReteach: boolean;
  metadata: MessageMetadata;
}

// ============================================
// Teaching Exchange Classification Types
// ============================================

/**
 * Teaching exchange classification result
 */
export interface TeachingExchangeClassification {
  isTeaching: boolean;
  confidence: 'high' | 'low';
  reason: string;
  usedAI: boolean;
}

// ============================================
// Checkpoint Frequency Types
// ============================================

/**
 * Checkpoint frequency calculation input
 */
export interface CheckpointFrequencyInput {
  validationHistory: ValidationClassification[];
  teachingExchangeCount: number;
  isInCheckpointMode: boolean;
  isIntroductoryPhase: boolean;
  lastCheckpointAtExchange: number | null; // Guard: prevents immediate re-triggering
}

/**
 * Checkpoint frequency calculation result
 */
export interface CheckpointFrequencyResult {
  shouldTrigger: boolean;
  nextTarget: number;
  reason: string;
}

// ============================================
// Prompt Generation Types
// ============================================

/**
 * Explain-back prompt generation input
 */
export interface ExplainBackPromptInput {
  recentExchanges: Message[];
  concept: string;
  gradeLevel: number;
}

/**
 * Explain-back prompt generation result
 */
export interface ExplainBackPrompt {
  prompt: string;
  isOpenEnded: boolean;
  referencedConcepts: string[];
}

// ============================================
// Middleware Types
// ============================================

/**
 * Processed response from middleware
 */
export interface ProcessedResponse {
  assistantText: string;
  state: ConversationState;
  metadata?: Record<string, any>;
}

/**
 * Middleware dependencies (injected)
 */
export interface MiddlewareDependencies {
  callTutor: (input: { message: string; recentMessages: Message[] }) => Promise<string>;
  validator: any; // UnderstandingValidator instance
  logger: any; // ProofEventLogger instance
  promptGenerator: {
    generateExplainBackPrompt: (input: {
      teachingContext: Message[];
      gradeLevel: number;
      concept?: string | null;
    }, callAI?: (prompt: string) => Promise<string>) => Promise<string>;
  };
  exchangeClassifier: {
    isTeachingExchange: (message: Message, callAI?: (prompt: string) => Promise<string>) => Promise<boolean>;
  };
  checkpointFrequency: {
    shouldTriggerCheckpoint: (input: any) => any;
    updateCheckpointTarget: (validationHistory: ValidationClassification[]) => number;
  };
  adaptiveResponses: any; // AdaptiveResponseGenerator instance
}

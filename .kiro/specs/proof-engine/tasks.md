# Implementation Plan: Proof Engine

## Overview

This implementation plan breaks down the Proof Engine into discrete, incremental coding tasks. The approach follows a bottom-up strategy: build database schema and infrastructure first, then core validation components, logging system, middleware integration, and finally API and dashboard integration. Each task builds on previous work, with property-based tests placed close to implementation to catch errors early.

The implementation uses TypeScript with fast-check for property-based testing, iPerfect! I've regenerated the complete tasks.md file for the proof-engine spec. Now let me ask for your review and approval.

I've regenerated the complete tasks.md file for the proof-engine spec. The task list follows a bottom-up implementation approach with 15 major tasks covering:

Database schema and infrastructure setup
Proof Event Logger component
Understanding Validator component
Adaptive Response Generator component
Teaching exchange classification logic
Checkpoint frequency calculation logic
Explain-back prompt generation
Proof Engine Middleware core
First checkpoint for core components
Chat API integration
Parent dashboard proof event display
Milestone notification system
Learning receipt proof summary
Session progress display
Final comprehensive testing checkpoint
Each major task has detailed sub-tasks with clear requirements references. Property-based tests are marked as optional with * and placed close to their corresponding implementations.

Does the task list look good? Would you like me to make any adjustments before you begin implementation?ntegrates with the existing ForgeStudy Supabase database, and follows the established patterns in the codebase.

## Tasks

- [x] 1. Set up Proof Engine infrastructure and database schema
  - Create directory structure: `src/lib/proof-engine/`
  - Create database migration for `proof_events` table with all columns (id, chat_id, student_id, concept, prompt, student_response, student_response_excerpt, response_hash, validation_result, classification, created_at)
  - Add indexes: student_id + created_at DESC, chat_id, classification, response_hash
  - Add unique constraint: UNIQUE (chat_id, response_hash) for deduplication
  - Create TypeScript types for core data models: `ConversationState`, `ValidationResult`, `ProofEvent`, `Message` with metadata
  - Set up test infrastructure with fast-check library
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 2. Implement Proof Event Logger component
  - [x] 2.1 Create `src/lib/proof-engine/logger.ts` with ProofEventLogger class
    - Implement `logEvent()` method with database upsert (INSERT ... ON CONFLICT DO NOTHING) using response_hash for idempotency
    - Implement response hash generation (SHA-256 of chat_id + student_response + timestamp)
    - Implement `getStudentProofHistory()` method with student_id query and limit parameter
    - Implement `getChatProofEvents()` method with chat_id query
    - Implement `getProofStats()` method with aggregation logic (total attempts, pass/partial/retry counts, pass rate, concepts proven list)
    - Add excerpt generation logic (first 200 chars, sanitized)
    - Add error handling for database write failures with in-memory retry buffer (5-minute TTL)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 2.2 Write property test for proof event persistence (REQUIRED FOR MVP)
    - **Property 7: Proof Event Persistence Completeness**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
    - Generate random proof attempts (all classifications)
    - Verify complete record persisted with all required fields
    - Verify queryable by parent dashboard
    - Verify idempotency: duplicate hash does not create duplicate records
  
  - [ ]* 2.3 Write unit tests for ProofEventLogger
    - Test database write failure handling and retry queue
    - Test excerpt generation with various response lengths
    - Test hash generation for deduplication
    - Test stats aggregation with mixed results
    - _Requirements: 5.1, 5.5_

- [-] 3. Implement Understanding Validator component
  - [x] 3.1 Create `src/lib/proof-engine/validator.ts` with UnderstandingValidator class
    - Define and enforce strict schema for AI JSON outputs using zod (ValidationResult, InsufficientResponseCheck, ComprehensionAssessment)
    - Add schema validation with fallback: if parsing fails, use fallback classification + log raw output
    - Implement `validate()` main entry point method
    - Implement `detectInsufficientResponse()` method with AI-powered analysis (parroting, keyword stuffing, vague acknowledgment detection)
    - Implement `assessComprehension()` method with grade-level adaptation (key concepts, relationships, misconceptions, depth assessment)
    - Implement `classifyAndGuide()` method with classification logic (pass/partial/retry) and guidance generation
    - Add 3-second timeout handling with fallback to 'partial' classification
    - Add error handling for AI service failures with heuristic fallback
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2_
  
  - [ ]* 3.2 Write property test for validation classification completeness
    - **Property 4: Validation Classification Completeness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
    - Generate random proof attempts
    - Verify exactly one classification returned from {pass, partial, retry}
    - Verify analysis includes key concepts, relationships, parroting detection
  
  - [x] 3.3 Write property test for insufficient response detection (REQUIRED FOR MVP)
    - **Property 8: Insufficient Response Detection**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
    - Generate responses with known insufficient patterns (parroting, keyword stuffing, vague acknowledgment)
    - Verify detection and classification as retry with instructional guidance
  
  - [ ]* 3.4 Write unit tests for UnderstandingValidator
    - Test validation timeout handling and fallback behavior
    - Test AI service failure handling with heuristic fallback
    - Test malformed AI response handling
    - Test grade level adaptation (middle school vs high school expectations)
    - Test critical misconception detection
    - _Requirements: 3.6, 6.4, 7.1, 7.2_

- [-] 4. Implement Adaptive Response Generator component
  - [x] 4.1 Create `src/lib/proof-engine/adaptive-response.ts` with AdaptiveResponseGenerator class
    - Implement `generateResponse()` main routing method
    - Implement `generatePassResponse()` with celebration and progress display
    - Implement `generatePartialResponse()` with targeted hints
    - Implement `generateRetryResponse()` with reteaching using different pedagogical approach
    - Add conversational transition logic for natural flow
    - Add encouragement and supportive language patterns
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.1, 10.2, 10.3, 11.1_
  
  - [ ]* 4.2 Write property test for adaptive response routing
    - **Property 5: Adaptive Response Routing**
    - **Validates: Requirements 4.1, 4.2, 4.3, 10.2, 10.3**
    - Generate random validation results (pass/partial/retry)
    - Verify routing to correct response type
    - Verify pass triggers advancement, retry triggers reteaching, partial triggers hints
  
  - [ ]* 4.3 Write unit tests for AdaptiveResponseGenerator
    - Test pass response includes progress count
    - Test retry response uses different approach than original teaching
    - Test partial response provides targeted hints
    - Test conversational transitions maintain flow
    - Test supportive language in all response types
    - _Requirements: 4.4, 10.1, 10.2, 10.3, 11.1_

- [-] 5. Implement teaching exchange classification logic
  - [x] 5.1 Create `src/lib/proof-engine/exchange-classifier.ts` with classification functions
    - Implement `isTeachingExchange()` function with metadata checks (primary classifier)
    - Implement deterministic rules-based classifier (checks for concept keywords, explanation patterns, example structures)
    - Implement `classifyAsTeaching()` AI-powered fallback (only called when rules-based classifier is uncertain)
    - Add hard cap: AI classifier must not be called more than once per assistant response
    - Add feature flag for AI classifier (default: rules-based only)
    - Add logic to exclude checkpoint prompts, validation feedback, celebration messages, logistics
    - Add logic to include concept explanations, worked examples, structured hints
    - _Requirements: 1.1, 1.6_
  
  - [ ]* 5.2 Write unit tests for exchange classification
    - Test teaching exchange detection (concept explanations, examples, hints)
    - Test non-teaching exchange detection (checkpoints, feedback, celebrations, logistics)
    - Test metadata-based exclusions
    - Test rules-based classifier accuracy
    - Test AI classifier fallback behavior
    - Test hard cap enforcement (max 1 AI call per response)
    - _Requirements: 1.1, 1.6_

- [-] 6. Implement checkpoint frequency calculation logic
  - [x] 6.1 Create `src/lib/proof-engine/checkpoint-frequency.ts` with frequency functions
    - Implement `calculateNextCheckpointTarget()` function with adaptive logic (2-3 for confident, 4-5 for struggling, 3-4 for mixed)
    - Implement `shouldTriggerCheckpoint()` function with boundary checks (introductory phase, already in checkpoint mode, count vs target)
    - Implement `updateCheckpointTarget()` function to recalculate after validation
    - Add random integer utility for frequency ranges
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.7_
  
  - [x] 6.2 Write property test for adaptive checkpoint frequency (REQUIRED FOR MVP)
    - **Property 2: Adaptive Checkpoint Frequency**
    - **Validates: Requirements 1.2, 1.3, 1.4**
    - Generate random validation histories
    - Verify frequency calculations: 2-3 after two passes, 4-5 after retry, 3-4 for mixed
  
  - [x] 6.3 Write property test for teaching exchange counter state machine (REQUIRED FOR MVP)
    - **Property 1: Teaching Exchange Counter State Machine**
    - **Validates: Requirements 1.1, 1.5, 1.6**
    - Generate random sequences of teaching exchanges, checkpoints, failed attempts
    - Verify counter increments on teaching, resets on checkpoint, unchanged during reteaching
  
  - [ ]* 6.4 Write unit tests for checkpoint frequency
    - Test introductory phase boundary (< 2 exchanges)
    - Test checkpoint mode boundary (don't trigger if already in checkpoint)
    - Test first proof attempt initialization
    - Test maximum validation history (only last 3 considered)
    - _Requirements: 1.7_

- [-] 7. Implement explain-back prompt generation
  - [x] 7.1 Create `src/lib/proof-engine/prompt-generator.ts` with prompt generation functions
    - Implement `generateExplainBackPrompt()` function with AI-powered generation
    - Add logic to reference specific concepts from last 3-4 exchanges
    - Add grade-level language adaptation
    - Add explicit "in your own words" phrasing
    - Add validation to ensure open-ended questions (not yes/no)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.3_
  
  - [ ]* 7.2 Write property test for explain-back prompt quality
    - **Property 3: Explain-Back Prompt Quality**
    - **Validates: Requirements 2.1, 2.2, 2.4, 2.5**
    - Generate random teaching contexts and grade levels
    - Verify prompts are open-ended (not yes/no)
    - Verify prompts reference specific concepts from last 3-4 exchanges
    - Verify prompts explicitly request explanation in own words
  
  - [ ]* 7.3 Write unit tests for prompt generation
    - Test grade-level language adaptation (middle school vs high school)
    - Test concept extraction from teaching context
    - Test open-ended question validation
    - Test "in your own words" phrasing inclusion
    - _Requirements: 2.3, 7.3_

- [-] 8. Implement Proof Engine Middleware core
  - [x] 8.1 Create `src/lib/proof-engine/middleware.ts` with ProofEngineMiddleware class
    - Implement `processMessage()` main entry point
    - Implement conversation state management (load, update, persist)
    - Implement `handleTeachingMode()` method with exchange counting and checkpoint triggering
    - Implement `handleCheckpointMode()` method with validation and adaptive response
    - Add state initialization for new conversations
    - Add grade level retrieval from user profile
    - Add concept tracking for session progress
    - _Requirements: 1.1, 1.5, 7.4, 11.1_
  
  - [ ]* 8.2 Write property test for grade level retrieval
    - **Property 9: Grade Level Retrieval**
    - **Validates: Requirements 7.4**
    - Generate random validation requests
    - Verify grade level retrieved from user profile before validation
  
  - [ ]* 8.3 Write unit tests for ProofEngineMiddleware
    - Test conversation state initialization
    - Test state persistence to chat metadata
    - Test invalid grade level handling (default to grade 8)
    - Test concurrent checkpoint trigger handling (race condition)
    - _Requirements: 7.4_

- [x] 9. Checkpoint - Ensure all core components pass tests
  - Run all unit tests and property tests
  - Verify database schema is correctly applied
  - Verify all components integrate correctly
  - Ask the user if questions arise

- [-] 10. Integrate Proof Engine with Chat API
  - [x] 10.1 Modify chat API route to use ProofEngineMiddleware
    - Add ProofEngineMiddleware initialization in chat route handler
    - Add conversation state loading from chat metadata
    - Add message processing through middleware before AI tutor call
    - Add checkpoint mode detection and routing
    - Add proof event logging after validation
    - Update message metadata with proof-related flags (isTeachingExchange, isProofCheckpoint, isProofAttempt, isValidationFeedback, isCelebration)
    - Ensure checkpoint triggers only at concept boundaries (after teaching points complete, never mid-concept)
    - _Requirements: 1.1, 4.5, 5.3, 10.4, 10.5_
  
  - [ ]* 10.2 Write property test for pass event logging
    - **Property 6: Pass Event Logging**
    - **Validates: Requirements 4.5**
    - Generate random proof attempts classified as pass
    - Verify proof event logged to database with achievement recorded
  
  - [ ]* 10.3 Write property test for checkpoint timing boundary respect
    - **Property 13: Checkpoint Timing Boundary Respect**
    - **Validates: Requirements 10.4, 10.5**
    - Generate random teaching sequences
    - Verify checkpoints only trigger at concept boundaries
    - Verify no interruption mid-concept
  
  - [x] 10.4 Write integration test for end-to-end checkpoint flow (REQUIRED FOR MVP)
    - Test end-to-end: teaching → checkpoint trigger → prompt generation → validation → adaptive response → logging
    - Test teaching mode to checkpoint mode transition
    - Test checkpoint mode to teaching mode transition
    - Test reteaching after failed attempt
    - _Requirements: 1.1, 1.5, 4.1, 4.2, 4.3, 5.1_

- [x] 11. Implement passive proof features (A, B, C)
  - [x] 11.1 Feature A: Diagnostic Feedback (COMPLETE)
    - Added optional `diagnosticHint?: string` field to ValidationResult type
    - Created `generateDiagnosticHint()` method in validator with deterministic templates
    - Updated retry response generator to include diagnostic hint when present
    - ONE sentence only, explains what's missing (not what's wrong)
    - Never stored, never shown to parents
    - _Requirements: Passive Features A_
  
  - [x] 11.2 Feature B: Learning Receipts (COMPLETE)
    - Created API route: `src/app/api/proof/history/route.ts`
    - Created page component: `src/app/(app)/proof-history/page.tsx`
    - Added navigation link in sidebar (quiet, not prominent)
    - Read-only list view of proof events with concept, date, retries, method
    - No badges, celebrations, animations, or encouragement
    - _Requirements: Passive Features B_
  
  - [x] 11.3 Feature C: Parent Actionables (COMPLETE)
    - Created API route: `src/app/api/parent/weekly-summary/route.ts`
    - Created WeeklySummary component in parent dashboard
    - Updated parent dashboard to use WeeklySummary component
    - Passive weekly summary with neutral observations
    - Max 3 insights, dismissible, no urgency
    - _Requirements: Passive Features C_

- [ ] 12. Implement milestone notification system
  - [ ] 12.1 Create milestone detection and notification logic
    - Add milestone threshold detection (e.g., 5 concepts proven)
    - Create notification trigger function
    - Add notification persistence to database
    - Add parent notification display in dashboard
    - _Requirements: 8.3_
  
  - [ ]* 12.2 Write property test for milestone notification trigger
    - **Property 10: Milestone Notification Trigger**
    - **Validates: Requirements 8.3**
    - Generate random proof sequences
    - Verify milestone detection at thresholds (5, 10, 20 concepts)
    - Verify parent notification triggered
  
  - [ ]* 12.3 Write unit tests for milestone notifications
    - Test threshold detection accuracy
    - Test notification persistence
    - Test notification display in dashboard
    - _Requirements: 8.3_

- [ ] 13. Implement learning receipt proof summary
  - [ ] 13.1 Add proof summary section to learning receipt generation
    - Modify learning receipt generator to include proof events section
    - Add list of concepts proven with timestamps and results
    - Add summary statistics (total attempts, pass rate)
    - Add empty state handling (no concepts proven message)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ]* 13.2 Write property test for learning receipt content completeness
    - **Property 12: Learning Receipt Content Completeness**
    - **Validates: Requirements 9.1, 9.2, 9.4**
    - Generate random tutoring sessions
    - Verify receipt includes concepts proven list with timestamps and results
    - Verify receipt includes summary statistics (total attempts, pass rate)
  
  - [ ]* 13.3 Write unit tests for learning receipt
    - Test empty session handling (no concepts proven)
    - Test mixed results display (pass/partial/retry)
    - Test summary statistics calculation
    - _Requirements: 9.3_

- [ ] 14. Implement session progress display
  - [ ] 14.1 Add progress display to adaptive responses
    - Modify pass response generation to include concepts proven count
    - Add topic completion detection logic
    - Add topic completion acknowledgment to responses
    - Ensure progress display is reassuring, not pressure-inducing
    - _Requirements: 11.1, 11.2, 11.4, 11.5_
  
  - [ ]* 14.2 Write property test for session progress display
    - **Property 14: Session Progress Display**
    - **Validates: Requirements 11.1**
    - Generate random pass events
    - Verify response displays concepts proven count
  
  - [ ]* 14.3 Write property test for topic completion acknowledgment
    - **Property 15: Topic Completion Acknowledgment**
    - **Validates: Requirements 11.2**
    - Generate random topic completions
    - Verify acknowledgment that topic is solid
  
  - [ ]* 14.4 Write unit tests for progress display
    - Test progress count accuracy
    - Test topic completion detection
    - Test reassuring tone (not pressure-inducing)
    - _Requirements: 11.4, 11.5_

- [ ] 15. Final checkpoint - Comprehensive testing and integration verification
  - Run all unit tests and property tests (minimum 100 iterations per property test)
  - Run integration tests for end-to-end flows
  - Verify all 15 correctness properties pass
  - Test error handling scenarios (validation timeout, AI failure, database failure)
  - Verify parent dashboard displays proof events correctly
  - Verify learning receipts include proof summaries
  - Test with real student responses across grade levels (manual acceptance testing)
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- **REQUIRED FOR MVP (not optional)**: Property tests 1, 2, 7, 8 and integration test 10.4 provide critical safety coverage
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate end-to-end flows across components
- All property tests should run minimum 100 iterations
- Property test tags follow format: **Feature: proof-engine, Property {N}: {property_text}**
- Database schema includes privacy boundary: full responses stored for analysis, excerpts for parent display
- Database uses unique constraint (chat_id, response_hash) for idempotency and deduplication
- AI validator outputs use strict zod schemas with fallback handling for malformed responses
- Teaching exchange classification uses deterministic rules-based approach with optional AI fallback (feature-flagged)
- Error handling includes timeouts, AI failures, database failures, and malformed responses
- Grade level adaptation affects validation depth and prompt complexity
- Adaptive frequency adjusts checkpoint intervals based on student performance
- Conversation state persists to chat metadata for session continuity
- Checkpoint triggers respect concept boundaries (Requirements 10.4, 10.5) to avoid mid-concept interruption

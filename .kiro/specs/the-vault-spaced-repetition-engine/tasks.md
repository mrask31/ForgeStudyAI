# Implementation Plan: The Vault Spaced-Repetition Engine

## Overview

The Vault is a spaced-repetition memory retention system that implements the SuperMemo-2 (SM-2) algorithm to prevent knowledge decay. This implementation plan breaks down the feature into discrete coding tasks, organized by architectural layer. The system uses TypeScript/Next.js for the application layer, Supabase for data persistence, and Gemini 1.5 Flash for AI-powered active recall testing.

Key architectural components:
- Database migrations for SRS tracking columns and vault_sessions table
- Pure function SM-2 calculator utility (no side effects)
- Gemini Flash interrogator client with structured JSON output
- API endpoints for lazy evaluation, queue management, session handling, and review submission
- React components for Vault workspace, SmartCTA integration, and ConceptGalaxy updates
- Physics-based snap-back animations for visual feedback

## Tasks

- [x] 1. Database schema setup
  - [x] 1.1 Create SRS columns migration for study_topics table
    - Add columns: srs_interval_days (INTEGER), srs_ease_factor (NUMERIC), next_review_date (TIMESTAMPTZ), srs_reviews_completed (INTEGER)
    - Create partial index idx_study_topics_review_date on next_review_date WHERE orbit_state = 2
    - Update orbit_state constraint to allow values 0-3 (add Ghost Node state)
    - Add column comments for documentation
    - File: `supabase_vault_srs_migration.sql`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 1.2 Create vault_sessions table migration
    - Create table with columns: id, user_id, profile_id, topic_ids (UUID[]), batch_size, status, current_topic_index, topics_passed, topics_failed, transcript (JSONB), created_at, completed_at
    - Add constraints: valid_status CHECK, valid_batch_size CHECK, completion_requires_timestamp CHECK
    - Create indexes: idx_vault_sessions_user_created, idx_vault_sessions_status
    - Enable RLS with policy "Users can only access their own vault sessions"
    - File: `supabase_vault_sessions_migration.sql`
    - _Requirements: 9.1_

- [x] 2. SM-2 calculator utility (pure function)
  - [x] 2.1 Implement SM-2 calculation logic
    - Create TypeScript interfaces: SM2Input, SM2Output
    - Implement calculateNextReview() function with pass/fail logic
    - Pass case: interval growth (3 days → 6 days → exponential), ease factor +0.1
    - Fail case: interval reset to 1 day, ease factor -0.2 with floor at 1.3
    - Implement initializeSRS() helper function
    - File: `src/lib/vault/sm2-calculator.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 2.2 Write unit tests for SM-2 calculator
    - Test first review sets interval to 3 days
    - Test ease factor floor enforcement at 1.3
    - Test failing always sets interval to 1 day
    - Test repeated failures don't break floor constraint
    - File: `src/lib/vault/__tests__/sm2-calculator.test.ts`
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_
  
  - [x]* 2.3 Write property-based tests for SM-2 algorithm
    - **Property 1: Ease factor floor is enforced**
    - **Validates: Requirements 7.3**
    - **Property 2: Passing increases interval after warmup**
    - **Validates: Requirements 6.1**
    - **Property 3: Failing always sets interval to 1**
    - **Validates: Requirements 7.1**
    - **Property 4: Next review date is always in the future**
    - **Validates: Requirements 6.3, 7.4**
    - Use fast-check library for property-based testing
    - File: `src/lib/vault/__tests__/sm2-properties.test.ts`
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4_

- [x] 3. Gemini Flash interrogator client
  - [x] 3.1 Create Zod schemas for Flash responses
    - Define FlashQuestionSchema with question and context_reference fields
    - Define FlashEvaluationSchema with passed_recall and brief_feedback fields
    - Export type inference helpers and parse functions
    - File: `src/lib/vault/flash-schemas.ts`
    - _Requirements: 5.6_
  
  - [x] 3.2 Implement Flash prompt builders
    - Create buildFlashInterrogatorPrompt() function
    - Include topic title, proof events context, and strict output format instructions
    - Create buildFlashEvaluatorPrompt() function
    - Include question, student answer, evaluation criteria, and JSON output format
    - File: `src/lib/vault/flash-prompt.ts`
    - _Requirements: 5.3, 5.4, 5.5_
  
  - [x] 3.3 Implement FlashInterrogatorClient class
    - Initialize Gemini 1.5 Flash model with config: temperature=0.3, maxOutputTokens=512, responseMimeType='application/json'
    - Implement generateQuestion() method with proof events retrieval
    - Implement evaluateAnswer() method with Zod validation
    - Add error handling for JSON parse errors, rate limits, and timeouts
    - File: `src/lib/vault/flash-client.ts`
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 10.1, 10.2_
  
  - [ ]* 3.4 Write unit tests for Flash prompt builders
    - Test prompt includes topic title
    - Test prompt includes proof events context
    - Test prompt enforces JSON output format
    - File: `src/lib/vault/__tests__/flash-prompt.test.ts`
    - _Requirements: 5.3, 5.4_

- [x] 4. API endpoints
  - [x] 4.1 Implement POST /api/vault/lazy-eval endpoint
    - Verify user owns the profile (RLS enforcement)
    - Execute UPDATE query: set orbit_state=3 WHERE orbit_state=2 AND next_review_date <= NOW()
    - Return updatedCount and ghostNodes array
    - Add error handling for unauthorized access and database errors
    - File: `src/app/api/vault/lazy-eval/route.ts`
    - _Requirements: 2.1, 2.3_
  
  - [x] 4.2 Implement GET /api/vault/queue endpoint
    - Get authenticated user and current profile
    - Query study_topics WHERE orbit_state=3, ORDER BY next_review_date ASC, LIMIT 5
    - Calculate days_overdue for each Ghost Node
    - Return ghost_nodes array, total_count, and estimated_time_minutes (fixed at 3)
    - File: `src/app/api/vault/queue/route.ts`
    - _Requirements: 2.2, 4.1, 4.3, 4.4, 4.5_
  
  - [x] 4.3 Implement POST /api/vault/session endpoint
    - Validate topicIds array (1-5 topics)
    - Create vault_sessions record with status='IN_PROGRESS'
    - Fetch first topic and proof_events (ORDER BY timestamp DESC, LIMIT 5)
    - Generate first question using FlashInterrogatorClient
    - Return session metadata and first_question
    - File: `src/app/api/vault/session/route.ts`
    - _Requirements: 5.3, 5.4_
  
  - [x] 4.4 Implement POST /api/vault/review endpoint
    - Fetch session and verify ownership
    - Fetch topic and proof_events for context
    - Evaluate answer using FlashInterrogatorClient
    - Calculate new SRS state using calculateNextReview()
    - Update study_topics: srs_interval_days, srs_ease_factor, next_review_date, srs_reviews_completed, orbit_state
    - Update vault_sessions: transcript, topics_passed/failed, current_topic_index, status, completed_at
    - Generate next question if session not complete
    - Return passed, brief_feedback, next_question (if any), session_complete
    - File: `src/app/api/vault/review/route.ts`
    - _Requirements: 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ]* 4.5 Write integration tests for lazy evaluation API
    - Test downgrades expired mastered topics
    - Test does not downgrade non-expired topics
    - Test RLS enforcement (user isolation)
    - File: `src/app/api/vault/__tests__/lazy-eval.test.ts`
    - _Requirements: 2.1_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 6. VaultWorkspace component (minimal chat interface)
  - [x] 6.1 Create VaultWorkspace page component
    - Implement dynamic route: /vault/[sessionId]/page.tsx
    - Load session and first question on mount
    - Display progress indicator (Question X of Y)
    - Display current question and context reference
    - Implement answer textarea with submit button
    - Show feedback after submission (passed/failed with brief_feedback)
    - Trigger 'vault:snap-back' custom event on passed recall
    - Handle session completion with stats display (topics_passed, topics_failed)
    - Navigate to next question or completion screen
    - File: `src/app/vault/[sessionId]/page.tsx`
    - _Requirements: 5.1, 5.2, 5.3, 8.1_
  
  - [ ]* 6.2 Write end-to-end test for complete Vault session flow
    - Test login and create expired mastered topic
    - Test Ghost Node appears in Galaxy
    - Test click Smart CTA "Review Fading Memories"
    - Test Vault Workspace loads with question
    - Test submit answer and verify feedback
    - Test snap-back animation triggers
    - Test session completion and return to Galaxy
    - File: `tests/vault-session.spec.ts`
    - _Requirements: 2.1, 2.2, 4.1, 5.1, 5.3, 5.6, 8.1_

- [x] 7. ConceptGalaxy updates for Ghost Nodes
  - [x] 7.1 Add lazy evaluation on Galaxy mount
    - Call POST /api/vault/lazy-eval on component mount
    - Refetch topics if updatedCount > 0
    - File: `src/components/galaxy/ConceptGalaxy.tsx`
    - _Requirements: 2.1, 2.3_
  
  - [x] 7.2 Add snap-back event listener
    - Listen for 'vault:snap-back' custom event
    - Add topicId to justRescued ephemeral state array
    - Clear justRescued after 1 second timeout
    - Refetch topics to get updated orbit_state
    - File: `src/components/galaxy/ConceptGalaxy.tsx`
    - _Requirements: 8.1, 8.5_
  
  - [x] 7.3 Update node rendering for Ghost Nodes
    - Extend Node interface with physicsMode and isAnimating fields
    - Map topics to nodes with physicsMode: 'mastered' | 'ghost' | 'snapBack'
    - Implement getNodeColor() function: Silver (#94a3b8) for orbit_state=3, Indigo (#6366f1) for orbit_state=2
    - Implement getNodeOpacity() function: 40% for ghost, 100% for mastered/snapBack
    - Update nodeCanvasObject to render with opacity and color transitions
    - File: `src/components/galaxy/ConceptGalaxy.tsx`
    - _Requirements: 3.1, 3.2, 3.4, 8.2, 8.3_
  
  - [x] 7.4 Implement physics mode switching
    - Define PHYSICS_PRESETS: mastered (radialStrength=0.5), ghost (radialStrength=-0.3), snapBack (radialStrength=2.0)
    - Apply dynamic radial force based on node.physicsMode
    - Apply dynamic charge force and link distance
    - Use requestAnimationFrame for smooth opacity transitions during snap-back
    - File: `src/components/galaxy/ConceptGalaxy.tsx`
    - _Requirements: 3.3, 8.4, 8.5_

- [x] 8. SmartCTA integration
  - [x] 8.1 Add Vault queue fetching to SmartCTA
    - Call POST /api/vault/lazy-eval on mount
    - Call GET /api/vault/queue to fetch Ghost Nodes
    - Store vaultQueue state with ghost_nodes, total_count, estimated_time_minutes
    - File: `src/components/galaxy/SmartCTA.tsx`
    - _Requirements: 2.3, 4.1, 4.2_
  
  - [x] 8.2 Add Vault CTA with highest priority
    - Add Vault CTA option with priority=100 (highest)
    - Display title: "Review Fading Memories"
    - Display description: "{count} concept(s) need review"
    - Display estimated time from vaultQueue.estimated_time_minutes
    - Implement action: POST /api/vault/session with topicIds, then navigate to /vault/[sessionId]
    - Only show CTA if vaultQueue.total_count > 0
    - File: `src/components/galaxy/SmartCTA.tsx`
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 9. TypeScript types and interfaces
  - [x] 9.1 Create Vault type definitions
    - Define StudyTopicSRS interface with SRS fields
    - Define VaultSession interface
    - Define VaultTranscriptEntry interface
    - Define GhostNode interface with days_overdue
    - Define VaultQueue interface
    - File: `src/types/vault.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2_

- [x] 10. Error handling and security
  - [x] 10.1 Add error handling to API endpoints
    - Implement consistent error response format: {error: string, code?: string}
    - Add error codes: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, INVALID_INPUT, AI_ERROR, DATABASE_ERROR
    - Handle Gemini Flash errors: rate limits (429), timeouts, JSON parse errors, Zod validation errors
    - Handle Supabase errors: PGRST116 (not found), 23505 (duplicate), generic database errors
    - Files: All API route files
    - _Requirements: 10.2_
  
  - [x] 10.2 Add input sanitization for student answers
    - Create sanitizeStudentAnswer() function
    - Remove excessive whitespace, limit length to 2000 chars, remove control characters
    - Apply sanitization in POST /api/vault/review before evaluation
    - File: `src/lib/vault/sanitize-input.ts`
    - _Requirements: 5.6_
  
  - [x] 10.3 Verify RLS policies are enforced
    - Verify study_topics RLS policy filters by profile ownership
    - Verify vault_sessions RLS policy filters by user_id
    - Add profile ownership check in lazy-eval endpoint
    - Add session ownership check in review endpoint
    - Files: API route files
    - _Requirements: 2.1, 4.1_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Integration and wiring
  - [x] 12.1 Wire all components together
    - Verify lazy evaluation triggers on Galaxy mount
    - Verify SmartCTA displays Vault queue when Ghost Nodes exist
    - Verify clicking Vault CTA creates session and navigates to VaultWorkspace
    - Verify VaultWorkspace submits answers and updates SRS state
    - Verify snap-back animation triggers and completes in 1 second
    - Verify session completion returns to Galaxy with updated node states
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 5.1, 5.2, 5.3, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 12.2 Write integration tests for complete flow
    - Test lazy evaluation → queue fetch → session creation → answer submission → SRS update → snap-back animation
    - Test multiple topics in single session (batch processing)
    - Test session abandonment (incomplete sessions)
    - Test failed recall keeps orbit_state=3
    - Test passed recall restores orbit_state=2
    - _Requirements: 2.1, 2.2, 4.5, 5.3, 5.6, 6.4, 6.5, 7.5, 7.6, 8.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property-based tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The SM-2 calculator is a pure function with no side effects, making it ideal for testing
- Gemini 1.5 Flash is used exclusively for <2s response times and cost optimization
- Maximum 5 nodes per Vault session to prevent cognitive overload
- Ghost Nodes use Silver color (#94a3b8), NOT red/yellow per requirements
- Snap-back animation completes in 1 second with physics-based motion
- All queries are user-scoped with RLS enforcement for security
- Ease factor floor at 1.3 is mathematically enforced in SM-2 calculator

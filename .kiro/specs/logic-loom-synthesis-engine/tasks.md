# Implementation Plan: Logic Loom Synthesis Engine (Sprint 1)

## Overview

Sprint 1 implements the foundational database layer and visual constellation selection interface for the Logic Loom Synthesis Engine. This sprint is strictly limited to Phases 1 & 2 from the design document:

- **Phase 1**: Database tables (topic_edges, loom_sessions) with RLS policies and validation constraints
- **Phase 2**: Visual Lasso feature enabling Shift+Click multi-select of mastered nodes with validation and temporary SVG thread rendering

This sprint does NOT include the Loom Workspace UI, Gemini integration, or Socratic dialogue engine—those are reserved for future sprints.

## Sprint 1 Scope Boundaries

**IN SCOPE:**
- Supabase migrations for topic_edges and loom_sessions tables
- RLS policies enforcing user_id = auth.uid()
- CHECK constraints for array_length and status validation
- Empty API route endpoints (/api/loom/sessions, /api/loom/edges)
- ConceptGalaxy.tsx enhancement for Shift+Click multi-select
- Orbit_state validation (reject nodes with orbit_state < 2)
- Max-node validation (reject 5th node selection)
- Temporary SVG thread rendering between selected nodes
- Bottom dock with "🕸️ Weave Thesis" button
- Toast notifications for validation errors

**OUT OF SCOPE (Future Sprints):**
- Loom Workspace split-screen UI
- Gemini Ultra API integration
- Socratic dialogue engine
- Session initialization logic beyond database setup
- Cryptographic proof generation
- Essay outline board
- Topic edge creation on synthesis completion

## Tasks

- [x] 1. Create database migrations for Logic Loom tables
  - [x] 1.1 Create topic_edges table migration
    - Create table with columns: id (UUID), user_id (UUID), source_topic_id (UUID), target_topic_id (UUID), loom_session_id (UUID), created_at (timestamp)
    - Add CHECK constraint: source_topic_id != target_topic_id (no self-loops)
    - Add UNIQUE constraint: (user_id, source_topic_id, target_topic_id, loom_session_id)
    - Add foreign key references to auth.users and study_topics
    - Create indexes on user_id, source_topic_id, target_topic_id, loom_session_id
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 9.2, 9.4, 17.2, 17.4_

  - [x] 1.2 Create loom_sessions table migration
    - Create table with columns: id (UUID), user_id (UUID), selected_topic_ids (UUID[]), status (TEXT), final_outline (TEXT), transcript (JSONB), cryptographic_proof (TEXT), created_at (timestamp), completed_at (timestamp)
    - Add CHECK constraint: status IN ('SPARRING', 'THESIS_ACHIEVED')
    - Add CHECK constraint: array_length(selected_topic_ids, 1) BETWEEN 2 AND 4
    - Add CHECK constraint: thesis_requires_proof (status consistency with nullable fields)
    - Add foreign key reference to auth.users
    - Create indexes on (user_id, created_at DESC) and status
    - Set default values: status = 'SPARRING', transcript = '[]'::jsonb
    - _Requirements: 2.1, 5.3, 5.4, 9.1, 9.3, 15.1, 15.3, 15.4, 17.1, 17.3_

  - [x] 1.3 Create RLS policies for topic_edges
    - Create policy "Users can only access their own topic edges" for ALL operations
    - Use USING clause: user_id = auth.uid()
    - Use WITH CHECK clause: user_id = auth.uid()
    - Enable RLS on topic_edges table
    - _Requirements: 9.2, 17.2, 17.4, 17.6_

  - [x] 1.4 Create RLS policies for loom_sessions
    - Create policy "Users can only access their own loom sessions" for ALL operations
    - Use USING clause: user_id = auth.uid()
    - Use WITH CHECK clause: user_id = auth.uid()
    - Enable RLS on loom_sessions table
    - _Requirements: 9.1, 9.5, 17.1, 17.3, 17.5_

  - [ ]* 1.5 Write property test for edge count formula
    - **Property 6: Edge Completeness Formula**
    - **Validates: Requirements 7.1, 7.2**
    - Test that for n topics (2-4), exactly n(n-1)/2 edges can be created
    - Generate random topic counts and verify edge count formula

  - [ ]* 1.6 Write unit tests for database constraints
    - Test CHECK constraint rejection for selected_topic_ids with length < 2 or > 4
    - Test CHECK constraint rejection for source_topic_id = target_topic_id
    - Test UNIQUE constraint rejection for duplicate edges
    - Test status transition validation (SPARRING → THESIS_ACHIEVED)
    - _Requirements: 7.3, 7.6, 15.4_

- [x] 2. Create empty API route endpoints
  - [x] 2.1 Create /api/loom/sessions route
    - Create Next.js API route file at app/api/loom/sessions/route.ts
    - Implement GET handler returning empty array (placeholder)
    - Implement POST handler returning 501 Not Implemented with message "Session initialization coming in Sprint 2"
    - Add authentication check using Supabase auth
    - Add TypeScript types for request/response
    - _Requirements: 2.1, 9.3_

  - [x] 2.2 Create /api/loom/edges route
    - Create Next.js API route file at app/api/loom/edges/route.ts
    - Implement GET handler returning empty array (placeholder)
    - Add authentication check using Supabase auth
    - Add TypeScript types for request/response
    - _Requirements: 7.1, 9.2_

  - [ ]* 2.3 Write integration tests for API authentication
    - Test that unauthenticated requests return 401
    - Test that authenticated requests pass through
    - Test RLS enforcement at API layer
    - _Requirements: 9.3, 9.5_

- [x] 3. Checkpoint - Database foundation complete
  - Verify migrations run successfully on local Supabase instance
  - Verify RLS policies prevent cross-user access
  - Verify CHECK constraints reject invalid data
  - Ask the user if questions arise before proceeding to UI implementation

- [x] 4. Enhance ConceptGalaxy component for constellation selection
  - [x] 4.1 Add constellation state management to ConceptGalaxy
    - Add useState hook for selectedConstellation (string[] of topic IDs)
    - Add useState hook for showLoomDock (boolean)
    - Add TypeScript interface for Constellation type
    - Initialize state with empty array
    - _Requirements: 1.1, 1.4_

  - [x] 4.2 Implement Shift+Click detection and validation
    - Modify handleNodeClick to detect event.shiftKey
    - If !shiftKey, maintain existing navigation behavior (route to tutor)
    - If shiftKey, call handleConstellationSelection function
    - Implement orbit_state validation (reject if orbit_state !== 2)
    - Implement max-node validation (reject if constellation.length >= 4 and node not selected)
    - Implement toggle behavior (remove node if already in constellation)
    - Display toast error "Only Mastered stars can be woven." for orbit_state < 2
    - Display toast error "Maximum 4 concepts can be woven together." for 5th node attempt
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 15.1, 15.2, 15.5, 16.1, 16.2_

  - [ ]* 4.3 Write property test for constellation integrity
    - **Property 1: Constellation Integrity**
    - **Validates: Requirements 1.1, 1.2, 15.1, 15.3, 16.1**
    - Test that all nodes in constellation have orbit_state = 2
    - Test that constellation size is always between 0 and 4
    - Generate random node arrays and click sequences

  - [ ]* 4.4 Write property test for constellation toggle idempotence
    - **Property 2: Constellation Toggle Idempotence**
    - **Validates: Requirements 1.4**
    - Test that removing then re-adding a node results in same constellation state
    - Generate random constellations and toggle operations

  - [ ]* 4.5 Write unit tests for Shift+Click validation
    - Test rejection of nodes with orbit_state = 0
    - Test rejection of nodes with orbit_state = 1
    - Test acceptance of nodes with orbit_state = 2
    - Test rejection of 5th node selection
    - Test toggle behavior (select/deselect)
    - Test normal click navigation (no Shift key)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 16.1, 16.2_

- [x] 5. Implement SVG thread rendering between selected nodes
  - [x] 5.1 Create SVG overlay component for constellation threads
    - Create new component ConstellationThreads.tsx
    - Accept props: selectedNodes (Node[]), containerDimensions (width, height)
    - Calculate SVG line coordinates between all node pairs
    - Render SVG <line> elements with stroke color (e.g., stroke="rgb(251, 191, 36)" for amber)
    - Apply stroke-width and opacity for visual effect
    - _Requirements: 1.6_

  - [x] 5.2 Integrate SVG threads into ConceptGalaxy
    - Import ConstellationThreads component
    - Pass selectedConstellation nodes to ConstellationThreads
    - Position SVG overlay to match galaxy canvas coordinates
    - Ensure threads render behind nodes (z-index management)
    - Update threads when constellation changes
    - _Requirements: 1.6_

  - [ ]* 5.3 Write property test for SVG thread count
    - **Property 16: SVG Thread Rendering Completeness**
    - **Validates: Requirements 1.6**
    - Test that for n selected nodes, exactly n(n-1)/2 SVG lines are rendered
    - Generate random constellation sizes (2-4) and verify thread count

  - [ ]* 5.4 Write unit tests for SVG coordinate calculation
    - Test line coordinates for 2-node constellation
    - Test line coordinates for 3-node constellation
    - Test line coordinates for 4-node constellation
    - Test that all node pairs are connected
    - _Requirements: 1.6_

- [x] 6. Implement bottom dock with "Weave Thesis" button
  - [x] 6.1 Create LoomDock component
    - Create new component LoomDock.tsx
    - Accept props: visible (boolean), constellationSize (number), onWeaveClick (callback)
    - Render fixed-position bottom dock with slide-up animation
    - Display "🕸️ Weave Thesis" button
    - Show constellation size indicator (e.g., "2 concepts selected")
    - Apply Tailwind classes for styling (bg-slate-900, border-t, etc.)
    - _Requirements: 1.5_

  - [x] 6.2 Integrate LoomDock into ConceptGalaxy
    - Import LoomDock component
    - Pass showLoomDock state as visible prop
    - Pass selectedConstellation.length as constellationSize
    - Implement onWeaveClick handler (placeholder: console.log for Sprint 1)
    - Update showLoomDock when constellation.length >= 2
    - Hide dock when constellation.length < 2
    - _Requirements: 1.5_

  - [ ]* 6.3 Write property test for dock visibility
    - **Property 15: Constellation Dock Visibility**
    - **Validates: Requirements 1.5**
    - Test that dock is visible if and only if constellation.length >= 2
    - Generate random constellation sizes (0-4) and verify dock visibility

  - [ ]* 6.4 Write unit tests for LoomDock behavior
    - Test dock hidden when constellation.length = 0
    - Test dock hidden when constellation.length = 1
    - Test dock visible when constellation.length = 2
    - Test dock visible when constellation.length = 3
    - Test dock visible when constellation.length = 4
    - Test onWeaveClick callback invoked on button click
    - _Requirements: 1.5_

- [x] 7. Add toast notifications for validation errors
  - [x] 7.1 Install and configure toast library
    - Install react-hot-toast or sonner (if not already installed)
    - Configure toast provider in root layout
    - Set up toast styling to match application theme
    - _Requirements: 1.2, 1.3_

  - [x] 7.2 Integrate toast notifications in ConceptGalaxy
    - Import toast utility
    - Call toast.error("Only Mastered stars can be woven.") for orbit_state < 2
    - Call toast.error("Maximum 4 concepts can be woven together.") for 5th node attempt
    - Ensure toasts appear with appropriate duration and positioning
    - _Requirements: 1.2, 1.3, 15.2, 16.2_

  - [ ]* 7.3 Write unit tests for toast notifications
    - Test toast.error called with correct message for non-mastered node
    - Test toast.error called with correct message for 5th node attempt
    - Test toast.error not called for valid selections
    - _Requirements: 1.2, 1.3_

- [x] 8. Final checkpoint - Sprint 1 complete
  - Verify student can Shift+Click mastered nodes to build constellation
  - Verify system rejects non-mastered nodes with toast
  - Verify system rejects 5th node with toast
  - Verify SVG threads render between all selected node pairs
  - Verify bottom dock slides up with "Weave Thesis" button when 2+ nodes selected
  - Verify database tables and RLS policies are deployed
  - Run all unit tests and property tests
  - Ask the user if questions arise or if ready to proceed to Sprint 2

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and user feedback
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- Sprint 1 focuses exclusively on database foundation and visual selection—no AI integration yet
- The "Weave Thesis" button in Sprint 1 is a placeholder (console.log)—actual session initialization comes in Sprint 2
- All TypeScript code should follow existing project conventions and use strict type checking

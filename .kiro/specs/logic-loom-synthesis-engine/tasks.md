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


---

# Sprint 2: Socratic Engine & Workspace (Phases 3 & 4)

## Overview

Sprint 2 implements the Loom Workspace UI and Gemini 3.1 Ultra integration for Socratic dialogue. This sprint covers:

- **Phase 3**: Split-screen Loom Workspace with locked constellation, outline board, and chat interface
- **Phase 4**: Gemini 3.1 Ultra integration with Socratic Master Prompt, structured output, and context caching

This sprint transforms the constellation selection into a functional synthesis session with AI-powered Socratic dialogue.

## Sprint 2 Scope Boundaries

**IN SCOPE:**
- Session initialization (POST /api/loom/sessions with proof_events query)
- Routing to /loom/[session_id]
- Split-screen workspace UI (locked constellation + outline board + chat)
- Gemini 3.1 Ultra integration with Socratic Master Prompt
- Structured output schema enforcement (SOCRATIC_RESPONSE_SCHEMA)
- Context caching strategy for token cost optimization
- Real-time outline updates with gold pulse animation
- Session state management (SPARRING → THESIS_ACHIEVED)
- Chat input locking on thesis achievement

**OUT OF SCOPE (Future Sprints):**
- Cryptographic proof document export
- Topic edge creation on synthesis completion
- Session history/resume functionality
- Advanced error recovery (e.g., session timeout handling)
- Rate limiting enforcement (defined but not implemented)

## Token Cost Optimization Strategy

**CRITICAL**: Gemini 3.1 Ultra pricing makes naive context injection unsustainable. We implement a two-tier caching strategy:

1. **Gemini Prompt Caching** (Primary Strategy):
   - Use Gemini API's native prompt caching feature
   - Cache the Socratic Master Prompt + proof_events context as a single cached block
   - First turn: Full input token cost (~2000-5000 tokens depending on proof_events)
   - Subsequent turns: 90% discount on cached tokens (only pay for new student messages)
   - Cache TTL: 5 minutes (sufficient for typical synthesis session)
   - Implementation: Use `cachedContent` parameter in Gemini API

2. **Rolling Context Window** (Fallback/Supplement):
   - If session exceeds 50 turns (per design constraint), truncate transcript
   - Keep only last 20 turns + crystallized threads in context
   - Preserve all crystallized_threads (these are the synthesis artifacts)
   - Drop older student/AI exchanges to prevent token bloat

**Expected Cost Reduction**: 60-70% token cost savings after first turn, as specified in design document.

## Tasks

- [x] 9. Implement session initialization (The Bridge)
  - [x] 9.1 Wire up "Weave Thesis" button in ConceptGalaxy
    - Remove placeholder console.log from handleWeaveThesis
    - Implement POST request to /api/loom/sessions with selectedConstellation
    - Show loading state on button during API call
    - Handle success: Navigate to /loom/[session_id]
    - Handle error: Display toast with error message
    - _Requirements: 2.1, 2.4_

  - [x] 9.2 Implement POST /api/loom/sessions endpoint
    - Parse request body: { topicIds: string[] }
    - Validate topicIds array length (2-4) and orbit_state = 2 for all topics
    - Query proof_events table for historical learning transcripts (limit 10 most recent per topic)
    - Create loom_sessions record with user_id, selected_topic_ids, status='SPARRING', transcript='[]'
    - Return session object: { id, selectedTopicIds, status, createdAt }
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 10.5, 16.3_

  - [x] 9.3 Create /loom/[session_id]/page.tsx route
    - Create dynamic route at app/(app)/loom/[session_id]/page.tsx
    - Fetch session data from /api/loom/sessions/[id]
    - Verify session belongs to authenticated user (403 if not)
    - Pass session data to LoomWorkspace component
    - Handle loading and error states
    - _Requirements: 2.4, 9.5_

  - [ ]* 9.4 Write integration tests for session initialization
    - Test POST /api/loom/sessions with valid constellation
    - Test rejection of invalid constellation (wrong size, non-mastered topics)
    - Test proof_events query returns correct data
    - Test session creation and database record
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 16.3_

- [x] 10. Build Loom Workspace UI (The Arena)
  - [x] 10.1 Create LoomWorkspace component
    - Create component at components/loom/LoomWorkspace.tsx
    - Accept props: session (LoomSession), topics (Topic[])
    - Implement split-screen layout: 40% left panel, 60% right panel
    - Apply dark academia styling (bg-slate-950, border-slate-800)
    - Make layout responsive (stack vertically on mobile)
    - _Requirements: 8.1_

  - [x] 10.2 Create LockedConstellation component
    - Create component at components/loom/LockedConstellation.tsx
    - Accept props: topics (Topic[]), selectedTopicIds (string[])
    - Render static constellation using react-force-graph-2d (no interactions)
    - Show constellation threads between all selected nodes
    - Apply same visual styling as ConceptGalaxy (amber threads, node colors)
    - Disable zoom, pan, and drag interactions
    - _Requirements: 8.2_

  - [x] 10.3 Create OutlineBoard component
    - Create component at components/loom/OutlineBoard.tsx
    - Accept props: crystallizedThreads (string[])
    - Render ordered list with Roman numerals (I, II, III, IV, V, VI)
    - Apply gold pulse animation when new thread is added (bg-amber-500/20)
    - Show empty state: "Your synthesis outline will appear here as you discover connections"
    - Style with dark academia theme (slate-900 background, amber accents)
    - _Requirements: 4.3, 4.4, 8.3_

  - [x] 10.4 Create SocraticChat component
    - Create component at components/loom/SocraticChat.tsx
    - Accept props: transcript (Message[]), onSendMessage (callback), isLocked (boolean)
    - Render chat messages with alternating student/AI styling
    - Implement chat input with send button
    - Disable input when isLocked = true
    - Auto-scroll to bottom on new messages
    - Show typing indicator during AI response
    - _Requirements: 8.4, 8.5, 8.6_

  - [x] 10.5 Integrate components into LoomWorkspace
    - Left panel: LockedConstellation (top) + OutlineBoard (bottom)
    - Right panel: SocraticChat (full height)
    - Pass session state to child components
    - Handle state updates from chat interactions
    - Implement session state management (useState for transcript, outline, status)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 10.6 Write unit tests for workspace components
    - Test LockedConstellation renders correctly with selected topics
    - Test OutlineBoard displays crystallized threads with Roman numerals
    - Test SocraticChat renders transcript and handles input
    - Test chat input disabled when isLocked = true
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 11. Implement Gemini 3.1 Ultra integration (The Brain)
  - [ ] 11.1 Create /api/loom/spar endpoint
    - Create Next.js API route at app/api/loom/spar/route.ts
    - Accept POST request: { sessionId: string, message: string }
    - Verify session belongs to authenticated user
    - Fetch session from database (transcript, selected_topic_ids, status)
    - Validate status = 'SPARRING' (reject if THESIS_ACHIEVED)
    - Call Gemini 3.1 Ultra with Socratic Master Prompt
    - Parse structured output (SOCRATIC_RESPONSE_SCHEMA)
    - Update session transcript with student message + AI response
    - Return AI response to client
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.1, 5.2, 12.5_

  - [ ] 11.2 Implement Socratic Master Prompt
    - Create prompt template at lib/loom/socratic-prompt.ts
    - Inject proof_events context for each selected topic
    - Enforce Socratic constraints: no direct answers, no thesis writing
    - Include instructions for crystallized_thread generation
    - Include instructions for thesis validation and loom_status transition
    - Format as system message for Gemini API
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 11.3 Implement Gemini API client with context caching
    - Create client at lib/loom/gemini-client.ts
    - Initialize GoogleGenerativeAI with API key
    - Implement prompt caching using cachedContent parameter
    - Cache Socratic Master Prompt + proof_events (first turn)
    - Reuse cached content for subsequent turns (90% token discount)
    - Set temperature: 0.3 for consistent Socratic behavior
    - Set responseMimeType: 'application/json' for structured output
    - _Requirements: 3.6, 10.6, 13.4_

  - [ ] 11.4 Define SOCRATIC_RESPONSE_SCHEMA with Zod
    - Create schema at lib/loom/schemas.ts
    - Define schema: { socratic_response: string, loom_status: 'SPARRING' | 'THESIS_ACHIEVED', crystallized_thread?: string, cryptographic_proof?: string }
    - Use Zod for runtime validation
    - Convert Zod schema to JSON Schema for Gemini responseSchema parameter
    - Handle validation errors gracefully (retry with fallback)
    - _Requirements: 3.6, 4.2, 6.1, 6.2, 6.3, 12.5_

  - [ ] 11.5 Implement input sanitization
    - Create sanitization utility at lib/loom/sanitize-input.ts
    - Strip markdown code blocks from student messages
    - Remove HTML tags
    - Limit input length to 2000 characters
    - Remove system instruction markers (e.g., "[SYSTEM]")
    - Apply sanitization before sending to Gemini API
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]* 11.6 Write integration tests for Gemini integration
    - Test /api/loom/spar with valid student message
    - Test structured output parsing and validation
    - Test input sanitization removes malicious content
    - Test context caching reduces token costs
    - Mock Gemini API responses for deterministic testing
    - _Requirements: 3.6, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 12. Implement real-time state updates (The Dopamine Loop)
  - [ ] 12.1 Wire up chat message submission
    - In SocraticChat component, implement onSendMessage handler
    - POST student message to /api/loom/spar
    - Optimistically add student message to transcript
    - Show typing indicator during API call
    - Handle AI response: Add to transcript, extract crystallized_thread
    - Handle errors: Display toast, remove optimistic message
    - _Requirements: 5.1, 5.2, 11.3_

  - [ ] 12.2 Implement crystallized thread animation
    - When AI response contains crystallized_thread, append to outline
    - Trigger gold pulse animation (bg-amber-500/20) on new thread
    - Use CSS animation with 1s duration
    - Ensure animation is GPU-accelerated (transform/opacity only)
    - _Requirements: 4.4, 13.3_

  - [ ] 12.3 Implement thesis achievement handling
    - When AI response has loom_status = 'THESIS_ACHIEVED', update session state
    - Lock chat input (disable textarea and send button)
    - Trigger SVG flare animation on constellation
    - Update database: Set status, final_outline, cryptographic_proof, completed_at
    - Show success toast: "Synthesis complete! Your thesis has been crystallized."
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 12.4 Implement session state persistence
    - After each AI response, update loom_sessions.transcript in database
    - Ensure transcript is saved incrementally (not just on completion)
    - Handle concurrent updates gracefully (optimistic locking)
    - Implement auto-save indicator in UI
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 12.5 Write property tests for state transitions
    - **Property 5: Transcript Role Assignment**
    - **Validates: Requirements 5.1, 5.2**
    - Test that messages alternate between 'student' and 'ai' roles
    - Generate random message sequences and verify role assignment

    - **Property 14: UI State Consistency with Session Status**
    - **Validates: Requirements 6.5, 6.6, 8.5, 8.6**
    - Test that chat input is enabled when status = 'SPARRING'
    - Test that chat input is disabled when status = 'THESIS_ACHIEVED'

- [ ] 13. Error handling and edge cases
  - [ ] 13.1 Implement Gemini API error handling
    - Handle rate limit errors (429): Show retry button with exponential backoff
    - Handle timeout errors: Save transcript state, show retry button
    - Handle malformed JSON: Automatically retry up to 3 times
    - Handle validation errors: Log error, show user-friendly message
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ] 13.2 Implement session access control
    - Verify session belongs to authenticated user before loading workspace
    - Return 403 Forbidden if user tries to access another user's session
    - Verify all selected topics belong to authenticated user
    - _Requirements: 9.3, 9.4, 9.5_

  - [ ] 13.3 Implement session termination
    - Auto-terminate session after 50 sparring turns (per design constraint)
    - Show warning at 45 turns: "Approaching synthesis limit. Aim for your thesis!"
    - On termination: Set status to 'THESIS_ACHIEVED' with partial outline
    - _Requirements: 10.4_

  - [ ]* 13.4 Write integration tests for error scenarios
    - Test Gemini API failure handling
    - Test session access control (403 for unauthorized access)
    - Test session termination at 50 turns
    - Test malformed AI response handling
    - _Requirements: 9.5, 10.4, 11.1, 11.2, 11.3_

- [ ] 14. Final checkpoint - Sprint 2 complete
  - Verify "Weave Thesis" button creates session and navigates to workspace
  - Verify split-screen UI renders correctly with locked constellation
  - Verify Socratic chat accepts student messages and returns AI responses
  - Verify crystallized threads appear in outline with gold pulse animation
  - Verify chat input locks when thesis is achieved
  - Verify context caching reduces token costs (check API logs)
  - Verify input sanitization prevents prompt injection
  - Run all unit tests and integration tests
  - Ask the user if questions arise or if ready to proceed to Sprint 3

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Context caching is CRITICAL for cost control - must be implemented in 11.3
- Gemini 3.1 Ultra temperature set to 0.3 for consistent Socratic behavior
- All database updates must respect RLS policies (user_id = auth.uid())
- Transcript must be saved incrementally, not just on completion
- Session termination at 50 turns is a hard limit (design constraint)
- Cryptographic proof generation is deferred to Sprint 3 (polish sprint)
- Topic edge creation is deferred to Sprint 3 (polish sprint)

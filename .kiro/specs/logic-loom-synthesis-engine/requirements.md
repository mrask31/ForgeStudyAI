# Requirements Document: Logic Loom Synthesis Engine

## Introduction

The Logic Loom Synthesis Engine is a cognitive synthesis system that transforms passive concept mastery into active intellectual synthesis for high school students (Grades 9-12). Students visually select 2-4 mastered concepts from their Galaxy UI and engage in Socratic dialogue with AI to discover original connections between ideas. The system enforces positive cognitive friction by refusing to provide answers, instead forcing students to articulate connections through strategic questioning. Each successful synthesis is crystallized into an essay outline with cryptographic proof of original thought.

This system addresses the critical gap between knowledge acquisition and higher-order thinking by creating neurochemically-optimized learning experiences that make challenging synthesis work feel engaging rather than overwhelming.

## Glossary

- **Constellation**: A collection of 2-4 mastered concepts selected by a student for synthesis
- **Mastered_Concept**: A study topic with orbit_state = 2, indicating proven understanding through historical proof_events
- **Loom_Session**: A synthesis session where a student engages in Socratic dialogue to connect concepts
- **Crystallized_Thread**: A one-sentence academic summary of a micro-connection between concepts
- **Socratic_Engine**: The AI system that enforces question-based dialogue without providing direct answers
- **Cryptographic_Proof**: A clinical audit document proving how a student arrived at original synthesis
- **Topic_Edge**: A database record representing a proven connection between two mastered concepts
- **Proof_Events**: Historical learning transcripts that provide context about how a student mastered a concept
- **Galaxy_UI**: The visual interface displaying all study topics as an interactive constellation
- **Synthesis_Thesis**: The final articulation of how all selected concepts interconnect
- **System**: The Logic Loom Synthesis Engine
- **Database**: The Supabase PostgreSQL database storing all session and edge data
- **Student**: The authenticated user engaging with the synthesis engine
- **AI**: The Gemini 3.1 Ultra model configured with Socratic constraints

## Requirements

### Requirement 1: Constellation Selection

**User Story:** As a student, I want to select multiple mastered concepts from my Galaxy UI, so that I can explore connections between ideas I've already learned.

#### Acceptance Criteria

1. WHEN a student Shift+Clicks a node with orbit_state = 2, THEN THE System SHALL add that concept to the active constellation
2. WHEN a student Shift+Clicks a node with orbit_state < 2, THEN THE System SHALL reject the selection and display the message "Only Mastered stars can be woven."
3. WHEN a student attempts to add a fifth concept to a constellation, THEN THE System SHALL reject the selection and display the message "Maximum 4 concepts can be woven together."
4. WHEN a student Shift+Clicks an already-selected concept, THEN THE System SHALL remove that concept from the constellation
5. WHEN a constellation contains at least 2 concepts, THEN THE System SHALL display a bottom dock with a "🕸️ Weave Thesis" button
6. WHEN a constellation contains selected concepts, THEN THE System SHALL render temporary SVG threads connecting all selected nodes
7. WHEN a student clicks a node without holding Shift, THEN THE System SHALL navigate to the tutor interface for that concept

### Requirement 2: Loom Session Initialization

**User Story:** As a student, I want to start a synthesis session with my selected concepts, so that I can begin discovering connections through dialogue.

#### Acceptance Criteria

1. WHEN a student clicks "🕸️ Weave Thesis" with a valid constellation, THEN THE System SHALL create a new loom_sessions record with status = 'SPARRING'
2. WHEN initializing a loom session, THEN THE System SHALL query proof_events for all selected topic IDs to retrieve learning context
3. WHEN a loom session is created, THEN THE System SHALL generate a unique UUID session identifier
4. WHEN a loom session is initialized, THEN THE System SHALL route the student to /loom/[session_id]
5. WHEN loading a loom session, THEN THE System SHALL inject proof_events context into the Gemini system prompt
6. IF any selected topic has orbit_state < 2, THEN THE System SHALL reject session creation and return an error message

### Requirement 3: Socratic Dialogue Enforcement

**User Story:** As a student, I want the AI to guide me with questions rather than give me answers, so that I develop my own synthesis through active thinking.

#### Acceptance Criteria

1. WHEN the AI responds to a student message, THEN THE Socratic_Engine SHALL NOT provide direct answers to synthesis questions
2. WHEN the AI responds to a student message, THEN THE Socratic_Engine SHALL NOT write thesis statements on behalf of the student
3. WHEN a student provides a weak or vague response, THEN THE Socratic_Engine SHALL ask scaffolding questions to deepen thinking
4. WHEN a student articulates a valid micro-connection, THEN THE Socratic_Engine SHALL acknowledge it and push toward the next connection
5. WHEN a student completes a full synthesis, THEN THE Socratic_Engine SHALL validate originality before setting loom_status = 'THESIS_ACHIEVED'
6. WHEN the AI generates a response, THEN THE System SHALL return structured JSON matching the SOCRATIC_RESPONSE_SCHEMA

### Requirement 4: Crystallized Thread Generation

**User Story:** As a student, I want my micro-connections to be captured as outline points, so that I can see my synthesis taking shape in real-time.

#### Acceptance Criteria

1. WHEN a student articulates a valid micro-connection between concepts, THEN THE Socratic_Engine SHALL generate a crystallized_thread
2. WHEN a crystallized_thread is generated, THEN THE System SHALL ensure it is exactly one sentence in academic language
3. WHEN a crystallized_thread is received, THEN THE System SHALL append it to the outline board immediately
4. WHEN a crystallized_thread is appended, THEN THE System SHALL trigger a gold pulse animation (bg-amber-500/20)
5. WHEN a crystallized_thread is created, THEN THE System SHALL save it to the loom_sessions transcript with the AI response
6. WHEN displaying crystallized threads, THEN THE System SHALL show which concept pair was connected

### Requirement 5: Session State Management

**User Story:** As a student, I want my synthesis progress to be saved automatically, so that I can resume if interrupted or review my thinking process later.

#### Acceptance Criteria

1. WHEN a student submits a response, THEN THE System SHALL append it to the loom_sessions transcript with role = 'student'
2. WHEN the AI generates a response, THEN THE System SHALL append it to the loom_sessions transcript with role = 'ai'
3. WHILE a loom session has status = 'SPARRING', THEN THE System SHALL keep final_outline, cryptographic_proof, and completed_at as null
4. WHEN loom_status transitions to 'THESIS_ACHIEVED', THEN THE System SHALL set final_outline, cryptographic_proof, and completed_at to non-null values
5. WHEN saving transcript entries, THEN THE System SHALL ensure timestamps are strictly chronologically ordered
6. WHEN saving transcript entries, THEN THE System SHALL ensure roles alternate between 'student' and 'ai'

### Requirement 6: Thesis Crystallization

**User Story:** As a student, I want my completed synthesis to be validated and locked, so that I have proof of my original thinking.

#### Acceptance Criteria

1. WHEN a student articulates a complete synthesis connecting all selected concepts, THEN THE Socratic_Engine SHALL validate the synthesis for originality
2. WHEN the synthesis is validated, THEN THE System SHALL set loom_status = 'THESIS_ACHIEVED'
3. WHEN loom_status = 'THESIS_ACHIEVED', THEN THE System SHALL generate a cryptographic_proof document
4. WHEN generating cryptographic_proof, THEN THE System SHALL reference specific transcript moments by timestamp or excerpt
5. WHEN loom_status = 'THESIS_ACHIEVED', THEN THE System SHALL lock the chat input to prevent further modifications
6. WHEN loom_status = 'THESIS_ACHIEVED', THEN THE System SHALL display an export button for downloading the proof document
7. WHEN loom_status = 'THESIS_ACHIEVED', THEN THE System SHALL trigger an SVG flare animation on the constellation visualization

### Requirement 7: Topic Edge Creation

**User Story:** As a student, I want my proven connections to be permanently recorded, so that my knowledge graph reflects my synthesis achievements.

#### Acceptance Criteria

1. WHEN loom_status = 'THESIS_ACHIEVED', THEN THE System SHALL create topic_edges for all unique pairs in the constellation
2. WHEN creating topic_edges, THEN THE System SHALL generate exactly n(n-1)/2 edges for n selected concepts
3. WHEN creating a topic_edge, THEN THE System SHALL ensure source_topic_id ≠ target_topic_id
4. WHEN creating topic_edges, THEN THE System SHALL reference the loom_session_id in each edge record
5. WHEN creating topic_edges, THEN THE System SHALL verify both topics have orbit_state = 2
6. IF a topic_edge already exists for a concept pair and session, THEN THE Database SHALL reject the duplicate via unique constraint

### Requirement 8: Loom Workspace UI

**User Story:** As a student, I want a split-screen interface showing my constellation and outline alongside the chat, so that I can see my synthesis progress visually.

#### Acceptance Criteria

1. WHEN a loom session loads, THEN THE System SHALL display a split-screen layout with constellation/outline on the left and chat on the right
2. WHEN displaying the constellation in the workspace, THEN THE System SHALL render it as locked (non-interactive)
3. WHEN the outline board updates, THEN THE System SHALL display crystallized threads as an ordered list with Roman numerals
4. WHEN displaying the chat interface, THEN THE System SHALL show the full transcript with alternating student/AI messages
5. WHEN loom_status = 'SPARRING', THEN THE System SHALL enable the chat input field
6. WHEN loom_status = 'THESIS_ACHIEVED', THEN THE System SHALL disable the chat input field

### Requirement 9: Data Security and Isolation

**User Story:** As a student, I want my synthesis sessions to be completely private, so that other users cannot access my work or proof documents.

#### Acceptance Criteria

1. WHEN querying loom_sessions, THEN THE Database SHALL enforce Row Level Security filtering by user_id = auth.uid()
2. WHEN querying topic_edges, THEN THE Database SHALL enforce Row Level Security filtering by user_id = auth.uid()
3. WHEN creating a loom_sessions record, THEN THE Database SHALL verify user_id matches the authenticated user
4. WHEN creating topic_edges, THEN THE Database SHALL verify all referenced topics belong to the authenticated user
5. WHEN a student attempts to access another user's session_id, THEN THE System SHALL return a 403 Forbidden error
6. WHEN storing cryptographic_proof, THEN THE System SHALL include a SHA-256 hash for verification

### Requirement 10: Rate Limiting and Cost Control

**User Story:** As a system administrator, I want to limit excessive API usage, so that Gemini costs remain sustainable and users don't abuse the system.

#### Acceptance Criteria

1. WHEN a student creates loom sessions, THEN THE System SHALL enforce a limit of 5 new sessions per user per hour
2. WHEN a student reaches 3 sessions in an hour, THEN THE System SHALL log a warning
3. WHEN a student attempts to create a 6th session in an hour, THEN THE System SHALL reject the request with an error message
4. WHEN a loom session exceeds 50 sparring turns, THEN THE System SHALL automatically terminate the session
5. WHEN loading proof_events for session initialization, THEN THE System SHALL limit to the 10 most recent events per topic
6. WHEN calling Gemini API, THEN THE System SHALL use prompt caching to reduce input token costs by 60% after the first turn

### Requirement 11: Error Handling and Recovery

**User Story:** As a student, I want the system to handle errors gracefully, so that I don't lose my synthesis progress if something goes wrong.

#### Acceptance Criteria

1. IF the Gemini API returns an error, THEN THE System SHALL save the current transcript state and display a retry button
2. IF session initialization fails, THEN THE System SHALL return the student to Galaxy UI with constellation selection preserved
3. IF the AI returns malformed JSON, THEN THE System SHALL automatically retry up to 3 times before showing an error
4. IF a database transaction fails during edge creation, THEN THE System SHALL rollback all changes atomically
5. IF a student opens the same session in multiple tabs, THEN THE System SHALL lock one tab and designate the other as active
6. WHEN an error occurs, THEN THE System SHALL log detailed error information for debugging while showing user-friendly messages

### Requirement 12: Input Validation and Sanitization

**User Story:** As a system administrator, I want to prevent prompt injection attacks, so that students cannot manipulate the AI's behavior.

#### Acceptance Criteria

1. WHEN a student submits a message, THEN THE System SHALL strip markdown code blocks from the input
2. WHEN a student submits a message, THEN THE System SHALL remove HTML tags from the input
3. WHEN a student submits a message, THEN THE System SHALL limit input length to 2000 characters
4. WHEN a student submits a message, THEN THE System SHALL remove system-level instruction markers (e.g., "[SYSTEM]")
5. WHEN the AI generates a response, THEN THE System SHALL validate it against the SOCRATIC_RESPONSE_SCHEMA using Zod
6. WHEN structured output parsing fails, THEN THE System SHALL reject the response and retry

### Requirement 13: Performance Optimization

**User Story:** As a student, I want the synthesis interface to feel responsive, so that I stay engaged in the dialogue flow.

#### Acceptance Criteria

1. WHEN loading proof_events for session initialization, THEN THE System SHALL complete the query in under 50ms
2. WHEN appending a crystallized_thread to the outline, THEN THE System SHALL update the UI optimistically before database confirmation
3. WHEN animating the gold pulse effect, THEN THE System SHALL use CSS transforms for GPU acceleration
4. WHEN streaming AI responses, THEN THE System SHALL display tokens incrementally for perceived speed
5. WHEN querying loom_sessions, THEN THE System SHALL use indexed queries on (user_id, created_at DESC)
6. WHEN creating topic_edges, THEN THE System SHALL use a single batch insert operation rather than individual inserts

### Requirement 14: Export and Verification

**User Story:** As a student, I want to export my synthesis proof document, so that I can submit it as evidence of my original thinking.

#### Acceptance Criteria

1. WHEN a student clicks the export button, THEN THE System SHALL generate a proof document containing session_id, topic_titles, final_outline, and cryptographic_proof
2. WHEN generating a proof document, THEN THE System SHALL include a SHA-256 hash of the document content
3. WHEN generating a proof document, THEN THE System SHALL include the completion timestamp
4. WHEN generating a proof document, THEN THE System SHALL include a hashed user_id for privacy
5. WHEN exporting a proof document, THEN THE System SHALL format it as a downloadable text file
6. WHERE a verification endpoint exists, THEN THE System SHALL allow proof document validation via /api/loom/verify?proofHash=...

### Requirement 15: Critical Product Constraints - Maximum Nodes (The "Overload" Constraint)

**User Story:** As a system designer, I want to enforce a strict 4-node maximum per constellation, so that context windows don't overflow and students maintain cognitive focus.

#### Acceptance Criteria

1. THE System SHALL reject any constellation selection exceeding 4 nodes
2. WHEN a student attempts to select a 5th node, THEN THE System SHALL display an error toast immediately
3. WHEN validating a constellation, THEN THE System SHALL verify the count is between 2 and 4 inclusive
4. WHEN creating a loom_sessions record, THEN THE Database SHALL enforce a CHECK constraint: array_length(selected_topic_ids, 1) BETWEEN 2 AND 4
5. WHEN the UI renders the constellation dock, THEN THE System SHALL disable further selections once 4 nodes are selected
6. THE System SHALL prevent context window overflow in Gemini 3.1 Ultra by limiting constellation size

### Requirement 16: Critical Product Constraints - Mastered Nodes Only (The "Unearned Knowledge" Constraint)

**User Story:** As a system designer, I want to mathematically reject non-mastered nodes, so that synthesis only occurs with concepts backed by historical proof_events.

#### Acceptance Criteria

1. THE System SHALL reject any node selection where orbit_state < 2
2. WHEN a student Shift+Clicks a node with orbit_state = 0 or 1, THEN THE System SHALL display the error "Only Mastered stars can be woven."
3. WHEN initializing a loom session, THEN THE System SHALL verify all selected_topic_ids have orbit_state = 2
4. WHEN creating topic_edges, THEN THE System SHALL verify both source_topic_id and target_topic_id have orbit_state = 2
5. IF any topic in a constellation loses mastered status during session creation, THEN THE System SHALL reject the session
6. THE System SHALL ensure synthesis only occurs with concepts that have historical proof_events demonstrating mastery

### Requirement 17: Critical Product Constraints - Row Level Security (The "Anti-Plagiarism" Constraint)

**User Story:** As a system designer, I want impenetrable Row Level Security on synthesis data, so that the ultimate answer keys (essay outlines) never leak across users.

#### Acceptance Criteria

1. THE Database SHALL enforce RLS policies on loom_sessions filtering by user_id = auth.uid()
2. THE Database SHALL enforce RLS policies on topic_edges filtering by user_id = auth.uid()
3. WHEN a student queries loom_sessions, THEN THE Database SHALL return only records where user_id matches the authenticated user
4. WHEN a student queries topic_edges, THEN THE Database SHALL return only records where user_id matches the authenticated user
5. WHEN a student attempts to access another user's session via direct URL, THEN THE System SHALL return a 403 Forbidden error
6. THE Database SHALL prevent any cross-user data access at the database level, not just the application level


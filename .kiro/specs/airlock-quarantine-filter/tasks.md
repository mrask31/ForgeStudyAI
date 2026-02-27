# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Automated Email Quarantine
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate automated email ingestion instantly pollutes Galaxy UI
  - **Scoped PBT Approach**: Scope property to automated email webhook payloads (source === 'email')
  - Test that webhook handler creates study_topics with orbit_state = 0 for all email payloads
  - Test that Galaxy UI does NOT render topics with orbit_state = 0
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (automated emails create visible topics instead of quarantined)
  - Document counterexamples found (e.g., "Syllabus email with 10 assignments instantly renders 10 grey dots")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Manual Topic Visibility
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for manual topic creation (source !== 'email')
  - Observe: Manual "Add Topic" creates study_topics that render immediately in Galaxy UI
  - Observe: Existing Galaxy interactions (clicking nodes, studying, mastery updates) work correctly
  - Observe: SmartCTA navigation for active topics works without delays
  - Write property-based tests capturing observed behavior patterns:
    - For all manual topic creation inputs, study_topics created with orbit_state = 1 (or undefined on unfixed code)
    - For all Galaxy UI queries, topics render immediately after manual creation
    - For all SmartCTA clicks on active topics, navigation happens without airlock sequence
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Fix for Airlock Quarantine Filter

  - [x] 3.1 Create database schema migration
    - Add orbit_state column: ALTER TABLE study_topics ADD COLUMN orbit_state INTEGER DEFAULT 1 NOT NULL
    - Create index for query performance: CREATE INDEX idx_study_topics_orbit_state ON study_topics(orbit_state)
    - Default value 1 ensures backward compatibility (existing topics remain visible)
    - _Bug_Condition: isBugCondition(input) where input.source === 'email' AND input.creates_study_topics === true_
    - _Expected_Behavior: study_topics created with orbit_state = 0 for automated emails, orbit_state = 1 for manual creation_
    - _Preservation: Existing study_topics without orbit_state column treated as orbit_state = 1_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2_

  - [x] 3.2 Update webhook handler (src/app/api/inbox/email/route.ts)
    - Integrate Gemini 1.5 Flash with structured output schema for micro-mission extraction
    - Add conditional orbit_state assignment: const orbitState = source === 'email' ? 0 : 1
    - Implement reference material filtering (is_reference_only: true → learning_source only, no study_topic)
    - Loop through micro_missions array to create study_topics with orbit_state = 0
    - _Bug_Condition: isBugCondition(input) where input.source === 'email'_
    - _Expected_Behavior: Automated emails create study_topics with orbit_state = 0 (quarantined/invisible)_
    - _Preservation: Non-email sources continue to create study_topics with orbit_state = 1_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Update Galaxy UI component with orbit_state filter
    - Add orbit_state >= 1 filter to study_topics query
    - Implement decontamination banner component (translucent frosted glass, soft indigo border)
    - Query count of quarantined topics: SELECT COUNT(*) WHERE orbit_state = 0
    - Banner animation: fade-in 300ms, stay 6-8s, fade-out 300ms
    - Banner copy: "📩 Forge Inbox intercepted [X] new items. Fractured and safely tucked away."
    - _Bug_Condition: Galaxy UI renders all topics without orbit_state filtering_
    - _Expected_Behavior: Galaxy UI only renders topics with orbit_state >= 1_
    - _Preservation: Existing Galaxy interactions (clicking nodes, studying, mastery updates) unchanged_
    - _Requirements: 2.4, 2.5_

  - [x] 3.4 Update SmartCTA component with airlock release choreography
    - Expand recommendation query to evaluate BOTH orbit_state >= 1 AND orbit_state = 0
    - Add visual state detection for quarantined recommendations (Teal-to-Cyan gradient, Sparkles/PackageOpen icon)
    - Implement airlock release sequence for orbit_state = 0 topics:
      - Step 1: Update CTA text to "Materializing to Galaxy..."
      - Step 2: Server action to update orbit_state 0→1
      - Step 3: Pause 800ms for visual feedback (watch dot appear in Galaxy)
      - Step 4: Navigate to tutor session
    - Create server action for orbit_state transition
    - _Bug_Condition: SmartCTA doesn't update orbit_state before navigation_
    - _Expected_Behavior: SmartCTA transitions quarantined topics to active (0→1) with 800ms visual feedback_
    - _Preservation: SmartCTA navigation for already-active topics (orbit_state >= 1) unchanged (no airlock sequence)_
    - _Requirements: 3.4, 3.5_

  - [x] 3.5 Update manual topic creation forms
    - Add explicit orbit_state = 1 to all manual topic creation form handlers
    - Verify "Add Topic" button flow creates study_topics with orbit_state = 1
    - _Bug_Condition: N/A (manual creation not affected by bug)_
    - _Expected_Behavior: Manual topic creation always sets orbit_state = 1 (immediate visibility)_
    - _Preservation: Manual topic creation behavior unchanged (already creates visible topics)_
    - _Requirements: 3.1, 3.2_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Automated Email Quarantine
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms automated emails create orbit_state = 0, Galaxy UI doesn't render them)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Manual Topic Visibility
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms manual topic creation still creates orbit_state = 1, Galaxy UI renders immediately, SmartCTA navigation unchanged for active topics)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite (unit tests, property-based tests, integration tests)
  - Verify automated email ingestion creates quarantined topics (orbit_state = 0)
  - Verify manual topic creation creates visible topics (orbit_state = 1)
  - Verify Galaxy UI only renders orbit_state >= 1 topics
  - Verify SmartCTA airlock release choreography works (800ms pause, visual feedback)
  - Verify decontamination banner appears and fades correctly
  - Verify backward compatibility (existing topics without orbit_state treated as 1)
  - Ask user if questions arise or if additional testing is needed

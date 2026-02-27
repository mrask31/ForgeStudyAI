# Airlock Quarantine Filter Bugfix Design

## Overview

The Forge Inbox feature currently creates an unfiltered data pipeline that instantly renders all automated email ingestion as visible grey dots in the Galaxy UI, causing psychological overwhelm. This bugfix introduces an orbit_state staging mechanism (0=Quarantine/Invisible, 1=Active/Visible) that quarantines automated ingestion while preserving immediate visibility for manual topic creation.

The fix implements a "decontamination airlock" pattern: automated emails are fractured into micro-missions and staged invisibly (orbit_state = 0), then materialized into the Galaxy only when the student actively engages via SmartCTA. This preserves student agency by distinguishing passive data ingestion from active learning intent.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when automated email ingestion creates study_topics without orbit_state filtering, instantly polluting the Galaxy UI with grey dots
- **Property (P)**: The desired behavior - automated email ingestion creates study_topics with orbit_state = 0 (invisible), manual topic creation uses orbit_state = 1 (visible)
- **Preservation**: Existing manual topic creation, Galaxy interactions, and SmartCTA recommendation logic that must remain unchanged
- **orbit_state**: Integer column in study_topics table (0=Quarantine/Invisible, 1=Active/Visible) that controls Galaxy UI visibility
- **Airlock**: The SmartCTA mechanism that transitions quarantined items (orbit_state 0→1) when student actively engages
- **Decontamination Banner**: Passive UI notification that confirms automated ingestion without visual clutter
- **Forge Inbox**: The Postmark webhook endpoint (src/app/api/inbox/email/route.ts) that processes automated email ingestion
- **Galaxy UI**: The 2D force graph visualization (react-force-graph-2d) that displays study_topics as nodes
- **SmartCTA**: The AI-powered recommendation system that calculates the highest priority next action

## Bug Details

### Fault Condition

The bug manifests when automated emails arrive via the Postmark webhook and the system creates study_topics without orbit_state filtering. The webhook handler in `src/app/api/inbox/email/route.ts` immediately creates visible study_topics, causing all automated ingestion to render as grey dots in the Galaxy UI regardless of student readiness to engage.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type EmailWebhookPayload
  OUTPUT: boolean
  
  RETURN input.source === 'email'
         AND input.creates_study_topics === true
         AND input.orbit_state_filter === undefined
         AND Galaxy_UI_renders_all_topics_without_filtering === true
END FUNCTION
```

### Examples

- **Syllabus Email**: Student receives automated syllabus email with 15 assignments → System creates 15 study_topics instantly → Galaxy UI renders 15 grey dots immediately → Student experiences visual overwhelm (DEFECT: should quarantine with orbit_state = 0)

- **Bulk Announcement**: Professor sends class announcement with 8 reading materials → System creates 8 study_topics instantly → Galaxy UI cluttered with unprocessed dots (DEFECT: should stage invisibly until student engages)

- **Manual Topic Creation**: Student clicks "Add Topic" and types "Review Chapter 3" → System creates study_topic with orbit_state = 1 → Galaxy UI renders grey dot immediately (CORRECT: high-agency action should be visible)

- **Edge Case - Reference Material**: Email contains syllabus PDF marked as is_reference_only: true → System should create learning_source only, no study_topic (CORRECT: reference materials don't need quarantine)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Manual topic creation via "Add Topic" button must continue to create study_topics with orbit_state = 1 (immediate visibility)
- Existing Galaxy UI interactions (clicking nodes, studying, updating mastery) must function identically
- SmartCTA recommendation algorithm must continue to evaluate all topics (both orbit_state >= 1 AND orbit_state = 0) to determine highest priority
- Learning_sources table operations (file metadata, AI analysis, extracted text) must remain unchanged
- All current navigation flows and routing logic must work exactly as before

**Scope:**
All inputs that do NOT involve automated email ingestion (source === 'email') should be completely unaffected by this fix. This includes:
- Manual topic creation via UI forms
- Direct database operations from other features
- Existing study_topics with no orbit_state column (treated as orbit_state = 1 for backward compatibility)
- SmartCTA navigation and recommendation display

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Missing orbit_state Column**: The study_topics table lacks an orbit_state column to distinguish between quarantined (0) and active (1) topics
   - Database schema needs ALTER TABLE study_topics ADD COLUMN orbit_state INTEGER DEFAULT 1
   - Webhook handler has no mechanism to set orbit_state = 0 for automated ingestion

2. **Unfiltered Galaxy Query**: The Galaxy UI component queries study_topics without filtering by orbit_state
   - Current query: SELECT * FROM study_topics WHERE user_id = ?
   - Should be: SELECT * FROM study_topics WHERE user_id = ? AND orbit_state >= 1

3. **Webhook Logic Gap**: The Postmark webhook handler (src/app/api/inbox/email/route.ts) creates study_topics without distinguishing source
   - No conditional logic: if (source === 'email') { orbit_state = 0 } else { orbit_state = 1 }
   - Missing Gemini 1.5 Flash integration for structured output (is_reference_only detection)

4. **SmartCTA Airlock Missing**: The SmartCTA click handler doesn't update orbit_state before navigation
   - Current flow: Click CTA → router.push('/tutor/[id]')
   - Should be: Click CTA → UPDATE orbit_state = 1 → Pause 800ms → router.push('/tutor/[id]')

## Correctness Properties

Property 1: Fault Condition - Automated Email Quarantine

_For any_ email webhook payload where source === 'email' and the system creates study_topics, the fixed webhook handler SHALL create those study_topics with orbit_state = 0 (Quarantine/Invisible), preventing automated ingestion from polluting the Galaxy UI with grey dots.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Manual Topic Visibility

_For any_ topic creation that is NOT from automated email ingestion (manual "Add Topic" clicks, direct UI forms), the fixed system SHALL produce exactly the same behavior as the original system, creating study_topics with orbit_state = 1 (Active/Visible) for immediate Galaxy rendering.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: Database Schema Migration

**Changes**:
1. **Add orbit_state Column**: ALTER TABLE study_topics ADD COLUMN orbit_state INTEGER DEFAULT 1 NOT NULL
   - Default value 1 ensures backward compatibility (existing topics remain visible)
   - NOT NULL constraint prevents ambiguous states
   - Index recommended for query performance: CREATE INDEX idx_study_topics_orbit_state ON study_topics(orbit_state)

**File 2**: `src/app/api/inbox/email/route.ts` (Postmark Webhook Handler)

**Function**: Email ingestion and study_topic creation logic

**Specific Changes**:
1. **Integrate Gemini 1.5 Flash**: Add structured output call with responseSchema
   - System prompt: "You are an AI executive function filter for a 12-year-old student. Analyze this email and extract actionable micro-missions vs reference materials."
   - JSON schema: { subject: string, micro_missions: [{ title, context, estimated_minutes, is_reference_only }] }
   - Loop through micro_missions array to create study_topics or learning_sources

2. **Conditional orbit_state Assignment**: 
   ```typescript
   const orbitState = source === 'email' ? 0 : 1;
   await db.insert(study_topics).values({
     ...topicData,
     orbit_state: orbitState
   });
   ```

3. **Reference Material Filtering**: 
   - If is_reference_only === true → Create learning_source only (no study_topic)
   - If is_reference_only === false → Create study_topic with orbit_state = 0

**File 3**: Galaxy UI Component (likely `src/app/galaxy/page.tsx` or similar)

**Query**: study_topics fetch for force graph rendering

**Specific Changes**:
1. **Add orbit_state Filter**: 
   ```typescript
   const topics = await db.query.study_topics.findMany({
     where: and(
       eq(study_topics.user_id, userId),
       gte(study_topics.orbit_state, 1) // Only show active topics
     )
   });
   ```

2. **Add Decontamination Banner Component**:
   - Query count of quarantined topics: `SELECT COUNT(*) FROM study_topics WHERE user_id = ? AND orbit_state = 0`
   - Conditional render: If count > 0, show banner with fade-in/fade-out animation
   - Banner specs: Translucent frosted glass (bg-slate-900/80 backdrop-blur-md), soft indigo border (border-indigo-500/30)
   - Copy: "📩 Forge Inbox intercepted [X] new items. Fractured and safely tucked away."
   - Animation: opacity-0 → opacity-100 (300ms), stay 6-8s, opacity-100 → opacity-0 (300ms)

**File 4**: SmartCTA Component (likely `src/components/SmartCTA.tsx` or similar)

**Function**: Recommendation algorithm and click handler

**Specific Changes**:
1. **Expand Recommendation Query**: Evaluate BOTH orbit_state >= 1 AND orbit_state = 0
   ```typescript
   const allTopics = await db.query.study_topics.findMany({
     where: eq(study_topics.user_id, userId)
     // No orbit_state filter - evaluate all topics
   });
   ```

2. **Visual State Detection**: Add conditional styling for quarantined recommendations
   - If recommended topic has orbit_state = 0 → Apply "Airlock" visual state
   - Gradient: Teal-to-Cyan or Slate-to-Indigo (represents "New Mission" not "Urgent Warning")
   - Icon: Sparkles or PackageOpen (Lucide)
   - Micro-copy: "✨ Unpack New Mission: [Title] (Est. [X] mins)"

3. **Airlock Release Sequence**: Intercept click handler for quarantined topics
   ```typescript
   async function handleCTAClick(topicId: string, currentOrbitState: number) {
     if (currentOrbitState === 0) {
       // Step 1: Update UI text
       setCTAText("Materializing to Galaxy...");
       
       // Step 2: Server action to update orbit_state
       await updateOrbitState(topicId, 1);
       
       // Step 3: Pause for visual feedback (watch dot appear in Galaxy)
       await new Promise(resolve => setTimeout(resolve, 800));
     }
     
     // Step 4: Navigate to tutor session
     router.push(`/tutor/${topicId}`);
   }
   ```

4. **Server Action**: Create new server action for orbit_state transition
   ```typescript
   'use server'
   export async function updateOrbitState(topicId: string, newState: number) {
     await db.update(study_topics)
       .set({ orbit_state: newState })
       .where(eq(study_topics.id, topicId));
   }
   ```

**File 5**: Manual Topic Creation Forms (likely `src/components/AddTopicForm.tsx` or similar)

**Function**: UI form submission handler

**Specific Changes**:
1. **Explicit orbit_state = 1**: Ensure manual topic creation always sets orbit_state = 1
   ```typescript
   await db.insert(study_topics).values({
     ...formData,
     orbit_state: 1 // Explicit for manual creation
   });
   ```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (automated emails instantly pollute Galaxy UI), then verify the fix works correctly (quarantine with orbit_state = 0) and preserves existing behavior (manual topics remain visible).

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Send test emails via Postmark webhook to the unfixed system and observe Galaxy UI rendering. Count the number of grey dots before and after email ingestion. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Syllabus Email Test**: Send automated email with 10 assignments → Observe Galaxy UI instantly renders 10 grey dots (will fail on unfixed code - should quarantine)
2. **Bulk Announcement Test**: Send class announcement with 5 reading materials → Observe Galaxy UI cluttered with 5 unprocessed dots (will fail on unfixed code - should stage invisibly)
3. **Manual Topic Test**: Click "Add Topic" and create "Review Chapter 3" → Observe Galaxy UI renders grey dot immediately (should pass on unfixed code - correct behavior)
4. **Reference Material Test**: Send email with syllabus PDF marked is_reference_only: true → Observe no study_topic created, only learning_source (may fail on unfixed code if Gemini integration missing)

**Expected Counterexamples**:
- Automated email ingestion creates study_topics that instantly render in Galaxy UI
- Possible causes: missing orbit_state column, unfiltered Galaxy query, webhook handler doesn't distinguish source

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (automated email ingestion), the fixed function produces the expected behavior (orbit_state = 0, invisible in Galaxy).

**Pseudocode:**
```
FOR ALL email_payload WHERE email_payload.source === 'email' DO
  study_topics_created := webhook_handler_fixed(email_payload)
  ASSERT study_topics_created.orbit_state === 0
  ASSERT Galaxy_UI_does_not_render(study_topics_created)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (manual topic creation, existing interactions), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL topic_creation WHERE topic_creation.source !== 'email' DO
  ASSERT manual_topic_creation_original(input) = manual_topic_creation_fixed(input)
  ASSERT topic_creation_fixed.orbit_state === 1
  ASSERT Galaxy_UI_renders_immediately(topic_creation_fixed)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (different manual topic creation flows)
- It catches edge cases that manual unit tests might miss (form validation, concurrent creation, etc.)
- It provides strong guarantees that behavior is unchanged for all non-email inputs

**Test Plan**: Observe behavior on UNFIXED code first for manual topic creation and Galaxy interactions, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Manual Topic Creation Preservation**: Observe that clicking "Add Topic" creates visible study_topics on unfixed code, then write test to verify orbit_state = 1 after fix
2. **Galaxy Interaction Preservation**: Observe that clicking existing nodes, studying, and updating mastery works correctly on unfixed code, then write test to verify identical behavior after fix
3. **SmartCTA Navigation Preservation**: Observe that clicking SmartCTA for active topics (orbit_state >= 1) navigates immediately on unfixed code, then write test to verify no airlock sequence for already-active topics

### Unit Tests

- Test webhook handler creates study_topics with orbit_state = 0 when source === 'email'
- Test webhook handler creates study_topics with orbit_state = 1 when source !== 'email'
- Test Galaxy UI query filters by orbit_state >= 1
- Test SmartCTA airlock sequence updates orbit_state 0→1 before navigation
- Test manual topic creation always sets orbit_state = 1
- Test decontamination banner renders when quarantined topics exist
- Test Gemini 1.5 Flash structured output correctly identifies is_reference_only

### Property-Based Tests

- Generate random email payloads and verify all create study_topics with orbit_state = 0
- Generate random manual topic creation inputs and verify all create study_topics with orbit_state = 1
- Generate random Galaxy UI states and verify only orbit_state >= 1 topics render
- Test that SmartCTA evaluates both quarantined and active topics across many scenarios
- Test that airlock release sequence always updates orbit_state before navigation

### Integration Tests

- Test full email ingestion flow: Postmark webhook → Gemini analysis → study_topics creation → Galaxy UI rendering (should not show quarantined topics)
- Test full manual topic flow: "Add Topic" form → study_topics creation → Galaxy UI rendering (should show immediately)
- Test full SmartCTA airlock flow: Click quarantined recommendation → orbit_state update → visual feedback → navigation → Galaxy UI shows new dot
- Test decontamination banner lifecycle: Email arrives → banner fades in → stays 6-8s → fades out
- Test backward compatibility: Existing study_topics with no orbit_state column render correctly (treated as orbit_state = 1)

## UI/UX Neurochemical Design Specifications

### Dopamine Maximization (Reward System)

**Airlock Release Choreography** (Requirement 3.5):
The moment a student clicks SmartCTA to engage with a quarantined topic is a high-agency decision that deserves dopamine reward. The 800ms pause is critical for visual feedback:

1. **Anticipation Phase** (0-200ms): CTA text changes to "Materializing to Galaxy..." with subtle pulse animation
2. **Materialization Phase** (200-600ms): Server action completes, react-force-graph-2d detects new orbit_state = 1, CSS pop/scale animation on new grey node
3. **Stabilization Phase** (600-800ms): Node settles into force graph physics, student watches their Galaxy expand
4. **Navigation Phase** (800ms+): router.push('/tutor/[id]') executes, student enters tutor session

This choreography creates a micro-reward loop: "I made a decision → I see the result → I feel in control"

**Visual Reward Cues**:
- SmartCTA "Airlock" state uses Teal-to-Cyan gradient (cool, inviting, "New Mission" framing)
- Sparkles icon (✨) or PackageOpen icon signals "gift to unwrap" not "urgent task"
- Micro-copy: "Unpack New Mission: [Title] (Est. [X] mins)" frames engagement as exploration

### Cortisol Suppression (Stress Reduction)

**Decontamination Banner Design** (Requirement 2.5):
The banner must confirm system activity without triggering panic. Critical design choices:

- **NO RED, ORANGE, OR YELLOW**: These colors trigger cortisol release (danger signals)
- **Soft Indigo/Emerald Border**: Cool colors signal calm, control, safety
- **Translucent Frosted Glass**: bg-slate-900/80 backdrop-blur-md creates depth without blocking view
- **Passive Copy**: "📩 Forge Inbox intercepted [X] new items. Fractured and safely tucked away." uses protective framing ("intercepted", "safely tucked away") not urgency framing ("new tasks", "action required")
- **No Close Button**: Read-only banner avoids decision fatigue (student doesn't need to "dismiss" or "acknowledge")
- **Fade-Out Animation**: Banner disappears automatically after 6-8s, avoiding persistent visual clutter

**SmartCTA State Differentiation**:
- **Red State**: Imminent deadline (cortisol appropriate - real urgency)
- **Amber State**: Low mastery topic (mild concern - skill gap)
- **Teal/Cyan State**: Quarantined topic (curiosity, not urgency - "New Mission" framing)

This color hierarchy ensures cortisol is only triggered for genuine time pressure, not for passive data ingestion.

### Cognitive Load Reduction

**Galaxy UI Filtering** (Requirement 2.4):
The core fix (orbit_state >= 1 filter) directly reduces cognitive load by hiding unprocessed information. Students see only topics they've actively chosen to engage with, not every email that arrived passively.

**Gemini 1.5 Flash Auto-Fracturing** (Requirement 2.3):
The structured output schema (micro_missions array with estimated_minutes) pre-processes bulk content into bite-sized chunks. When students eventually engage via SmartCTA, they see "Review Section 2.3 (Est. 8 mins)" not "Read entire syllabus (Est. 120 mins)".

**SmartCTA Unified Evaluation** (Requirement 3.4):
By evaluating BOTH active and quarantined topics, SmartCTA ensures students always see the absolute highest priority action. This prevents decision paralysis ("Should I check the inbox or work on existing topics?") by making the decision for them.

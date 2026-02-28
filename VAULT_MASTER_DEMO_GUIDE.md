# The Vault Master Demo Guide
## Phase 4.2 - Complete End-to-End Validation

This guide walks through the complete neurochemical loop for The Vault spaced-repetition engine.

---

## Prerequisites

1. **Development server running**: `npm run dev`
2. **Supabase migrations applied**: Both `supabase_vault_srs_migration.sql` and `supabase_vault_sessions_migration.sql`
3. **User logged in** with at least one mastered topic (orbit_state = 2)
4. **Gemini API key** configured in `.env.local`

---

## The Master Demo Sequence

### STEP 1: The Decay (Force a Ghost Node)

**Goal**: Manually expire a mastered topic to trigger lazy evaluation.

**SQL to execute in Supabase SQL Editor**:

```sql
-- Find a mastered topic for your user
SELECT id, title, orbit_state, next_review_date, srs_interval_days
FROM study_topics
WHERE orbit_state = 2
LIMIT 1;

-- Force the next_review_date into the past (simulate 7 days of decay)
UPDATE study_topics
SET next_review_date = NOW() - INTERVAL '7 days'
WHERE id = '<YOUR_TOPIC_ID_HERE>'
  AND orbit_state = 2;

-- Verify the update
SELECT id, title, orbit_state, next_review_date, srs_interval_days
FROM study_topics
WHERE id = '<YOUR_TOPIC_ID_HERE>';
```

**Expected Result**: `next_review_date` is now 7 days in the past, but `orbit_state` is still 2 (Mastered).

---

### STEP 2: The Lazy Evaluation (Silver Ghost Appears)

**Goal**: Mount the Galaxy and watch lazy evaluation downgrade the expired topic to a Ghost Node.

**Actions**:
1. Navigate to `/app/middle` (the Galaxy view)
2. Open browser DevTools → Network tab
3. Watch for POST request to `/api/vault/lazy-eval`

**Expected Behavior**:
- POST `/api/vault/lazy-eval` fires on Galaxy mount
- Response shows `updatedCount: 1` and the downgraded topic ID
- The expired topic's node:
  - **Color**: Changes from Indigo (#6366f1) to Silver (#94a3b8)
  - **Opacity**: Drops to 40%
  - **Physics**: Drifts outward (radialStrength = -0.3)
  - **orbit_state**: Now 3 (Ghost Node)

**Verification SQL**:
```sql
-- Confirm orbit_state changed to 3
SELECT id, title, orbit_state, next_review_date
FROM study_topics
WHERE id = '<YOUR_TOPIC_ID_HERE>';
```

**Expected**: `orbit_state = 3`

---

### STEP 3: The Hook (Smart CTA Appears)

**Goal**: Verify the Smart CTA detects the Ghost Node and displays the Vault CTA.

**Expected Behavior**:
- Smart CTA updates to show:
  - **Icon**: 🔐 (lock emoji)
  - **Label**: "Secure Your Foundation"
  - **Title**: "Review Fading Memories"
  - **Description**: "1 concept(s) need review"
  - **Gradient**: Purple-to-Indigo (`from-purple-600 to-indigo-600`)
  - **Priority**: Highest (priority 0)

**Verification**:
- Open DevTools → Network tab
- Look for GET request to `/api/vault/queue`
- Response should show:
  ```json
  {
    "ghost_nodes": [
      {
        "id": "<topic_id>",
        "title": "<topic_title>",
        "days_overdue": 7
      }
    ],
    "total_count": 1,
    "estimated_time_minutes": 3
  }
  ```

---

### STEP 4: The Interrogation (Enter the Vault)

**Goal**: Click the Vault CTA and answer the active recall question.

**Actions**:
1. Click "Review Fading Memories" button
2. Watch for POST request to `/api/vault/session`
3. Page navigates to `/vault/[sessionId]`

**Expected Behavior**:

**Session Creation**:
- POST `/api/vault/session` with `topicIds: ["<topic_id>"]`
- Response includes:
  ```json
  {
    "session": {
      "id": "<session_id>",
      "topic_ids": ["<topic_id>"],
      "batch_size": 1,
      "status": "IN_PROGRESS"
    },
    "first_question": {
      "topic_id": "<topic_id>",
      "topic_title": "<topic_title>",
      "question": "<gemini_generated_question>",
      "context_reference": "<proof_event_context>"
    }
  }
  ```

**VaultWorkspace UI**:
- Progress indicator: "Question 1 of 1"
- Topic title displayed
- Question text from Gemini Flash
- Context reference (italic, gray)
- Answer textarea (empty, enabled)
- Submit button (enabled)

**Actions**:
1. Type a correct answer in the textarea
2. Click "Submit Answer"
3. Watch for POST request to `/api/vault/review`

**Expected Behavior**:
- Button text changes to "Evaluating..."
- POST `/api/vault/review` with:
  ```json
  {
    "sessionId": "<session_id>",
    "topicId": "<topic_id>",
    "answer": "<your_answer>"
  }
  ```
- Response includes:
  ```json
  {
    "passed": true,
    "brief_feedback": "<gemini_feedback>",
    "session_complete": true,
    "topics_passed": 1,
    "topics_failed": 0
  }
  ```

**Feedback UI**:
- Green feedback box appears
- Shows brief_feedback text
- Waits 2 seconds

**Session Complete Screen**:
- Title: "🔐 Vault Session Complete"
- "Memories Secured": 1 (indigo)
- "Need Review Tomorrow": 0 (amber)
- "Return to Galaxy" button

---

### STEP 5: The Dopamine Hit (Snap-Back Animation)

**Goal**: Return to Galaxy and watch the Silver node snap back to Indigo.

**Actions**:
1. Click "Return to Galaxy" button
2. Navigate back to `/app/middle`

**Expected Behavior**:

**Custom Event Fired**:
- During Step 4 (after passed recall), the VaultWorkspace dispatched:
  ```javascript
  window.dispatchEvent(new CustomEvent('vault:snap-back', {
    detail: { topicId: '<topic_id>' }
  }));
  ```

**ConceptGalaxy Snap-Back Sequence**:
1. **Event Listener Catches**: `vault:snap-back` event
2. **State Update**: Topic added to `justRescued` array
3. **Physics Mode Switch**: Node's `physicsMode` changes to `'snapBack'`
4. **Visual Transformation** (1 second duration):
   - **Color**: Silver (#94a3b8) → Indigo (#6366f1)
   - **Opacity**: 40% → 100%
   - **Physics**: Radial force = 2.0 (violent snap toward center)
   - **Animation**: Smooth transition via `requestAnimationFrame`
5. **Cleanup**: After 1 second, remove from `justRescued` array
6. **Final State**: Node settles as normal Mastered node (orbit_state = 2)

**Verification SQL**:
```sql
-- Confirm orbit_state restored to 2 (Mastered)
SELECT id, title, orbit_state, srs_interval_days, srs_ease_factor, next_review_date
FROM study_topics
WHERE id = '<YOUR_TOPIC_ID_HERE>';
```

**Expected**:
- `orbit_state = 2` (Mastered)
- `srs_interval_days` increased (e.g., 3 → 6 or exponential growth)
- `srs_ease_factor` increased by 0.1
- `next_review_date` set to future date (NOW() + interval)
- `srs_reviews_completed` incremented by 1

---

## Verification Checklist

Use this checklist to confirm each requirement is met:

### Lazy Evaluation (Requirements 2.1, 2.3)
- [ ] POST `/api/vault/lazy-eval` fires on Galaxy mount
- [ ] Expired mastered topics downgraded to orbit_state = 3
- [ ] Ghost Nodes appear with Silver color (#94a3b8)
- [ ] Ghost Nodes have 40% opacity
- [ ] Ghost Nodes drift outward (negative radial force)

### Smart CTA (Requirements 4.1, 4.2, 4.3, 4.4)
- [ ] GET `/api/vault/queue` returns Ghost Nodes
- [ ] Vault CTA appears with highest priority
- [ ] CTA shows correct count and estimated time
- [ ] CTA uses purple-to-indigo gradient
- [ ] Clicking CTA creates session and navigates

### Vault Session (Requirements 5.1, 5.2, 5.3, 5.4)
- [ ] POST `/api/vault/session` creates session
- [ ] Gemini Flash generates question in <2 seconds
- [ ] VaultWorkspace loads session data via GET endpoint
- [ ] Question and context displayed correctly
- [ ] Progress indicator shows current/total

### Answer Evaluation (Requirements 5.6, 6.1, 6.2, 6.3, 6.4, 6.5)
- [ ] POST `/api/vault/review` evaluates answer
- [ ] Gemini Flash returns passed/failed + feedback
- [ ] Feedback UI displays correctly (green for pass)
- [ ] SM-2 calculation updates SRS state
- [ ] Database updated: interval, ease factor, next_review_date, orbit_state

### Snap-Back Animation (Requirements 8.1, 8.2, 8.3, 8.4, 8.5)
- [ ] `vault:snap-back` custom event dispatched on pass
- [ ] ConceptGalaxy event listener catches event
- [ ] Node color transitions Silver → Indigo
- [ ] Node opacity transitions 40% → 100%
- [ ] Physics force pulls node to center (radialStrength = 2.0)
- [ ] Animation completes in 1 second
- [ ] Node settles as normal Mastered node

### SM-2 Algorithm (Requirements 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4)
- [ ] Pass: Interval increases (3 → 6 → exponential)
- [ ] Pass: Ease factor increases by 0.1
- [ ] Fail: Interval resets to 1 day
- [ ] Fail: Ease factor decreases by 0.2 (floor at 1.3)
- [ ] Next review date always in future
- [ ] All 10 property tests passing

---

## Troubleshooting

### Ghost Node doesn't appear
- Check SQL: Verify `next_review_date` is in the past
- Check Network: Confirm `/api/vault/lazy-eval` returned `updatedCount: 1`
- Check Console: Look for errors in browser DevTools

### Smart CTA doesn't show Vault option
- Check Network: Confirm `/api/vault/queue` returned `total_count > 0`
- Check Console: Look for errors in smart-cta.ts
- Verify profile_id matches in database

### Gemini Flash timeout
- Check `.env.local`: Verify `GEMINI_API_KEY` is set
- Check Network: Look for 429 (rate limit) or 500 errors
- Check Console: Look for AI_ERROR messages

### Snap-back animation doesn't fire
- Check Console: Verify `vault:snap-back` event dispatched
- Check ConceptGalaxy: Verify event listener registered
- Check timing: Animation completes in 1 second (may be fast)

### Database not updating
- Check RLS policies: Verify user owns the profile
- Check SQL: Run verification queries to confirm state
- Check Network: Look for DATABASE_ERROR responses

---

## Success Criteria

The Master Demo is complete when:

1. ✅ Expired mastered topic becomes Silver Ghost Node
2. ✅ Smart CTA displays "🔐 Review Fading Memories"
3. ✅ Vault session loads with Gemini Flash question
4. ✅ Correct answer triggers green feedback
5. ✅ Silver node snaps back to Indigo in 1 second
6. ✅ Database confirms orbit_state = 2, updated SRS values

---

## Screen Recording Checklist

For the CPO demo video, capture:

1. **Database Setup**: Show SQL forcing `next_review_date` into past
2. **Galaxy Mount**: Show Silver Ghost Node appearing with 40% opacity
3. **Smart CTA**: Show "Review Fading Memories" button
4. **Vault Entry**: Show navigation to `/vault/[sessionId]`
5. **Question Display**: Show Gemini Flash question and context
6. **Answer Submission**: Show typing answer and clicking Submit
7. **Feedback**: Show green feedback box
8. **Return to Galaxy**: Show clicking "Return to Galaxy"
9. **Snap-Back**: Show Silver node violently snapping to Indigo
10. **Database Verification**: Show SQL confirming orbit_state = 2

---

## Phase 4.2 Complete 🚀

Once the Master Demo video is posted, Phase 4.2 (The Vault Spaced-Repetition Engine) is officially closed.

**What we built**:
- SuperMemo-2 algorithm with mathematical guarantees (10 property tests)
- Lazy evaluation system (no CRON jobs)
- Gemini 1.5 Flash interrogator (<2s response time)
- Ghost Node physics (Silver, 40% opacity, drift outward)
- Snap-back animation (1 second, radialStrength = 2.0)
- Complete neurochemical loop (decay → hook → interrogation → dopamine hit)

**Next Phase**: TBD by CPO

# LMS to Galaxy Pipeline

## Overview

This pipeline converts synced Canvas/Google Classroom assignments into Galaxy nodes (study_topics) so they appear in the student's Learning Galaxy visualization.

## Architecture

```
Canvas/Classroom Assignment
         ↓
   SmartSyncService
         ↓
  synced_assignments table
         ↓
  AssignmentTopicExtractor (Claude Haiku AI)
         ↓
   study_topics table
         ↓
    Galaxy UI
```

## Components

### 1. Database Schema (`supabase/migrations/20260309000001_lms_to_galaxy_pipeline.sql`)

Adds the following columns:

**synced_assignments:**
- `merge_status` (enum): 'pending', 'processing', 'merged', 'failed'
- `study_topic_id` (UUID): Links to created study_topic

**study_topics:**
- `source` (text): 'manual', 'lms', 'email', 'ai'
- `synced_assignment_id` (UUID): Links back to synced_assignment
- `subject` (text): Academic subject extracted by AI

### 2. AssignmentTopicExtractor (`src/lib/lms/services/AssignmentTopicExtractor.ts`)

Uses Claude Haiku to extract clean topic metadata from raw assignment data:

**Input:**
- Assignment title
- Assignment description
- Course name

**Output:**
```json
{
  "topic_name": "Quadratic Equations",
  "description": "Learn to solve quadratic equations using factoring and the quadratic formula",
  "subject": "Math",
  "key_concepts": ["factoring", "quadratic formula", "parabolas"]
}
```

### 3. SmartSyncService Updates (`src/lib/lms/services/SmartSyncService.ts`)

**New Method: `createStudyTopicFromAssignment()`**

Called automatically after each successful assignment sync:

1. Gets student's `profile_id` from `student_profiles` table
2. Checks if study_topic already exists (prevents duplicates)
3. Calls AI to extract topic metadata
4. Inserts new `study_topic` with:
   - `orbit_state: 1` (Active - skips Quarantine)
   - `source: 'lms'`
   - `srs_ease_factor: 2.5` (SM-2 default)
   - `srs_interval_days: 1`
   - `next_review_date: now() + 1 day`
5. Updates `synced_assignment` with `merge_status: 'merged'`

**Error Handling:**
- If AI call fails, uses fallback (assignment title as topic name)
- If profile not found, marks assignment as `merge_status: 'failed'`
- Logs errors to `sync_logs` table
- Never throws - continues processing other assignments

### 4. Backfill Script (`src/lib/lms/services/backfillAssignmentTopics.ts`)

Processes all existing `synced_assignments` that don't have study_topics yet.

**Filters:**
- `sync_status = 'completed'`
- `merge_status IS NULL OR merge_status = 'pending'`
- No matching `study_topic` exists

**Rate Limiting:**
- 500ms delay between AI calls to avoid rate limits

## Usage

### Automatic (New Assignments)

The pipeline runs automatically when:
- Student logs in and sync is triggered
- 3AM batch sync runs
- Manual sync is triggered

No action needed - new assignments automatically become Galaxy nodes.

### Manual Backfill (Existing Assignments)

#### Option 1: Via API Endpoint

```bash
curl -X POST http://localhost:3000/api/internal/lms/backfill-topics \
  -H "Authorization: Bearer YOUR_INTERNAL_TOKEN"
```

#### Option 2: Via Script

```bash
npx ts-node scripts/backfill-lms-topics.ts
```

#### Option 3: Via Node REPL

```typescript
import { backfillAssignmentTopics } from './src/lib/lms/services/backfillAssignmentTopics';

await backfillAssignmentTopics(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.ANTHROPIC_API_KEY
);
```

## Verification

After running the pipeline, verify:

1. **Check synced_assignments:**
```sql
SELECT id, title, merge_status, study_topic_id 
FROM synced_assignments 
WHERE sync_status = 'completed';
```

Expected: `merge_status = 'merged'` and `study_topic_id` is not null

2. **Check study_topics:**
```sql
SELECT id, title, source, synced_assignment_id 
FROM study_topics 
WHERE source = 'lms';
```

Expected: Rows exist with `source = 'lms'` and `synced_assignment_id` populated

3. **Check Galaxy UI:**
- Navigate to `/app` (Galaxy page)
- Verify nodes appear for Canvas assignments
- Nodes should be amber (orbit_state = 1, Active)

## Troubleshooting

### Assignment not appearing in Galaxy

1. Check `synced_assignments.merge_status`:
   - `pending`: Pipeline hasn't run yet
   - `failed`: Check logs for error
   - `merged`: Should have `study_topic_id`

2. Check `study_topics` table:
   - Query by `synced_assignment_id`
   - Verify `orbit_state >= 1` (Galaxy filters by this)

3. Check student profile:
   - Verify `student_profiles.owner_id` matches `synced_assignments.student_id`
   - Verify `grade_band` is 'middle' or 'high' (study_topics only for grades 6-12)

### AI extraction failing

- Check `ANTHROPIC_API_KEY` is set
- Check API rate limits
- Fallback will use assignment title as topic name

### Duplicate topics

- Pipeline checks for existing topics by `synced_assignment_id`
- If duplicate found, skips creation and updates `merge_status`

## Configuration

### Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### AI Model

Currently uses: `claude-haiku-4-5-20251001`

To change model, edit `AssignmentTopicExtractor.ts`:
```typescript
model: 'claude-haiku-4-5-20251001', // Change here
```

### Orbit State

LMS assignments default to `orbit_state: 1` (Active).

To change to Quarantine (0), edit `SmartSyncService.ts`:
```typescript
orbit_state: 0, // Change from 1 to 0
```

## Future Enhancements

- [ ] Batch AI calls for better rate limit handling
- [ ] Add retry logic for failed AI extractions
- [ ] Support for assignment attachments → documents table
- [ ] Automatic topic merging for similar assignments across courses
- [ ] Parent notification when new topics appear in Galaxy

-- ============================================
-- VAULT PHASE 4.2: SRS TRACKING MIGRATION
-- ============================================
-- Adds SuperMemo-2 tracking columns to study_topics table
-- Enables spaced-repetition memory retention system

-- ============================================
-- STEP 1: Add SRS columns
-- ============================================

ALTER TABLE study_topics
ADD COLUMN IF NOT EXISTS srs_interval_days INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE study_topics
ADD COLUMN IF NOT EXISTS srs_ease_factor NUMERIC(5, 3) DEFAULT 2.500 NOT NULL;

ALTER TABLE study_topics
ADD COLUMN IF NOT EXISTS next_review_date TIMESTAMPTZ;

ALTER TABLE study_topics
ADD COLUMN IF NOT EXISTS srs_reviews_completed INTEGER DEFAULT 0 NOT NULL;

-- ============================================
-- STEP 2: Add index for lazy evaluation query
-- ============================================

CREATE INDEX IF NOT EXISTS idx_study_topics_review_date 
ON study_topics(next_review_date)
WHERE orbit_state = 2; -- Partial index for mastered topics only

-- ============================================
-- STEP 3: Update orbit_state constraint
-- ============================================

-- Drop old constraint (0-2 range)
ALTER TABLE study_topics 
DROP CONSTRAINT IF EXISTS study_topics_orbit_state_check;

-- Add new constraint (0-3 range to include Ghost Node state)
ALTER TABLE study_topics
ADD CONSTRAINT study_topics_orbit_state_check 
CHECK (orbit_state >= 0 AND orbit_state <= 3);

-- ============================================
-- STEP 4: Add comments for documentation
-- ============================================

COMMENT ON COLUMN study_topics.srs_interval_days IS 
'SuperMemo-2 interval: days until next review (0 = not initialized)';

COMMENT ON COLUMN study_topics.srs_ease_factor IS 
'SuperMemo-2 ease factor: multiplier for interval growth (1.3 to ∞, default 2.5)';

COMMENT ON COLUMN study_topics.next_review_date IS 
'Timestamp when topic requires review (NULL = not in SRS system yet)';

COMMENT ON COLUMN study_topics.srs_reviews_completed IS 
'Count of completed Vault review sessions for this topic';

COMMENT ON COLUMN study_topics.orbit_state IS 
'Visual state: 0=Quarantine, 1=Active, 2=Mastered, 3=Ghost Node (decaying)';;

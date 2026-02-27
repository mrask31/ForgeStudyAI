-- ============================================
-- AIRLOCK QUARANTINE FILTER - ORBIT STATE MIGRATION
-- ============================================
-- This migration adds the orbit_state column to study_topics
-- to enable quarantine staging for automated email ingestion
--
-- orbit_state values:
-- 0 = Quarantine/Invisible (automated email ingestion)
-- 1 = Active/Visible (manual creation or SmartCTA activated)
--
-- Default value 1 ensures backward compatibility
-- (existing topics remain visible)
-- ============================================

-- Add orbit_state column with default value 1
ALTER TABLE study_topics 
ADD COLUMN IF NOT EXISTS orbit_state INTEGER DEFAULT 1 NOT NULL
CHECK (orbit_state >= 0 AND orbit_state <= 1);
-- Add index for query performance (Galaxy UI filters by orbit_state >= 1)
CREATE INDEX IF NOT EXISTS idx_study_topics_orbit_state 
ON study_topics(orbit_state);
-- Add description column (used by webhook for auto-created topics)
ALTER TABLE study_topics
ADD COLUMN IF NOT EXISTS description TEXT;
-- Add metadata column (used by webhook for source tracking and AI analysis)
ALTER TABLE study_topics
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
-- Create index for metadata queries (useful for filtering by source)
CREATE INDEX IF NOT EXISTS idx_study_topics_metadata 
ON study_topics USING gin(metadata);
-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that orbit_state column was added
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'study_topics' AND column_name = 'orbit_state';

-- Check that all existing topics have orbit_state = 1 (backward compatibility)
-- SELECT COUNT(*) as existing_topics_count, orbit_state 
-- FROM study_topics 
-- GROUP BY orbit_state;

-- Check that description and metadata columns were added
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'study_topics' 
-- AND column_name IN ('description', 'metadata');

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- DROP INDEX IF EXISTS idx_study_topics_orbit_state;
-- DROP INDEX IF EXISTS idx_study_topics_metadata;
-- ALTER TABLE study_topics DROP COLUMN IF EXISTS orbit_state;
-- ALTER TABLE study_topics DROP COLUMN IF EXISTS description;
-- ALTER TABLE study_topics DROP COLUMN IF EXISTS metadata;;

-- Migration: LMS to Galaxy Pipeline
-- Description: Adds columns to link synced_assignments to study_topics
-- Date: 2026-03-09

-- ============================================
-- STEP 1: Add columns to synced_assignments
-- ============================================

-- Add merge_status to track processing state
DO $$ BEGIN
  CREATE TYPE assignment_merge_status AS ENUM ('pending', 'processing', 'merged', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE synced_assignments 
ADD COLUMN IF NOT EXISTS merge_status assignment_merge_status DEFAULT 'pending';

ALTER TABLE synced_assignments
ADD COLUMN IF NOT EXISTS study_topic_id UUID REFERENCES study_topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_synced_assignments_merge_status ON synced_assignments(merge_status);
CREATE INDEX IF NOT EXISTS idx_synced_assignments_study_topic_id ON synced_assignments(study_topic_id);

-- ============================================
-- STEP 2: Add columns to study_topics
-- ============================================

-- Add source column to track where topic came from
ALTER TABLE study_topics
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'lms', 'email', 'ai'));

-- Add synced_assignment_id to link back to LMS data
ALTER TABLE study_topics
ADD COLUMN IF NOT EXISTS synced_assignment_id UUID REFERENCES synced_assignments(id) ON DELETE SET NULL;

-- Add subject column for AI-extracted subject
ALTER TABLE study_topics
ADD COLUMN IF NOT EXISTS subject TEXT;

CREATE INDEX IF NOT EXISTS idx_study_topics_source ON study_topics(source);
CREATE INDEX IF NOT EXISTS idx_study_topics_synced_assignment_id ON study_topics(synced_assignment_id);

-- ============================================
-- STEP 3: Comments
-- ============================================

COMMENT ON COLUMN synced_assignments.merge_status IS 'Processing state: pending, processing, merged, failed';
COMMENT ON COLUMN synced_assignments.study_topic_id IS 'Links to study_topics if this assignment was converted to a Galaxy node';

COMMENT ON COLUMN study_topics.source IS 'Origin: manual (user created), lms (Canvas/Classroom), email (automated), ai (generated)';
COMMENT ON COLUMN study_topics.synced_assignment_id IS 'Links to synced_assignments if this topic came from LMS sync';
COMMENT ON COLUMN study_topics.subject IS 'Academic subject extracted by AI (e.g., Math, Science, History)';

-- ============================================
-- Verification
-- ============================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'synced_assignments' AND column_name IN ('merge_status', 'study_topic_id');
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'study_topics' AND column_name IN ('source', 'synced_assignment_id', 'subject');

-- ============================================
-- PHASE 2: CONCEPT GALAXY - MASTERY SYSTEM
-- ============================================
-- This migration adds mastery scoring to study_topics
-- and creates functions to calculate mastery from proof_events

-- ============================================
-- PART 1: Add mastery_score column
-- ============================================

-- Add mastery_score to study_topics (0-100 scale)
ALTER TABLE study_topics 
ADD COLUMN IF NOT EXISTS mastery_score INTEGER DEFAULT 0 
CHECK (mastery_score >= 0 AND mastery_score <= 100);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_study_topics_mastery 
ON study_topics(mastery_score);

-- ============================================
-- PART 2: Calculate Mastery Function
-- ============================================

CREATE OR REPLACE FUNCTION calculate_topic_mastery(topic_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  pass_count INTEGER;
  total_count INTEGER;
  mastery INTEGER;
BEGIN
  -- Count proof events for this topic
  SELECT 
    COUNT(*) FILTER (WHERE classification = 'pass'),
    COUNT(*)
  INTO pass_count, total_count
  FROM proof_events
  WHERE concept IN (
    SELECT title FROM study_topics WHERE id = topic_id_param
  );
  
  -- Calculate mastery (0-100)
  IF total_count = 0 THEN
    RETURN 0;
  ELSE
    mastery := (pass_count::FLOAT / total_count::FLOAT * 100)::INTEGER;
    RETURN mastery;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: Auto-Update Mastery Trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_topic_mastery()
RETURNS TRIGGER AS $$
BEGIN
  -- Update mastery_score for the topic related to this proof event
  UPDATE study_topics
  SET mastery_score = calculate_topic_mastery(id)
  WHERE title = NEW.concept;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS proof_event_mastery_update ON proof_events;

-- Create trigger to update mastery when proof_events change
CREATE TRIGGER proof_event_mastery_update
AFTER INSERT OR UPDATE ON proof_events
FOR EACH ROW
EXECUTE FUNCTION update_topic_mastery();

-- ============================================
-- PART 4: Backfill Existing Topics
-- ============================================

-- Calculate mastery for all existing topics
UPDATE study_topics
SET mastery_score = calculate_topic_mastery(id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check mastery scores
-- SELECT title, mastery_score FROM study_topics ORDER BY mastery_score DESC;

-- Check mastery distribution
-- SELECT 
--   CASE 
--     WHEN mastery_score < 30 THEN 'Learning (0-30%)'
--     WHEN mastery_score < 70 THEN 'Developing (30-70%)'
--     ELSE 'Mastered (70-100%)'
--   END as mastery_level,
--   COUNT(*) as topic_count
-- FROM study_topics
-- GROUP BY mastery_level;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- DROP TRIGGER IF EXISTS proof_event_mastery_update ON proof_events;
-- DROP FUNCTION IF EXISTS update_topic_mastery();
-- DROP FUNCTION IF EXISTS calculate_topic_mastery(UUID);
-- ALTER TABLE study_topics DROP COLUMN IF EXISTS mastery_score;

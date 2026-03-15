-- ============================================
-- Add last_studied_at column to study_topics
-- Tracks when a student last studied a topic
-- ============================================

-- Add column (nullable, no default — existing rows stay NULL until studied)
ALTER TABLE public.study_topics
  ADD COLUMN IF NOT EXISTS last_studied_at timestamptz;

-- Index for decay queries (ORDER BY last_studied_at ASC)
CREATE INDEX IF NOT EXISTS idx_study_topics_last_studied_at
  ON public.study_topics (last_studied_at ASC NULLS FIRST);

COMMENT ON COLUMN public.study_topics.last_studied_at
  IS 'Timestamp of the last chat session created for this topic';

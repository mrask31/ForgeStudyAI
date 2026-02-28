-- ============================================
-- VAULT PHASE 4.2: VAULT SESSIONS TABLE
-- ============================================
-- Creates vault_sessions table for tracking review sessions

CREATE TABLE IF NOT EXISTS vault_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  
  -- Session configuration
  topic_ids UUID[] NOT NULL,
  batch_size INTEGER NOT NULL CHECK (batch_size >= 1 AND batch_size <= 5),
  
  -- Session state
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  current_topic_index INTEGER DEFAULT 0,
  
  -- Results tracking
  topics_passed INTEGER DEFAULT 0,
  topics_failed INTEGER DEFAULT 0,
  
  -- Transcript (for debugging/analytics)
  transcript JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
  CONSTRAINT valid_batch_size CHECK (array_length(topic_ids, 1) = batch_size),
  CONSTRAINT completion_requires_timestamp CHECK (
    (status = 'IN_PROGRESS' AND completed_at IS NULL) OR
    (status IN ('COMPLETED', 'ABANDONED') AND completed_at IS NOT NULL)
  )
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_vault_sessions_user_created 
ON vault_sessions(user_id, created_at DESC);

CREATE INDEX idx_vault_sessions_status 
ON vault_sessions(status);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE vault_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own vault sessions"
  ON vault_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE vault_sessions IS 
'Tracks Vault review sessions with batch processing and results';

COMMENT ON COLUMN vault_sessions.topic_ids IS 
'Array of Ghost Node topic UUIDs to review in this session (max 5)';

COMMENT ON COLUMN vault_sessions.transcript IS 
'JSONB array of {topic_id, question, answer, passed, timestamp} for analytics';;

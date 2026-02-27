-- Logic Loom Synthesis Engine: Database Tables and RLS Policies
-- Sprint 1: Phase 1 - Database Foundation
-- Creates topic_edges and loom_sessions tables with security policies

-- ============================================================================
-- TABLE: topic_edges
-- Stores proven connections between mastered concepts from synthesis sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS topic_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_topic_id UUID NOT NULL REFERENCES study_topics(id) ON DELETE CASCADE,
  target_topic_id UUID NOT NULL REFERENCES study_topics(id) ON DELETE CASCADE,
  loom_session_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: No self-loops (a topic cannot connect to itself)
  CONSTRAINT no_self_loops CHECK (source_topic_id != target_topic_id),
  
  -- Constraint: Unique edge per session (prevent duplicate connections)
  CONSTRAINT unique_edge_per_session UNIQUE (user_id, source_topic_id, target_topic_id, loom_session_id)
);

-- Indexes for performance
CREATE INDEX idx_topic_edges_user_id ON topic_edges(user_id);
CREATE INDEX idx_topic_edges_source_topic_id ON topic_edges(source_topic_id);
CREATE INDEX idx_topic_edges_target_topic_id ON topic_edges(target_topic_id);
CREATE INDEX idx_topic_edges_loom_session_id ON topic_edges(loom_session_id);

-- Row Level Security: Users can only access their own edges
ALTER TABLE topic_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own topic edges"
  ON topic_edges
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TABLE: loom_sessions
-- Stores synthesis sessions with transcripts and cryptographic proofs
-- ============================================================================

CREATE TABLE IF NOT EXISTS loom_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_topic_ids UUID[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'SPARRING',
  final_outline TEXT,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  cryptographic_proof TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Constraint: Status must be valid
  CONSTRAINT valid_status CHECK (status IN ('SPARRING', 'THESIS_ACHIEVED')),
  
  -- Constraint: Constellation size must be 2-4 nodes (The "Overload" Constraint)
  CONSTRAINT valid_constellation_size CHECK (
    array_length(selected_topic_ids, 1) >= 2 AND 
    array_length(selected_topic_ids, 1) <= 4
  ),
  
  -- Constraint: Thesis completion requires proof and outline
  CONSTRAINT thesis_requires_proof CHECK (
    (status = 'SPARRING' AND final_outline IS NULL AND cryptographic_proof IS NULL AND completed_at IS NULL) OR
    (status = 'THESIS_ACHIEVED' AND final_outline IS NOT NULL AND cryptographic_proof IS NOT NULL AND completed_at IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_loom_sessions_user_created ON loom_sessions(user_id, created_at DESC);
CREATE INDEX idx_loom_sessions_status ON loom_sessions(status);

-- Row Level Security: Users can only access their own sessions
ALTER TABLE loom_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own loom sessions"
  ON loom_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- COMMENTS: Documentation for future developers
-- ============================================================================

COMMENT ON TABLE topic_edges IS 'Stores proven connections between mastered concepts discovered through Logic Loom synthesis sessions';
COMMENT ON TABLE loom_sessions IS 'Stores synthesis sessions with Socratic dialogue transcripts and cryptographic proofs of original thinking';

COMMENT ON COLUMN topic_edges.source_topic_id IS 'First concept in the connection (order does not imply directionality)';
COMMENT ON COLUMN topic_edges.target_topic_id IS 'Second concept in the connection (order does not imply directionality)';
COMMENT ON COLUMN topic_edges.loom_session_id IS 'References the synthesis session where this connection was proven';

COMMENT ON COLUMN loom_sessions.selected_topic_ids IS 'Array of 2-4 mastered topic UUIDs forming the constellation';
COMMENT ON COLUMN loom_sessions.status IS 'Session state: SPARRING (active dialogue) or THESIS_ACHIEVED (synthesis complete)';
COMMENT ON COLUMN loom_sessions.transcript IS 'JSONB array of {role: "student"|"ai", content: string, timestamp: ISO8601} messages';
COMMENT ON COLUMN loom_sessions.cryptographic_proof IS 'Clinical audit document proving how student arrived at original synthesis';
COMMENT ON COLUMN loom_sessions.final_outline IS 'Essay outline with crystallized threads (Roman numeral format)';

COMMENT ON CONSTRAINT valid_constellation_size ON loom_sessions IS 'Enforces The "Overload" Constraint: Maximum 4 nodes per constellation to prevent context window overflow';
COMMENT ON CONSTRAINT no_self_loops ON topic_edges IS 'Prevents a topic from connecting to itself (mathematically invalid)';
COMMENT ON CONSTRAINT thesis_requires_proof ON loom_sessions IS 'Ensures completed sessions have all required artifacts (outline, proof, timestamp)';

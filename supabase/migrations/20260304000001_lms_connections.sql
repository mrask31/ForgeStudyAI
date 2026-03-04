-- Migration: LMS Connections Table
-- Description: Stores parent-authorized LMS connections (Canvas, Google Classroom)
-- Requirements: 2.1, 2.2, 2.3, 6.2

CREATE TYPE lms_provider AS ENUM ('canvas', 'google_classroom');
CREATE TYPE lms_connection_status AS ENUM ('active', 'blocked', 'disconnected', 'expired');

CREATE TABLE lms_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  provider lms_provider NOT NULL,
  status lms_connection_status NOT NULL DEFAULT 'active',
  encrypted_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  failure_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  authorized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  authorized_by UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_student_provider UNIQUE (student_id, provider),
  CONSTRAINT valid_failure_count CHECK (failure_count >= 0)
);

-- Indexes for performance
CREATE INDEX idx_lms_connections_student_id ON lms_connections(student_id);
CREATE INDEX idx_lms_connections_parent_id ON lms_connections(parent_id);
CREATE INDEX idx_lms_connections_status ON lms_connections(status);
CREATE INDEX idx_lms_connections_last_sync_at ON lms_connections(last_sync_at);
CREATE INDEX idx_lms_connections_provider ON lms_connections(provider);

-- RLS Policies
ALTER TABLE lms_connections ENABLE ROW LEVEL SECURITY;

-- Parents can view and manage connections for their students
CREATE POLICY "Parents can view their students' LMS connections"
  ON lms_connections FOR SELECT
  USING (
    parent_id = auth.uid()
  );

CREATE POLICY "Parents can create LMS connections for their students"
  ON lms_connections FOR INSERT
  WITH CHECK (
    parent_id = auth.uid() AND authorized_by = auth.uid()
  );

CREATE POLICY "Parents can update their students' LMS connections"
  ON lms_connections FOR UPDATE
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can delete their students' LMS connections"
  ON lms_connections FOR DELETE
  USING (parent_id = auth.uid());

-- Students can view their own connections (read-only)
CREATE POLICY "Students can view their own LMS connections"
  ON lms_connections FOR SELECT
  USING (student_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_lms_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lms_connections_updated_at
  BEFORE UPDATE ON lms_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_lms_connections_updated_at();

-- Comments
COMMENT ON TABLE lms_connections IS 'Stores parent-authorized LMS connections for Canvas and Google Classroom';
COMMENT ON COLUMN lms_connections.encrypted_token IS 'AES-256-GCM encrypted PAT or OAuth refresh token';
COMMENT ON COLUMN lms_connections.failure_count IS 'Incremented on sync failures, reset on success. Connection marked blocked after 5 failures';
COMMENT ON COLUMN lms_connections.metadata IS 'Stores provider-specific data like Canvas instance URL or Google OAuth scopes';

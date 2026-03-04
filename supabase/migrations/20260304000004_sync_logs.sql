-- Migration: Sync Logs Table
-- Description: Stores detailed logs of all sync operations for debugging and monitoring
-- Requirements: 3.4, 3.5, 4.4, 4.5

CREATE TYPE sync_trigger_type AS ENUM ('login', 'batch', 'manual', 'retry');
CREATE TYPE sync_log_status AS ENUM ('success', 'partial', 'failed', 'blocked');

CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lms_connection_id UUID NOT NULL REFERENCES lms_connections(id) ON DELETE CASCADE,
  sync_trigger sync_trigger_type NOT NULL,
  sync_status sync_log_status NOT NULL,
  assignments_found INTEGER NOT NULL DEFAULT 0,
  assignments_downloaded INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  sync_duration_ms INTEGER,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_assignments_found CHECK (assignments_found >= 0),
  CONSTRAINT valid_assignments_downloaded CHECK (assignments_downloaded >= 0),
  CONSTRAINT valid_download_count CHECK (assignments_downloaded <= assignments_found),
  CONSTRAINT valid_sync_duration CHECK (sync_duration_ms IS NULL OR sync_duration_ms >= 0)
);

-- Indexes for performance
CREATE INDEX idx_sync_logs_lms_connection_id ON sync_logs(lms_connection_id);
CREATE INDEX idx_sync_logs_synced_at ON sync_logs(synced_at DESC);
CREATE INDEX idx_sync_logs_sync_status ON sync_logs(sync_status);
CREATE INDEX idx_sync_logs_sync_trigger ON sync_logs(sync_trigger);

-- RLS Policies
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Parents can view sync logs for their students' connections
CREATE POLICY "Parents can view sync logs for their students"
  ON sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lms_connections lc
      WHERE lc.id = sync_logs.lms_connection_id
      AND lc.parent_id = auth.uid()
    )
  );

-- Students can view sync logs for their own connections
CREATE POLICY "Students can view their own sync logs"
  ON sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lms_connections lc
      WHERE lc.id = sync_logs.lms_connection_id
      AND lc.student_id = auth.uid()
    )
  );

-- System can insert sync logs (service role only)
CREATE POLICY "Service role can create sync logs"
  ON sync_logs FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Comments
COMMENT ON TABLE sync_logs IS 'Stores detailed logs of all LMS sync operations';
COMMENT ON COLUMN sync_logs.sync_trigger IS 'What triggered this sync: login, batch (3AM), manual, or retry';
COMMENT ON COLUMN sync_logs.assignments_found IS 'Total number of assignments found in LMS';
COMMENT ON COLUMN sync_logs.assignments_downloaded IS 'Number of assignments successfully downloaded';
COMMENT ON COLUMN sync_logs.error_message IS 'Error details if sync failed or was blocked';
COMMENT ON COLUMN sync_logs.sync_duration_ms IS 'Time taken for sync operation in milliseconds';

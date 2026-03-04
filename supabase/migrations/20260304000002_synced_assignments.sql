-- Migration: Synced Assignments Table
-- Description: Stores assignments retrieved from Canvas and Google Classroom
-- Requirements: 3.1, 3.7, 4.1, 4.7, 8.1

CREATE TYPE assignment_sync_status AS ENUM ('pending', 'downloading', 'completed', 'failed');

CREATE TABLE synced_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lms_connection_id UUID NOT NULL REFERENCES lms_connections(id) ON DELETE CASCADE,
  lms_assignment_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  course_name TEXT NOT NULL,
  course_id TEXT NOT NULL,
  attachment_urls JSONB DEFAULT '[]'::jsonb,
  downloaded_files JSONB DEFAULT '[]'::jsonb,
  sync_status assignment_sync_status NOT NULL DEFAULT 'pending',
  manual_upload_id UUID REFERENCES manual_uploads(id) ON DELETE SET NULL,
  is_merged BOOLEAN NOT NULL DEFAULT FALSE,
  first_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_lms_assignment UNIQUE (lms_connection_id, lms_assignment_id),
  CONSTRAINT valid_title CHECK (LENGTH(title) > 0)
);

-- Indexes for performance
CREATE INDEX idx_synced_assignments_student_id ON synced_assignments(student_id);
CREATE INDEX idx_synced_assignments_lms_connection_id ON synced_assignments(lms_connection_id);
CREATE INDEX idx_synced_assignments_due_date ON synced_assignments(due_date);
CREATE INDEX idx_synced_assignments_is_merged ON synced_assignments(is_merged);
CREATE INDEX idx_synced_assignments_sync_status ON synced_assignments(sync_status);
CREATE INDEX idx_synced_assignments_course_id ON synced_assignments(course_id);

-- RLS Policies
ALTER TABLE synced_assignments ENABLE ROW LEVEL SECURITY;

-- Students can view their own synced assignments
CREATE POLICY "Students can view their own synced assignments"
  ON synced_assignments FOR SELECT
  USING (student_id = auth.uid());

-- Parents can view their students' synced assignments
CREATE POLICY "Parents can view their students' synced assignments"
  ON synced_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lms_connections lc
      WHERE lc.id = synced_assignments.lms_connection_id
      AND lc.parent_id = auth.uid()
    )
  );

-- System can insert/update synced assignments (service role only)
CREATE POLICY "Service role can manage synced assignments"
  ON synced_assignments FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_synced_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER synced_assignments_updated_at
  BEFORE UPDATE ON synced_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_synced_assignments_updated_at();

-- Comments
COMMENT ON TABLE synced_assignments IS 'Stores assignments synced from Canvas and Google Classroom';
COMMENT ON COLUMN synced_assignments.lms_assignment_id IS 'Provider-specific assignment ID (Canvas assignment ID or Google Classroom coursework ID)';
COMMENT ON COLUMN synced_assignments.attachment_urls IS 'Array of original attachment URLs from LMS';
COMMENT ON COLUMN synced_assignments.downloaded_files IS 'Array of downloaded file paths in our storage';
COMMENT ON COLUMN synced_assignments.manual_upload_id IS 'Links to manual_uploads if this assignment was matched with a manual upload';
COMMENT ON COLUMN synced_assignments.is_merged IS 'TRUE if this assignment has been merged with a manual upload';

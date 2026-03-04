-- Migration: Manual Uploads Table
-- Description: Stores manually uploaded assignments (Dual-Intake Architecture fallback)
-- Requirements: 5.6, 5.8, 8.2

CREATE TABLE manual_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  title TEXT,
  due_date TIMESTAMPTZ,
  synced_assignment_id UUID REFERENCES synced_assignments(id) ON DELETE SET NULL,
  is_merged BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_file_size CHECK (file_size > 0),
  CONSTRAINT valid_filename CHECK (LENGTH(original_filename) > 0)
);

-- Indexes for performance
CREATE INDEX idx_manual_uploads_student_id ON manual_uploads(student_id);
CREATE INDEX idx_manual_uploads_is_merged ON manual_uploads(is_merged);
CREATE INDEX idx_manual_uploads_uploaded_at ON manual_uploads(uploaded_at);
CREATE INDEX idx_manual_uploads_due_date ON manual_uploads(due_date);

-- RLS Policies
ALTER TABLE manual_uploads ENABLE ROW LEVEL SECURITY;

-- Students can view their own manual uploads
CREATE POLICY "Students can view their own manual uploads"
  ON manual_uploads FOR SELECT
  USING (student_id = auth.uid());

-- Students can create their own manual uploads
CREATE POLICY "Students can create their own manual uploads"
  ON manual_uploads FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Students can update their own manual uploads
CREATE POLICY "Students can update their own manual uploads"
  ON manual_uploads FOR UPDATE
  USING (student_id = auth.uid());

-- Students can delete their own manual uploads
CREATE POLICY "Students can delete their own manual uploads"
  ON manual_uploads FOR DELETE
  USING (student_id = auth.uid());

-- Parents can view their students' manual uploads
CREATE POLICY "Parents can view their students' manual uploads"
  ON manual_uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN parents p ON p.id = s.parent_id
      WHERE s.id = manual_uploads.student_id
      AND p.id = auth.uid()
    )
  );

-- System can update manual uploads for merging (service role only)
CREATE POLICY "Service role can update manual uploads"
  ON manual_uploads FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_manual_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER manual_uploads_updated_at
  BEFORE UPDATE ON manual_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_manual_uploads_updated_at();

-- Comments
COMMENT ON TABLE manual_uploads IS 'Stores manually uploaded assignments (Dual-Intake Architecture fallback)';
COMMENT ON COLUMN manual_uploads.file_path IS 'Path to file in Supabase Storage';
COMMENT ON COLUMN manual_uploads.synced_assignment_id IS 'Links to synced_assignments if this upload was matched with a synced assignment';
COMMENT ON COLUMN manual_uploads.is_merged IS 'TRUE if this upload has been merged with a synced assignment';
COMMENT ON COLUMN manual_uploads.title IS 'Optional title extracted from file or provided by student';
COMMENT ON COLUMN manual_uploads.due_date IS 'Optional due date provided by student';

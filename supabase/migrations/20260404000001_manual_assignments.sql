-- Manual Assignments: student-entered assignments (not LMS-synced)
CREATE TABLE manual_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  course_name TEXT,
  due_date TIMESTAMPTZ,
  notes TEXT,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT manual_assignments_title_check CHECK (LENGTH(TRIM(title)) > 0)
);

CREATE INDEX idx_manual_assignments_profile_id ON manual_assignments(profile_id);
CREATE INDEX idx_manual_assignments_due_date ON manual_assignments(due_date);

ALTER TABLE manual_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage their own manual assignments"
  ON manual_assignments FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE OR REPLACE FUNCTION update_manual_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER manual_assignments_updated_at
  BEFORE UPDATE ON manual_assignments
  FOR EACH ROW EXECUTE FUNCTION update_manual_assignments_updated_at();

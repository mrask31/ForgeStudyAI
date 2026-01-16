-- ============================================
-- STUDENT CLASSES TABLE
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS student_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fundamentals', 'med_surg', 'pharm', 'peds', 'ob', 'psych', 'other')),
  start_date DATE,
  end_date DATE,
  next_exam_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_classes_user_id ON student_classes(user_id);
CREATE INDEX IF NOT EXISTS idx_student_classes_type ON student_classes(type);
CREATE INDEX IF NOT EXISTS idx_student_classes_created_at ON student_classes(created_at DESC);

ALTER TABLE student_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own classes" ON student_classes;
CREATE POLICY "Users can view their own classes"
  ON student_classes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own classes" ON student_classes;
CREATE POLICY "Users can create their own classes"
  ON student_classes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own classes" ON student_classes;
CREATE POLICY "Users can update their own classes"
  ON student_classes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own classes" ON student_classes;
CREATE POLICY "Users can delete their own classes"
  ON student_classes FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_student_classes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_student_classes_updated_at ON student_classes;
CREATE TRIGGER set_student_classes_updated_at
  BEFORE UPDATE ON student_classes
  FOR EACH ROW
  EXECUTE FUNCTION update_student_classes_updated_at();

-- ============================================
-- Verification
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'student_classes';
-- ============================================

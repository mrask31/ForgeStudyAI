-- Academic Portfolio System
-- Captures learning moments, insights, and essay ideas from tutor sessions

CREATE TABLE IF NOT EXISTS portfolio_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES student_profiles(id) ON DELETE CASCADE,
  type text CHECK (type IN ('insight', 'essay_idea', 'achievement', 'strength')),
  title text NOT NULL,
  content text,
  course_id uuid REFERENCES student_classes(id),
  session_id uuid,
  created_at timestamptz DEFAULT now(),
  is_pinned boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_portfolio_entries_profile_id ON portfolio_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_entries_type ON portfolio_entries(type);
CREATE INDEX IF NOT EXISTS idx_portfolio_entries_created_at ON portfolio_entries(created_at DESC);

ALTER TABLE portfolio_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own portfolio" ON portfolio_entries
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM student_profiles WHERE owner_id = auth.uid()
    )
  );

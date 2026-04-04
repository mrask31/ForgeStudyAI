-- Mastery Score System
-- Tracks per-subject mastery scores and post-session quiz results

-- Mastery scores per subject (linked to student_classes)
CREATE TABLE IF NOT EXISTS mastery_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES student_profiles(id) ON DELETE CASCADE,
  class_id uuid REFERENCES student_classes(id) ON DELETE CASCADE,
  score integer DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  sessions_count integer DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(profile_id, class_id)
);

-- Mastery check results (the 3-question quiz after sessions)
CREATE TABLE IF NOT EXISTS mastery_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES student_profiles(id) ON DELETE CASCADE,
  class_id uuid REFERENCES student_classes(id) ON DELETE CASCADE,
  session_id uuid,
  questions jsonb,
  score_delta integer,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mastery_scores_profile_id ON mastery_scores(profile_id);
CREATE INDEX IF NOT EXISTS idx_mastery_scores_class_id ON mastery_scores(class_id);
CREATE INDEX IF NOT EXISTS idx_mastery_checks_profile_id ON mastery_checks(profile_id);
CREATE INDEX IF NOT EXISTS idx_mastery_checks_session_id ON mastery_checks(session_id);

-- RLS
ALTER TABLE mastery_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mastery scores" ON mastery_scores
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM student_profiles WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own mastery checks" ON mastery_checks
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM student_profiles WHERE owner_id = auth.uid()
    )
  );

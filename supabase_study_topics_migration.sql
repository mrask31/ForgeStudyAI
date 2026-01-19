-- ============================================
-- STUDY TOPICS (Grades 6-12)
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS study_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  grade_band TEXT NOT NULL CHECK (grade_band IN ('middle', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_topics_profile_id ON study_topics(profile_id);
CREATE INDEX IF NOT EXISTS idx_study_topics_created_at ON study_topics(created_at DESC);

CREATE TABLE IF NOT EXISTS study_topic_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES study_topics(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('chat', 'map', 'exam', 'practice', 'custom')),
  item_ref TEXT,
  source_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_topic_items_topic_id ON study_topic_items(topic_id);
CREATE INDEX IF NOT EXISTS idx_study_topic_items_profile_id ON study_topic_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_study_topic_items_created_at ON study_topic_items(created_at DESC);

ALTER TABLE study_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_topic_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own study topics" ON study_topics;
CREATE POLICY "Users can view their own study topics"
  ON study_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = study_topics.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create their own study topics" ON study_topics;
CREATE POLICY "Users can create their own study topics"
  ON study_topics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = study_topics.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own study topics" ON study_topics;
CREATE POLICY "Users can update their own study topics"
  ON study_topics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = study_topics.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own study topics" ON study_topics;
CREATE POLICY "Users can delete their own study topics"
  ON study_topics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = study_topics.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view their own study topic items" ON study_topic_items;
CREATE POLICY "Users can view their own study topic items"
  ON study_topic_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = study_topic_items.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create their own study topic items" ON study_topic_items;
CREATE POLICY "Users can create their own study topic items"
  ON study_topic_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = study_topic_items.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own study topic items" ON study_topic_items;
CREATE POLICY "Users can update their own study topic items"
  ON study_topic_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = study_topic_items.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own study topic items" ON study_topic_items;
CREATE POLICY "Users can delete their own study topic items"
  ON study_topic_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = study_topic_items.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_study_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_study_topics_updated_at ON study_topics;
CREATE TRIGGER set_study_topics_updated_at
  BEFORE UPDATE ON study_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_study_topics_updated_at();

CREATE OR REPLACE FUNCTION update_study_topic_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_study_topic_items_updated_at ON study_topic_items;
CREATE TRIGGER set_study_topic_items_updated_at
  BEFORE UPDATE ON study_topic_items
  FOR EACH ROW
  EXECUTE FUNCTION update_study_topic_items_updated_at();

-- ============================================
-- Verification
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('study_topics', 'study_topic_items');
-- ============================================

-- ============================================
-- ELEMENTARY LEARNING ENGINES (Grades 3-5)
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Core mission tracking
CREATE TABLE IF NOT EXISTS learning_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('spelling', 'reading', 'homework')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  streak_day INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_missions_daily
  ON learning_missions(profile_id, mode, mission_date);
CREATE INDEX IF NOT EXISTS idx_learning_missions_profile_id ON learning_missions(profile_id);
CREATE INDEX IF NOT EXISTS idx_learning_missions_status ON learning_missions(status);

-- Spelling tables
CREATE TABLE IF NOT EXISTS spelling_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Spelling List',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spelling_lists_profile_id ON spelling_lists(profile_id);

CREATE TABLE IF NOT EXISTS spelling_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES spelling_lists(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  pattern TEXT,
  is_mastered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS spelling_words
  ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES spelling_lists(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_spelling_words_list_id ON spelling_words(list_id);
CREATE INDEX IF NOT EXISTS idx_spelling_words_profile_id ON spelling_words(profile_id);

CREATE TABLE IF NOT EXISTS spelling_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES spelling_lists(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  word_id UUID REFERENCES spelling_words(id) ON DELETE SET NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  missed_count INT NOT NULL DEFAULT 0,
  last_result TEXT CHECK (last_result IN ('correct', 'missed')),
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS spelling_results
  ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES spelling_lists(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_spelling_results_profile_id ON spelling_results(profile_id);
CREATE INDEX IF NOT EXISTS idx_spelling_results_list_id ON spelling_results(list_id);

-- Reading tables
CREATE TABLE IF NOT EXISTS reading_passages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_passages_profile_id ON reading_passages(profile_id);

CREATE TABLE IF NOT EXISTS reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  passage_id UUID REFERENCES reading_passages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_profile_id ON reading_sessions(profile_id);

CREATE TABLE IF NOT EXISTS reading_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES reading_sessions(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL CHECK (check_type IN ('questions', 'summary', 'fluency', 'vocab')),
  score INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_checks_profile_id ON reading_checks(profile_id);
CREATE INDEX IF NOT EXISTS idx_reading_checks_session_id ON reading_checks(session_id);

-- Homework tables
CREATE TABLE IF NOT EXISTS homework_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Tonight’s Homework',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homework_lists_profile_id ON homework_lists(profile_id);

CREATE TABLE IF NOT EXISTS homework_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES homework_lists(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS homework_tasks
  ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES homework_lists(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_homework_tasks_list_id ON homework_tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_homework_tasks_profile_id ON homework_tasks(profile_id);

CREATE TABLE IF NOT EXISTS homework_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES homework_tasks(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homework_steps_task_id ON homework_steps(task_id);
CREATE INDEX IF NOT EXISTS idx_homework_steps_profile_id ON homework_steps(profile_id);

-- RLS
ALTER TABLE learning_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spelling_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE spelling_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE spelling_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_steps ENABLE ROW LEVEL SECURITY;

-- Policies helper: profile ownership
DROP POLICY IF EXISTS "Users can view their missions" ON learning_missions;
CREATE POLICY "Users can view their missions"
  ON learning_missions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = learning_missions.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their missions" ON learning_missions;
CREATE POLICY "Users can manage their missions"
  ON learning_missions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = learning_missions.profile_id
        AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = learning_missions.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

-- Spelling policies
DROP POLICY IF EXISTS "Users can view their spelling lists" ON spelling_lists;
CREATE POLICY "Users can view their spelling lists"
  ON spelling_lists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = spelling_lists.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their spelling lists" ON spelling_lists;
CREATE POLICY "Users can manage their spelling lists"
  ON spelling_lists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = spelling_lists.profile_id
        AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = spelling_lists.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their spelling words" ON spelling_words;
CREATE POLICY "Users can manage their spelling words"
  ON spelling_words FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = spelling_words.profile_id
        AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = spelling_words.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their spelling results" ON spelling_results;
CREATE POLICY "Users can manage their spelling results"
  ON spelling_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = spelling_results.profile_id
        AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = spelling_results.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

-- Reading policies
DROP POLICY IF EXISTS "Users can manage their reading passages" ON reading_passages;
CREATE POLICY "Users can manage their reading passages"
  ON reading_passages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = reading_passages.profile_id
        AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = reading_passages.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their reading sessions" ON reading_sessions;
CREATE POLICY "Users can manage their reading sessions"
  ON reading_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = reading_sessions.profile_id
        AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = reading_sessions.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their reading checks" ON reading_checks;
CREATE POLICY "Users can manage their reading checks"
  ON reading_checks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = reading_checks.profile_id
        AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = reading_checks.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

-- Homework policies
DROP POLICY IF EXISTS "Users can manage their homework lists" ON homework_lists;
CREATE POLICY "Users can manage their homework lists"
  ON homework_lists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = homework_lists.profile_id
        AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = homework_lists.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their homework tasks" ON homework_tasks;
CREATE POLICY "Users can manage their homework tasks"
  ON homework_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = homework_tasks.profile_id
        AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = homework_tasks.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their homework steps" ON homework_steps;
CREATE POLICY "Users can manage their homework steps"
  ON homework_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = homework_steps.profile_id
        AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.id = homework_steps.profile_id
        AND sp.owner_id = auth.uid()
    )
  );

-- Updated_at trigger helpers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_learning_missions_updated_at ON learning_missions;
CREATE TRIGGER set_learning_missions_updated_at
  BEFORE UPDATE ON learning_missions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_spelling_lists_updated_at ON spelling_lists;
CREATE TRIGGER set_spelling_lists_updated_at
  BEFORE UPDATE ON spelling_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_spelling_words_updated_at ON spelling_words;
CREATE TRIGGER set_spelling_words_updated_at
  BEFORE UPDATE ON spelling_words
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_spelling_results_updated_at ON spelling_results;
CREATE TRIGGER set_spelling_results_updated_at
  BEFORE UPDATE ON spelling_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_reading_passages_updated_at ON reading_passages;
CREATE TRIGGER set_reading_passages_updated_at
  BEFORE UPDATE ON reading_passages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_reading_sessions_updated_at ON reading_sessions;
CREATE TRIGGER set_reading_sessions_updated_at
  BEFORE UPDATE ON reading_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_homework_lists_updated_at ON homework_lists;
CREATE TRIGGER set_homework_lists_updated_at
  BEFORE UPDATE ON homework_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_homework_tasks_updated_at ON homework_tasks;
CREATE TRIGGER set_homework_tasks_updated_at
  BEFORE UPDATE ON homework_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Streak System: Add streak tracking columns to student_profiles
-- Tracks current streak, longest streak, and last study date

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS current_streak_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_study_date date;

-- Index for quick streak queries
CREATE INDEX IF NOT EXISTS idx_student_profiles_last_study_date
  ON student_profiles (last_study_date)
  WHERE last_study_date IS NOT NULL;

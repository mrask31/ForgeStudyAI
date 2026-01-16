-- ============================================
-- STUDENT PROFILES TABLE (Netflix-style profiles)
-- ============================================
-- This migration creates a student_profiles table that allows
-- one account (auth.users -> profiles) to have multiple student profiles (up to 4)
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Create student_profiles table
-- Note: owner_id references auth.users.id directly (which matches profiles.id if profiles table exists)
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  grade_band TEXT NOT NULL CHECK (grade_band IN ('elementary', 'middle', 'high')),
  grade TEXT, -- Optional: K-12 grade level
  interests TEXT, -- Optional: interests, hobbies, and likes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_grade CHECK (
    grade IS NULL OR 
    grade ~ '^(K|([1-9]|1[0-2]))$' -- K or 1-12
  )
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_profiles_owner_id ON public.student_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_grade_band ON public.student_profiles(grade_band);

-- Ensure interests column exists on existing tables (idempotent)
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS interests TEXT;

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies (idempotent - drop if exists first)
-- Policy: Users can only see their own student profiles
DROP POLICY IF EXISTS "Users can view their own student profiles" ON public.student_profiles;
CREATE POLICY "Users can view their own student profiles"
  ON public.student_profiles
  FOR SELECT
  USING (owner_id = auth.uid());

-- Policy: Users can insert their own student profiles
DROP POLICY IF EXISTS "Users can create their own student profiles" ON public.student_profiles;
CREATE POLICY "Users can create their own student profiles"
  ON public.student_profiles
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Policy: Users can update their own student profiles
DROP POLICY IF EXISTS "Users can update their own student profiles" ON public.student_profiles;
CREATE POLICY "Users can update their own student profiles"
  ON public.student_profiles
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy: Users can delete their own student profiles
DROP POLICY IF EXISTS "Users can delete their own student profiles" ON public.student_profiles;
CREATE POLICY "Users can delete their own student profiles"
  ON public.student_profiles
  FOR DELETE
  USING (owner_id = auth.uid());

-- 5. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS set_student_profiles_updated_at ON public.student_profiles;
CREATE TRIGGER set_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_student_profiles_updated_at();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration:
--
-- Check table exists:
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'student_profiles';
--
-- Check columns:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'student_profiles'
-- ORDER BY ordinal_position;
--
-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'student_profiles';
--
-- Check policies:
-- SELECT policyname FROM pg_policies WHERE tablename = 'student_profiles';

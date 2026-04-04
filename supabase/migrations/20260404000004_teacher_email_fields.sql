-- Add teacher email fields for weekly summary CC
-- These go on the parent-level profiles table, not student_profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_email text,
  ADD COLUMN IF NOT EXISTS teacher_name text;

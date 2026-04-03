-- Phase 2: Add interests array column to base profiles table
-- The student_profiles table already has interests TEXT (comma-separated).
-- This migration adds interests text[] to the base profiles table for future use.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';

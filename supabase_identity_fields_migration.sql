-- ============================================
-- ADD IDENTITY FIELDS TO PROFILES TABLE
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Add identity fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_name TEXT,
ADD COLUMN IF NOT EXISTS program_track TEXT,
ADD COLUMN IF NOT EXISTS school_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN profiles.preferred_name IS 'User preferred name (e.g., "Michael R.")';
COMMENT ON COLUMN profiles.program_track IS 'Nursing program track (RN Track, ADN, BSN, LPN, Other)';
COMMENT ON COLUMN profiles.school_name IS 'School name (optional)';


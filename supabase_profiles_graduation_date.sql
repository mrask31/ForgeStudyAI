-- ============================================
-- ADD GRADUATION DATE TO PROFILES TABLE
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Add graduation_date column to profiles table (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'graduation_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN graduation_date DATE;
    
    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS idx_profiles_graduation_date ON profiles(graduation_date);
    
    RAISE NOTICE 'Column graduation_date added to profiles table';
  ELSE
    RAISE NOTICE 'Column graduation_date already exists';
  END IF;
END $$;


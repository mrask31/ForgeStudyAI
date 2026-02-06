-- ============================================
-- Add onboarding fields to profiles table
-- ============================================
-- This migration adds onboarding tracking fields to the profiles table
-- to support the ForgeNursing-style auth flow.

-- 1. Add onboarding_completed column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    RAISE NOTICE 'Column onboarding_completed added to profiles table';
  ELSE
    RAISE NOTICE 'Column onboarding_completed already exists';
  END IF;
END $$;

-- 2. Add onboarding_step column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'onboarding_step'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_step INTEGER DEFAULT 0;
    RAISE NOTICE 'Column onboarding_step added to profiles table';
  ELSE
    RAISE NOTICE 'Column onboarding_step already exists';
  END IF;
END $$;

-- 3. Create index for onboarding queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding 
ON profiles(onboarding_completed, onboarding_step);

-- 4. Update existing profiles to have default onboarding values
UPDATE profiles 
SET 
  onboarding_completed = COALESCE(onboarding_completed, false),
  onboarding_step = COALESCE(onboarding_step, 0)
WHERE onboarding_completed IS NULL OR onboarding_step IS NULL;

-- 5. Verify the changes
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name IN ('onboarding_completed', 'onboarding_step', 'subscription_status');

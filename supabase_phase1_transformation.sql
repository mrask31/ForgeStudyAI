-- ============================================
-- FORGESTUDY TRANSFORMATION PHASE 1 MIGRATION
-- ============================================
-- This migration adds:
-- 1. trial_ends_at to profiles (7-day no-CC trial)
-- 2. Ensures interests field exists in student_profiles (hobby analogies)
-- 3. Updates handle_new_user() to set trial automatically
-- 4. Adds helper functions for trial status checking
--
-- SAFE TO RUN: All operations are idempotent (can run multiple times)
-- ============================================

-- ============================================
-- PART 1: Add trial_ends_at to profiles table
-- ============================================

DO $$
BEGIN
  -- Add trial_ends_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE;
    
    -- Create index for fast trial status queries
    CREATE INDEX idx_profiles_trial_ends_at 
    ON public.profiles(trial_ends_at) 
    WHERE trial_ends_at IS NOT NULL;
    
    RAISE NOTICE 'Column trial_ends_at added to profiles table';
  ELSE
    RAISE NOTICE 'Column trial_ends_at already exists';
  END IF;
END $$;

-- ============================================
-- PART 2: Ensure interests field exists in student_profiles
-- ============================================

DO $$
BEGIN
  -- Add interests column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_profiles' AND column_name = 'interests'
  ) THEN
    ALTER TABLE public.student_profiles 
    ADD COLUMN interests TEXT;
    
    RAISE NOTICE 'Column interests added to student_profiles table';
  ELSE
    RAISE NOTICE 'Column interests already exists';
  END IF;
END $$;

-- ============================================
-- PART 3: Update handle_new_user() function
-- ============================================
-- This function now sets trial_ends_at automatically on signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    subscription_status, 
    trial_ends_at
  )
  VALUES (
    NEW.id, 
    'trialing',  -- Changed from 'pending_payment'
    NOW() + INTERVAL '7 days'  -- Auto-set 7-day trial
  )
  ON CONFLICT (id) DO UPDATE SET 
    subscription_status = COALESCE(profiles.subscription_status, 'trialing'),
    trial_ends_at = COALESCE(profiles.trial_ends_at, NOW() + INTERVAL '7 days');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PART 4: Helper function to check trial status
-- ============================================

CREATE OR REPLACE FUNCTION public.is_trial_active(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT trial_ends_at INTO trial_end
  FROM public.profiles
  WHERE id = user_id;
  
  -- Trial is active if trial_ends_at exists and is in the future
  RETURN trial_end IS NOT NULL AND trial_end > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 5: Helper function to get days left in trial
-- ============================================

CREATE OR REPLACE FUNCTION public.get_trial_days_left(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  trial_end TIMESTAMP WITH TIME ZONE;
  days_left INTEGER;
BEGIN
  SELECT trial_ends_at INTO trial_end
  FROM public.profiles
  WHERE id = user_id;
  
  IF trial_end IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate days left (ceiling to always show at least 1 day if trial active)
  days_left := CEIL(EXTRACT(EPOCH FROM (trial_end - NOW())) / 86400);
  
  -- Return 0 if negative (trial expired)
  RETURN GREATEST(days_left, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 6: Update existing users (OPTIONAL)
-- ============================================
-- This section is commented out by default.
-- Uncomment if you want to give existing users a 7-day trial.

-- UPDATE public.profiles
-- SET 
--   subscription_status = 'trialing',
--   trial_ends_at = NOW() + INTERVAL '7 days'
-- WHERE 
--   subscription_status = 'pending_payment'
--   AND trial_ends_at IS NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration worked:

-- 1. Check trial_ends_at column exists:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'trial_ends_at';

-- 2. Check interests column exists:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'student_profiles' AND column_name = 'interests';

-- 3. Test helper functions:
-- SELECT public.is_trial_active(auth.uid());
-- SELECT public.get_trial_days_left(auth.uid());

-- 4. Check indexes:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'profiles' AND indexname LIKE '%trial%';

-- 5. View current trial status for all users:
-- SELECT 
--   id,
--   subscription_status,
--   trial_ends_at,
--   public.is_trial_active(id) as is_active,
--   public.get_trial_days_left(id) as days_left
-- FROM public.profiles
-- WHERE trial_ends_at IS NOT NULL
-- ORDER BY trial_ends_at DESC;

-- ============================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================
-- If you need to rollback this migration:
--
-- 1. Drop helper functions:
-- DROP FUNCTION IF EXISTS public.is_trial_active(UUID);
-- DROP FUNCTION IF EXISTS public.get_trial_days_left(UUID);
--
-- 2. Revert handle_new_user() to original:
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO public.profiles (id, subscription_status)
--   VALUES (NEW.id, 'pending_payment')
--   ON CONFLICT (id) DO UPDATE SET subscription_status = COALESCE(profiles.subscription_status, 'pending_payment');
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- 3. (Optional) Remove trial_ends_at column:
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS trial_ends_at;
--
-- 4. (Optional) Remove interests column:
-- ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS interests;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Update middleware.ts to check is_trial_active()
-- 2. Update auth callback to handle 'trialing' status
-- 3. Add TrialCountdown UI component
-- 4. Update onboarding form to capture interests
-- 5. Update system prompts to use hobby analogies
-- ============================================

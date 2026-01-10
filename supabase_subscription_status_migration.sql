-- ============================================
-- SUBSCRIPTION STATUS TRACKING FOR PROFILES
-- ============================================
-- This migration adds subscription status tracking to prevent
-- unpaid users from accessing the application
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Add subscription_status column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_status TEXT DEFAULT 'pending_payment';
    -- Values: 'pending_payment', 'trialing', 'active', 'past_due', 'canceled', 'deleted'
    
    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
    
    RAISE NOTICE 'Column subscription_status added to profiles table';
  ELSE
    RAISE NOTICE 'Column subscription_status already exists';
  END IF;
END $$;

-- 2. Add stripe_customer_id column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
    
    -- Create unique index (each Stripe customer should map to one profile)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
    
    RAISE NOTICE 'Column stripe_customer_id added to profiles table';
  ELSE
    RAISE NOTICE 'Column stripe_customer_id already exists';
  END IF;
END $$;

-- 3. Add stripe_subscription_id column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_subscription_id TEXT;
    
    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
    
    RAISE NOTICE 'Column stripe_subscription_id added to profiles table';
  ELSE
    RAISE NOTICE 'Column stripe_subscription_id already exists';
  END IF;
END $$;

-- 4. Update existing profiles to have 'pending_payment' status if null
UPDATE profiles 
SET subscription_status = 'pending_payment' 
WHERE subscription_status IS NULL;

-- 5. Create or replace function to handle new user profile creation
-- This ensures new profiles always have the correct subscription_status
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, subscription_status)
  VALUES (NEW.id, 'pending_payment')
  ON CONFLICT (id) DO UPDATE SET subscription_status = COALESCE(profiles.subscription_status, 'pending_payment');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration:
--
-- Check columns exist:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name IN ('subscription_status', 'stripe_customer_id', 'stripe_subscription_id');
--
-- Check indexes:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'profiles' 
-- AND indexname LIKE '%subscription%' OR indexname LIKE '%stripe%';
-- ============================================


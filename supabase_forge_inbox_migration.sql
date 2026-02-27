-- ============================================
-- FORGE INBOX MIGRATION
-- ============================================
-- Adds email ingestion capability to student profiles
-- Each student gets a unique inbox email address
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Add inbox_email column to student_profiles
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS inbox_email TEXT UNIQUE;

-- 2. Create index for fast lookup by email
CREATE INDEX IF NOT EXISTS idx_student_profiles_inbox_email 
  ON public.student_profiles(inbox_email);

-- 3. Create function to generate unique inbox email
CREATE OR REPLACE FUNCTION generate_inbox_email()
RETURNS TEXT AS $$
DECLARE
  random_id TEXT;
  email_address TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate random 8-character ID (alphanumeric, lowercase)
    random_id := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    email_address := random_id || '@inbound.postmarkapp.com';
    
    -- Check if this email already exists
    SELECT COUNT(*) INTO exists_check
    FROM public.student_profiles
    WHERE inbox_email = email_address;
    
    -- If unique, return it
    IF exists_check = 0 THEN
      RETURN email_address;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to auto-generate inbox email on profile creation
CREATE OR REPLACE FUNCTION set_inbox_email_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set if inbox_email is NULL
  IF NEW.inbox_email IS NULL THEN
    NEW.inbox_email := generate_inbox_email();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_inbox_email ON public.student_profiles;
CREATE TRIGGER trigger_set_inbox_email
  BEFORE INSERT ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_inbox_email_on_insert();

-- 5. Backfill existing student profiles with inbox emails
UPDATE public.student_profiles
SET inbox_email = generate_inbox_email()
WHERE inbox_email IS NULL;

-- 6. Add new source_type for email ingestion
-- Update the CHECK constraint to include 'email'
ALTER TABLE public.learning_sources
  DROP CONSTRAINT IF EXISTS learning_sources_source_type_check;

ALTER TABLE public.learning_sources
  ADD CONSTRAINT learning_sources_source_type_check
  CHECK (source_type IN ('syllabus', 'weekly', 'photos', 'email', 'other'));

-- 7. Create inbox_logs table for tracking email ingestion
CREATE TABLE IF NOT EXISTS public.inbox_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  from_email TEXT NOT NULL,
  subject TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  attachments_count INTEGER NOT NULL DEFAULT 0,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Create index for inbox_logs
CREATE INDEX IF NOT EXISTS idx_inbox_logs_student_profile_id 
  ON public.inbox_logs(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_inbox_logs_received_at 
  ON public.inbox_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_logs_processing_status 
  ON public.inbox_logs(processing_status);

-- 9. Enable RLS for inbox_logs
ALTER TABLE public.inbox_logs ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for inbox_logs
DROP POLICY IF EXISTS "Users can view their own inbox logs" ON public.inbox_logs;
CREATE POLICY "Users can view their own inbox logs"
  ON public.inbox_logs
  FOR SELECT
  USING (
    student_profile_id IN (
      SELECT id FROM public.student_profiles WHERE owner_id = auth.uid()
    )
  );

-- 11. Add comment for documentation
COMMENT ON COLUMN public.student_profiles.inbox_email IS 'Unique email address for receiving study materials via email (e.g., abc12345@inbound.postmarkapp.com)';
COMMENT ON TABLE public.inbox_logs IS 'Tracks all emails received via Forge Inbox for auditing and debugging';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration worked:

-- Check that all student profiles have inbox emails
-- SELECT id, display_name, inbox_email FROM public.student_profiles;

-- Test the generate function
-- SELECT generate_inbox_email();

-- Check inbox_logs table structure
-- SELECT * FROM public.inbox_logs LIMIT 1;

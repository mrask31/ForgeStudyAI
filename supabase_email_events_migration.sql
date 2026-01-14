-- ============================================
-- EMAIL EVENTS TABLE
-- ============================================
-- This migration creates an email_events table for queuing email notifications
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Create email_events table
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_profile_id UUID REFERENCES public.student_profiles(id) ON DELETE SET NULL,
  template_slug TEXT NOT NULL REFERENCES public.email_templates(slug),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'skipped', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_email_events_user_id_created_at ON public.email_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_status_created_at ON public.email_events(status, created_at);
CREATE INDEX IF NOT EXISTS idx_email_events_template_slug ON public.email_events(template_slug);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies (idempotent - drop if exists first)
-- Policy: Authenticated users can view their own email events
DROP POLICY IF EXISTS "Users can view their own email events" ON public.email_events;
CREATE POLICY "Users can view their own email events"
  ON public.email_events
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Authenticated users can insert their own email events
DROP POLICY IF EXISTS "Users can create their own email events" ON public.email_events;
CREATE POLICY "Users can create their own email events"
  ON public.email_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Note: No UPDATE/DELETE policies for now (client cannot modify events)

-- 5. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION set_email_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS set_email_events_updated_at ON public.email_events;
CREATE TRIGGER set_email_events_updated_at
  BEFORE UPDATE ON public.email_events
  FOR EACH ROW
  EXECUTE FUNCTION set_email_events_updated_at();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration:
--
-- Check table exists:
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'email_events';
--
-- Check columns:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'email_events'
-- ORDER BY ordinal_position;
--
-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'email_events';
--
-- Check policies:
-- SELECT policyname FROM pg_policies WHERE tablename = 'email_events';
-- ============================================

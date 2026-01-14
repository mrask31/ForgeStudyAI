-- ============================================
-- EMAIL TEMPLATES TABLE
-- ============================================
-- This migration creates an email_templates table for storing
-- ForgeStudy parent welcome email templates
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'parent',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Create index for faster queries by slug
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON public.email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_audience ON public.email_templates(audience);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON public.email_templates(is_active);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies (idempotent - drop if exists first)
-- Policy: Authenticated users can read email templates (read-only)
DROP POLICY IF EXISTS "Authenticated users can view email templates" ON public.email_templates;
CREATE POLICY "Authenticated users can view email templates"
  ON public.email_templates
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Note: No INSERT/UPDATE/DELETE policies are created
-- This keeps the table safe until we build an admin path later

-- 5. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS set_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER set_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================
-- SEED DATA: 3 ForgeStudy Welcome Email Templates
-- ============================================

-- Template 1: Welcome (Immediate)
INSERT INTO public.email_templates (slug, name, subject, body_markdown, audience, is_active)
VALUES (
  'welcome-1',
  'Welcome (Immediate)',
  'Welcome to ForgeStudy — let''s make homework easier',
  'Hi {{ParentName}},

Welcome to ForgeStudy!
You''ve taken a step toward calmer evenings and more confident learning.

Your next step is simple:
👉 Create your student''s profile and head to the dashboard.

ForgeStudy is built to teach step-by-step, so students learn how to think — not just what to answer.

We''re glad you''re here.
— The ForgeStudy Team',
  'parent',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_markdown = EXCLUDED.body_markdown,
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- Template 2: Why ForgeStudy (Day 2)
INSERT INTO public.email_templates (slug, name, subject, body_markdown, audience, is_active)
VALUES (
  'welcome-2',
  'Why ForgeStudy (Day 2)',
  'What makes ForgeStudy different',
  'Hi {{ParentName}},

Homework shouldn''t feel like a nightly battle.

ForgeStudy helps students:
- Understand their work step-by-step
- Build independence and confidence
- Develop better study habits over time

And for parents?
Less stress. More progress.

Log in anytime to explore your student''s dashboard — it''s designed to grow with them.
— ForgeStudy',
  'parent',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_markdown = EXCLUDED.body_markdown,
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- Template 3: Check-in (Day 5)
INSERT INTO public.email_templates (slug, name, subject, body_markdown, audience, is_active)
VALUES (
  'welcome-3',
  'Check-in (Day 5)',
  'How''s it going so far?',
  'Hi {{ParentName}},

We hope ForgeStudy is already making homework feel a bit easier.

A few reminders:
- You can add or adjust student profiles anytime
- You''re always in control of your subscription
- Our goal is real understanding — not shortcuts

If you have questions, we''re here: support@forgestudy.com

Thanks for trusting us with your student''s learning.
— The ForgeStudy Team',
  'parent',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_markdown = EXCLUDED.body_markdown,
  name = EXCLUDED.name,
  is_active = true,
  updated_at = NOW();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration:
--
-- Check table exists:
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'email_templates';
--
-- Check columns:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'email_templates'
-- ORDER BY ordinal_position;
--
-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'email_templates';
--
-- Check policies:
-- SELECT policyname FROM pg_policies WHERE tablename = 'email_templates';
--
-- Check seed data:
-- SELECT slug, name, subject, is_active FROM public.email_templates ORDER BY slug;
-- ============================================

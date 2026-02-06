-- ============================================
-- PROOF ENGINE - PROOF EVENTS TABLE
-- ============================================
-- This migration creates the proof_events table for tracking
-- student understanding validation attempts in the Proof Engine.
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Create proof_events table
CREATE TABLE IF NOT EXISTS public.proof_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  prompt TEXT NOT NULL,
  student_response TEXT NOT NULL,
  student_response_excerpt TEXT NOT NULL,
  response_hash TEXT NOT NULL,
  validation_result JSONB NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('pass', 'partial', 'retry')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Idempotency constraint: prevent duplicate proof events for same chat + response
  CONSTRAINT unique_chat_response UNIQUE (chat_id, response_hash)
);

-- 2. Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_proof_events_student_id_created_at 
  ON public.proof_events(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proof_events_chat_id 
  ON public.proof_events(chat_id);

CREATE INDEX IF NOT EXISTS idx_proof_events_classification 
  ON public.proof_events(classification);

CREATE INDEX IF NOT EXISTS idx_proof_events_response_hash 
  ON public.proof_events(response_hash);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.proof_events ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Policy: Users can view proof events for their student profiles
DROP POLICY IF EXISTS "Users can view proof events for their students" ON public.proof_events;
CREATE POLICY "Users can view proof events for their students"
  ON public.proof_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = proof_events.student_id
        AND sp.owner_id = auth.uid()
    )
  );

-- Policy: Users can insert proof events for their student profiles
DROP POLICY IF EXISTS "Users can create proof events for their students" ON public.proof_events;
CREATE POLICY "Users can create proof events for their students"
  ON public.proof_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = proof_events.student_id
        AND sp.owner_id = auth.uid()
    )
  );

-- Policy: Users can update proof events for their student profiles
DROP POLICY IF EXISTS "Users can update proof events for their students" ON public.proof_events;
CREATE POLICY "Users can update proof events for their students"
  ON public.proof_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = proof_events.student_id
        AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = proof_events.student_id
        AND sp.owner_id = auth.uid()
    )
  );

-- Policy: Users can delete proof events for their student profiles
DROP POLICY IF EXISTS "Users can delete proof events for their students" ON public.proof_events;
CREATE POLICY "Users can delete proof events for their students"
  ON public.proof_events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = proof_events.student_id
        AND sp.owner_id = auth.uid()
    )
  );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration:
--
-- Check table exists:
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'proof_events';
--
-- Check columns:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'proof_events'
-- ORDER BY ordinal_position;
--
-- Check indexes:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'proof_events';
--
-- Check unique constraint:
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'public.proof_events'::regclass;
--
-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'proof_events';
--
-- Check policies:
-- SELECT policyname FROM pg_policies WHERE tablename = 'proof_events';


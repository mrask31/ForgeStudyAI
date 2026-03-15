-- ============================================
-- Add RLS policies to proof_events table
-- The table has RLS enabled but zero policies applied
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.proof_events ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view proof events for their student profiles
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

-- INSERT: Users can create proof events for their student profiles
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

-- UPDATE: Users can update proof events for their student profiles
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

-- DELETE: Users can delete proof events for their student profiles
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

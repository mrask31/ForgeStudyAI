-- Session summaries for parent visibility
CREATE TABLE IF NOT EXISTS public.session_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.student_classes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid,
  summary text,
  duration_minutes integer,
  mastery_before integer,
  mastery_after integer,
  session_date date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_summaries_user_id ON public.session_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_session_summaries_profile_id ON public.session_summaries(profile_id);
CREATE INDEX IF NOT EXISTS idx_session_summaries_session_date ON public.session_summaries(session_date DESC);

ALTER TABLE public.session_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own session summaries" ON public.session_summaries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role manages summaries" ON public.session_summaries
  FOR ALL USING (true) WITH CHECK (true);

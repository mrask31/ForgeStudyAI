-- ============================================
-- Referral system: referral_code on profiles + referral_events table
-- ============================================

-- Add referral_code column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Generate referral codes for existing profiles
UPDATE public.profiles
SET referral_code = upper(substring(md5(id::text || random()::text) from 1 for 8))
WHERE referral_code IS NULL;

-- Make referral_code NOT NULL with default for new rows
ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET DEFAULT upper(substring(md5(random()::text) from 1 for 8));

-- Index for fast lookup during signup
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code
  ON public.profiles (referral_code);

-- Add referred_by column to track who referred this user
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);

-- Referral events table
CREATE TABLE IF NOT EXISTS public.referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id),
  referred_id uuid NOT NULL REFERENCES public.profiles(id),
  referral_code text NOT NULL,
  bonus_days integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral events"
  ON public.referral_events FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "Service role can manage referral events"
  ON public.referral_events FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.referral_events IS 'Tracks referral bonuses between parents';

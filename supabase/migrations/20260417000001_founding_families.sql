-- ============================================
-- Founding Families Migration
-- ============================================

-- 1. Add founding columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS founding_tier TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS founding_signup_number INTEGER DEFAULT NULL;

-- 2. Create config table
CREATE TABLE IF NOT EXISTS public.config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Insert founding slots counter
INSERT INTO public.config (key, value) 
VALUES ('founding_slots_remaining', '20'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Update handle_new_user() to use 14-day trial
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
    'trialing',
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (id) DO UPDATE SET 
    subscription_status = COALESCE(profiles.subscription_status, 'trialing'),
    trial_ends_at = COALESCE(profiles.trial_ends_at, NOW() + INTERVAL '14 days');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create claim_founding_slot RPC function
CREATE OR REPLACE FUNCTION public.claim_founding_slot(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_remaining INTEGER;
  v_slot_number INTEGER;
BEGIN
  -- Lock the config row to prevent race conditions
  SELECT (value)::integer INTO v_remaining
  FROM public.config
  WHERE key = 'founding_slots_remaining'
  FOR UPDATE;

  IF v_remaining IS NULL OR v_remaining <= 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'full');
  END IF;

  -- Decrement counter
  UPDATE public.config
  SET value = to_jsonb(v_remaining - 1)
  WHERE key = 'founding_slots_remaining';

  -- Calculate slot number (1-20)
  v_slot_number := 21 - v_remaining;

  -- Update the user's profile
  UPDATE public.profiles
  SET 
    founding_tier = 'founding',
    trial_ends_at = NOW() + INTERVAL '90 days',
    founding_signup_number = v_slot_number
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'slot_number', v_slot_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. RLS for config table (read-only for anon/authenticated)
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to config" ON public.config
  FOR SELECT USING (true);

-- 6. Grant execute on RPC
GRANT EXECUTE ON FUNCTION public.claim_founding_slot(UUID) TO authenticated;

-- Beta Access System
-- First 20 users get 90-day free beta, rest get 7-day trial

CREATE TABLE IF NOT EXISTS beta_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_beta boolean DEFAULT false,
  beta_expires_at timestamptz,
  trial_expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beta_access_user_id ON beta_access(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_access_is_beta ON beta_access(is_beta);

ALTER TABLE beta_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own beta access" ON beta_access
  FOR SELECT USING (user_id = auth.uid());

-- Service role can manage all rows (for signup assignment)
CREATE POLICY "Service role manages beta access" ON beta_access
  FOR ALL USING (true) WITH CHECK (true);

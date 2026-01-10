-- Create word_bank table for storing user-saved medical terms
CREATE TABLE IF NOT EXISTS word_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, term)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_word_bank_user_id ON word_bank(user_id);
CREATE INDEX IF NOT EXISTS idx_word_bank_term ON word_bank(term);

-- Enable RLS
ALTER TABLE word_bank ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own words
CREATE POLICY "Users can view their own words"
  ON word_bank FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own words
CREATE POLICY "Users can insert their own words"
  ON word_bank FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own words
CREATE POLICY "Users can delete their own words"
  ON word_bank FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_word_bank_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_word_bank_updated_at
  BEFORE UPDATE ON word_bank
  FOR EACH ROW
  EXECUTE FUNCTION update_word_bank_updated_at();


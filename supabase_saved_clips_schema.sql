-- ============================================
-- SAVED CLIPS / LEARNING MOMENTS SCHEMA
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Create 'saved_clips' table to store bookmarked learning moments
CREATE TABLE IF NOT EXISTS saved_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  folder TEXT DEFAULT 'General',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  class_id UUID REFERENCES student_classes(id) ON DELETE SET NULL,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  message_id TEXT, -- Reference to the original message (may not be in DB)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_saved_clips_user_id ON saved_clips(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_clips_class_id ON saved_clips(class_id);
CREATE INDEX IF NOT EXISTS idx_saved_clips_chat_id ON saved_clips(chat_id);
CREATE INDEX IF NOT EXISTS idx_saved_clips_created_at ON saved_clips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_clips_folder ON saved_clips(folder);
CREATE INDEX IF NOT EXISTS idx_saved_clips_tags ON saved_clips USING GIN(tags);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE saved_clips ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for saved_clips
-- Users can only see their own clips
CREATE POLICY "Users can view their own saved clips"
  ON saved_clips FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own clips
CREATE POLICY "Users can create their own saved clips"
  ON saved_clips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own clips
CREATE POLICY "Users can update their own saved clips"
  ON saved_clips FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own clips
CREATE POLICY "Users can delete their own saved clips"
  ON saved_clips FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_clips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to auto-update updated_at
CREATE TRIGGER update_saved_clips_updated_at
  BEFORE UPDATE ON saved_clips
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_clips_updated_at();


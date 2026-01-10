-- ============================================
-- SUPABASE CHAT PERSISTENCE SCHEMA
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- 1. Create 'chats' table to store chat sessions
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create 'messages' table to store individual messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Order messages within a chat
  sequence_number INTEGER NOT NULL DEFAULT 0
);

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sequence ON messages(chat_id, sequence_number);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for chats
-- Users can only see their own chats
CREATE POLICY "Users can view their own chats"
  ON chats FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own chats
CREATE POLICY "Users can create their own chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own chats
CREATE POLICY "Users can update their own chats"
  ON chats FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own chats
CREATE POLICY "Users can delete their own chats"
  ON chats FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Create RLS policies for messages
-- Users can view messages from their chats
CREATE POLICY "Users can view messages from their chats"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Users can create messages in their chats
CREATE POLICY "Users can create messages in their chats"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- 7. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to auto-update updated_at on chats
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- FORGENURSING V1 PREMIUM FEATURES
-- ============================================
-- ForgeClips™, ForgeMap™, Smart Chat Lifecycle
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- ============================================
-- FEATURE 1: ForgeClips™ (Saved Learning Moments)
-- ============================================

CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  message_id TEXT, -- Deterministic hash or nullable
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Cleaned markdown
  folder TEXT DEFAULT 'General',
  tags TEXT[] DEFAULT '{}',
  source_document_ids UUID[] DEFAULT '{}',
  source_citations JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for clips
CREATE INDEX IF NOT EXISTS idx_clips_user_id ON clips(user_id);
CREATE INDEX IF NOT EXISTS idx_clips_chat_id ON clips(chat_id);
CREATE INDEX IF NOT EXISTS idx_clips_folder ON clips(folder);
CREATE INDEX IF NOT EXISTS idx_clips_tags ON clips USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_clips_created_at ON clips(created_at DESC);

-- RLS Policies for clips
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only see their own clips
CREATE POLICY "Users can view their own clips"
  ON clips FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can only create clips for themselves
CREATE POLICY "Users can create their own clips"
  ON clips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own clips
CREATE POLICY "Users can update their own clips"
  ON clips FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own clips
CREATE POLICY "Users can delete their own clips"
  ON clips FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FEATURE 2: ForgeMap™ (Clinical Concept Maps)
-- ============================================

CREATE TABLE IF NOT EXISTS maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  message_id TEXT NOT NULL, -- Deterministic identifier
  map_markdown TEXT NOT NULL, -- Generated concept map markdown
  mode TEXT DEFAULT 'mixed', -- 'notes' | 'reference' | 'mixed'
  selected_doc_ids UUID[] DEFAULT '{}', -- For notes mode scoping
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, message_id) -- One map per message per user
);

-- Indexes for maps
CREATE INDEX IF NOT EXISTS idx_maps_user_id ON maps(user_id);
CREATE INDEX IF NOT EXISTS idx_maps_chat_id ON maps(chat_id);
CREATE INDEX IF NOT EXISTS idx_maps_message_id ON maps(message_id);
CREATE INDEX IF NOT EXISTS idx_maps_created_at ON maps(created_at DESC);

-- RLS Policies for maps
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only see their own maps
CREATE POLICY "Users can view their own maps"
  ON maps FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can only create maps for themselves
CREATE POLICY "Users can create their own maps"
  ON maps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own maps
CREATE POLICY "Users can update their own maps"
  ON maps FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own maps
CREATE POLICY "Users can delete their own maps"
  ON maps FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FEATURE 3: Smart Chat Lifecycle (Graceful Decay)
-- ============================================

-- Add new columns to existing chats table
ALTER TABLE chats 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS summary TEXT;

-- Indexes for chat lifecycle
CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);
CREATE INDEX IF NOT EXISTS idx_chats_last_active_at ON chats(last_active_at);
CREATE INDEX IF NOT EXISTS idx_chats_user_status ON chats(user_id, status);

-- Update existing chats to have status='active' and last_active_at=updated_at
UPDATE chats 
SET status = 'active', last_active_at = COALESCE(updated_at, created_at)
WHERE status IS NULL;

-- Function to update last_active_at on message insert/update
CREATE OR REPLACE FUNCTION update_chat_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats
  SET last_active_at = NOW(), updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_active_at when messages are added/updated
DROP TRIGGER IF EXISTS trigger_update_chat_last_active ON messages;
CREATE TRIGGER trigger_update_chat_last_active
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_last_active();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate deterministic message_id hash
CREATE OR REPLACE FUNCTION generate_message_id(chat_id_val UUID, content_val TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(chat_id_val::text || content_val, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- GRANTS
-- ============================================

-- Ensure authenticated users can use the functions
GRANT EXECUTE ON FUNCTION generate_message_id TO authenticated;
GRANT EXECUTE ON FUNCTION update_chat_last_active TO authenticated;


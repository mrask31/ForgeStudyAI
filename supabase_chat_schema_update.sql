-- ============================================
-- CHAT SCHEMA UPDATE (metadata, mode, session)
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Add metadata for class/topic/attached file info
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add mode + notes support
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'tutor' CHECK (mode IN ('tutor', 'notes')),
  ADD COLUMN IF NOT EXISTS selected_note_ids UUID[] DEFAULT NULL;

-- Add session type
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'general';

-- Add archive flag
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill defaults
UPDATE chats
SET mode = COALESCE(mode, 'tutor'),
    session_type = COALESCE(session_type, 'general'),
    metadata = COALESCE(metadata, '{}'::jsonb),
    is_archived = COALESCE(is_archived, false)
WHERE mode IS NULL OR session_type IS NULL OR metadata IS NULL OR is_archived IS NULL;

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_chats_mode ON chats(mode);
CREATE INDEX IF NOT EXISTS idx_chats_session_type ON chats(session_type);
CREATE INDEX IF NOT EXISTS idx_chats_is_archived ON chats(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_chats_metadata_class_id ON chats ((metadata->>'classId'));
CREATE INDEX IF NOT EXISTS idx_chats_selected_note_ids ON chats USING GIN(selected_note_ids);

-- ============================================
-- Verification
-- SELECT column_name FROM information_schema.columns WHERE table_name='chats';
-- ============================================

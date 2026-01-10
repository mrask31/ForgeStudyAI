-- ============================================
-- NOTES MODE SESSION SCHEMA UPDATE
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Add mode and selected_note_ids columns to chats table
ALTER TABLE chats 
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'tutor' CHECK (mode IN ('tutor', 'notes')),
  ADD COLUMN IF NOT EXISTS selected_note_ids UUID[] DEFAULT NULL;

-- Backfill existing chats to mode='tutor'
UPDATE chats 
SET mode = 'tutor'
WHERE mode IS NULL;

-- Create index for mode-based queries
CREATE INDEX IF NOT EXISTS idx_chats_mode ON chats(mode);
CREATE INDEX IF NOT EXISTS idx_chats_mode_user ON chats(user_id, mode);

-- Create index for selected_note_ids (for array queries)
CREATE INDEX IF NOT EXISTS idx_chats_selected_note_ids ON chats USING GIN(selected_note_ids);


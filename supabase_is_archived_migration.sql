-- ============================================
-- ADD is_archived COLUMN TO chats TABLE
-- ============================================
-- This migration adds is_archived flag to chats table
-- Default: FALSE (all existing chats are not archived)
-- ============================================

-- Add is_archived column
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for filtering archived chats
CREATE INDEX IF NOT EXISTS idx_chats_is_archived ON chats(is_archived) WHERE is_archived = false;

-- Add comment for documentation
COMMENT ON COLUMN chats.is_archived IS 'Flag to mark chats as archived. Archived chats are excluded from normal queries.';


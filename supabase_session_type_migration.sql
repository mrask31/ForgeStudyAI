-- ============================================
-- ADD session_type COLUMN TO chats TABLE
-- ============================================
-- This migration adds session_type to track how sessions were started
-- Allowed values: 'general' | 'reflection' | 'snapshot' | 'question' | 'notes'
-- Default: 'general' (for existing rows and new rows without explicit type)
-- ============================================

-- Add session_type column
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'general';

-- Add check constraint to ensure valid values
ALTER TABLE chats
ADD CONSTRAINT check_session_type 
CHECK (session_type IS NULL OR session_type IN ('general', 'reflection', 'snapshot', 'question', 'notes'));

-- Backfill existing rows to 'general'
UPDATE chats 
SET session_type = 'general' 
WHERE session_type IS NULL;

-- Create index for filtering by session_type
CREATE INDEX IF NOT EXISTS idx_chats_session_type ON chats(session_type);

-- Add comment for documentation
COMMENT ON COLUMN chats.session_type IS 'Tracks how the session was started: general (default), reflection, snapshot, question, or notes';


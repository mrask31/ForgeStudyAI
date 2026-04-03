-- Phase 1: Remove LMS integrations
-- Run these DROP statements manually against prod when ready.
-- The app no longer reads from or writes to these tables.

-- DROP TABLE IF EXISTS synced_assignments;
-- DROP TABLE IF EXISTS lms_connections;
-- DROP TABLE IF EXISTS sync_logs;
-- DROP TABLE IF EXISTS parent_notifications;
-- DROP TABLE IF EXISTS study_topics;

-- NOTE: The `assignments` table is intentionally kept for future manual entry.
-- NOTE: `synced_assignment_id` column in `chats` table can also be dropped when ready:
-- ALTER TABLE chats DROP COLUMN IF EXISTS synced_assignment_id;

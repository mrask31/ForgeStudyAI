-- ============================================
-- DELETE ALL USERS FROM FORGENURSING
-- ============================================
-- ⚠️ WARNING: This script will DELETE ALL USER DATA
-- This is IRREVERSIBLE. Make sure you have backups if needed.
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

BEGIN;

-- Step 1: Show what will be deleted (for verification)
-- Uncomment to see counts before deletion:
/*
SELECT 
  'auth.users' as table_name,
  COUNT(*) as record_count
FROM auth.users
UNION ALL
SELECT 
  'profiles',
  COUNT(*)
FROM profiles
UNION ALL
SELECT 
  'chats',
  COUNT(*)
FROM chats
UNION ALL
SELECT 
  'messages',
  COUNT(*)
FROM messages
UNION ALL
SELECT 
  'documents',
  COUNT(*)
FROM documents
UNION ALL
SELECT 
  'clips',
  COUNT(*)
FROM clips
UNION ALL
SELECT 
  'saved_clips',
  COUNT(*)
FROM saved_clips
UNION ALL
SELECT 
  'maps',
  COUNT(*)
FROM maps
UNION ALL
SELECT 
  'notebook_topics',
  COUNT(*)
FROM notebook_topics
UNION ALL
SELECT 
  'student_classes',
  COUNT(*)
FROM student_classes;
*/

-- Step 2: Delete from child tables (explicit deletion for clarity)
-- Note: Most tables have ON DELETE CASCADE, but we'll delete explicitly for safety

-- Delete clips (saved learning moments)
DELETE FROM clips;
DELETE FROM saved_clips;

-- Delete concept maps
DELETE FROM maps;

-- Delete notebook topics
DELETE FROM notebook_topics;

-- Delete student classes
DELETE FROM student_classes;

-- Delete messages (will cascade from chats, but explicit for clarity)
DELETE FROM messages;

-- Delete chats
DELETE FROM chats;

-- Delete documents (uploaded files)
DELETE FROM documents;

-- Delete profiles
DELETE FROM profiles;

-- Step 3: Delete from auth.users (Supabase Auth)
-- This will cascade to any remaining child records
DELETE FROM auth.users;

-- Step 4: Verify deletion
-- Uncomment to verify all tables are empty:
/*
SELECT 
  'auth.users' as table_name,
  COUNT(*) as remaining_records
FROM auth.users
UNION ALL
SELECT 
  'profiles',
  COUNT(*)
FROM profiles
UNION ALL
SELECT 
  'chats',
  COUNT(*)
FROM chats
UNION ALL
SELECT 
  'messages',
  COUNT(*)
FROM messages
UNION ALL
SELECT 
  'documents',
  COUNT(*)
FROM documents
UNION ALL
SELECT 
  'clips',
  COUNT(*)
FROM clips
UNION ALL
SELECT 
  'saved_clips',
  COUNT(*)
FROM saved_clips
UNION ALL
SELECT 
  'maps',
  COUNT(*)
FROM maps
UNION ALL
SELECT 
  'notebook_topics',
  COUNT(*)
FROM notebook_topics
UNION ALL
SELECT 
  'student_classes',
  COUNT(*)
FROM student_classes;
*/

COMMIT;

-- ============================================
-- NOTES:
-- ============================================
-- 1. This script deletes ALL users and ALL their data
-- 2. Tables with ON DELETE CASCADE will automatically clean up
-- 3. Tables included: profiles, chats, messages, documents, clips, saved_clips, 
--    maps, notebook_topics, student_classes, and auth.users
-- 4. To rollback, use: ROLLBACK; (before COMMIT)
-- 5. After running, all user accounts will be removed from Supabase Auth
-- 6. Uncomment the verification queries (Step 1 & Step 4) to see counts before/after
-- ============================================


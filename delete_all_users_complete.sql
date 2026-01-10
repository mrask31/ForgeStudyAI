-- ============================================
-- DELETE ALL USERS AND DATA FROM FORGENURSING
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

-- Step 2: Delete from database tables (in dependency order)
-- These tables have foreign keys, so delete in reverse dependency order

-- Delete clips and saved content first (they reference chats/documents)
DELETE FROM saved_clips;
DELETE FROM clips;

-- Delete maps (they reference chats)
DELETE FROM maps;

-- Delete notebook topics (they reference chats)
DELETE FROM notebook_topics;

-- Delete messages (they reference chats)
DELETE FROM messages;

-- Delete chats (they reference profiles)
DELETE FROM chats;

-- Delete documents (they reference profiles)
DELETE FROM documents;

-- Delete student_classes (they reference profiles)
DELETE FROM student_classes;

-- Delete profiles (they reference auth.users)
DELETE FROM profiles;

-- Step 3: Delete from auth.users (Supabase Auth)
-- This must be done LAST as other tables reference it
-- Note: You need to run this with elevated privileges
-- If you get a permission error, you may need to use the Supabase Dashboard
-- Go to Authentication > Users and delete manually, or use the SQL Editor with proper permissions

DELETE FROM auth.users;

-- Step 4: Verify deletion (optional - uncomment to check)
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

COMMIT;

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. If you get a permission error on DELETE FROM auth.users:
--    - Go to Supabase Dashboard > Authentication > Users
--    - Select all users and delete them manually
--    - OR use the Supabase SQL Editor with service_role key (be careful!)
--
-- 2. After running this script, verify by checking:
--    - Authentication > Users (should be empty)
--    - Table Editor > profiles (should be empty)
--    - Table Editor > chats (should be empty)
--
-- 3. If you want to keep the table structure but just delete data,
--    this script is perfect. If you want to delete tables too,
--    you'll need DROP TABLE statements (not recommended unless
--    you're resetting the entire database).
-- ============================================


# Migration Scripts - Idempotency Fix

## Problem
The migration scripts were failing with errors like:
- `ERROR: 42710: policy "Users can view their own profile" for table "profiles" already exists`
- `ERROR: 42710: policy "Users can view their own student profiles" for table "student_profiles" already exists`
- `ERROR: 42710: policy "Authenticated users can view email templates" for table "email_templates" already exists`
- `ERROR: 42710: policy "Users can view their own email events" for table "email_events" already exists`

**Root Cause:** PostgreSQL doesn't support `CREATE POLICY IF NOT EXISTS`. When migrations were run multiple times (or partially), policies already existed, causing failures.

## Solution
Updated all migration scripts to be **idempotent** by adding `DROP POLICY IF EXISTS` before each `CREATE POLICY` statement.

## Fixed Files

### ✅ `supabase_profiles_base_table.sql`
- Added `DROP POLICY IF EXISTS` before creating:
  - "Users can view their own profile"
  - "Users can update their own profile"

### ✅ `supabase_student_profiles_migration.sql`
- Added `DROP POLICY IF EXISTS` before creating:
  - "Users can view their own student profiles"
  - "Users can create their own student profiles"
  - "Users can update their own student profiles"
  - "Users can delete their own student profiles"

### ✅ `supabase_email_templates_migration.sql`
- Added `DROP POLICY IF EXISTS` before creating:
  - "Authenticated users can view email templates"

### ✅ `supabase_email_events_migration.sql`
- Added `DROP POLICY IF EXISTS` before creating:
  - "Users can view their own email events"
  - "Users can create their own email events"

### ✅ `supabase_subscription_status_migration.sql`
- **Already idempotent** - Uses `DO $$` blocks to check column existence
- Uses `CREATE OR REPLACE FUNCTION` and `DROP TRIGGER IF EXISTS`

## How to Run Migrations

### Option 1: Run All Migrations in Order (Recommended)

Run these in the Supabase SQL Editor **in this exact order**:

1. **`supabase_profiles_base_table.sql`**
   - Creates `profiles` table
   - Creates auto-profile trigger
   - Creates RLS policies

2. **`supabase_subscription_status_migration.sql`**
   - Adds subscription columns to `profiles`
   - Updates trigger function

3. **`supabase_student_profiles_migration.sql`**
   - Creates `student_profiles` table
   - Creates RLS policies

4. **`supabase_email_templates_migration.sql`**
   - Creates `email_templates` table
   - Seeds 3 welcome email templates
   - Creates RLS policies

5. **`supabase_email_events_migration.sql`**
   - Creates `email_events` table
   - Creates RLS policies

### Option 2: Run Individual Migrations

If you've already run some migrations, you can now safely re-run any of them. The scripts will:
- ✅ Skip creating tables that already exist (`CREATE TABLE IF NOT EXISTS`)
- ✅ Drop and recreate policies that already exist (`DROP POLICY IF EXISTS` + `CREATE POLICY`)
- ✅ Skip creating indexes that already exist (`CREATE INDEX IF NOT EXISTS`)
- ✅ Replace functions/triggers that already exist (`CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`)

## Verification

After running migrations, verify with these queries:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'student_profiles', 'email_templates', 'email_events')
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'student_profiles', 'email_templates', 'email_events')
ORDER BY tablename;

-- Check policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'student_profiles', 'email_templates', 'email_events')
ORDER BY tablename, policyname;

-- Check email templates are seeded
SELECT slug, name, subject, is_active 
FROM public.email_templates 
ORDER BY slug;
```

## Expected Results

After running all migrations, you should see:

- ✅ **4 tables:** `profiles`, `student_profiles`, `email_templates`, `email_events`
- ✅ **RLS enabled** on all 4 tables
- ✅ **Multiple policies** on each table (see queries above)
- ✅ **3 email templates** seeded: `welcome-1`, `welcome-2`, `welcome-3`
- ✅ **1 trigger** on `auth.users`: `on_auth_user_created`
- ✅ **3 triggers** on tables: `set_student_profiles_updated_at`, `set_email_templates_updated_at`, `set_email_events_updated_at`

## Troubleshooting

### If a migration still fails:

1. **Check the error message** - It will tell you what already exists
2. **Run the verification queries** above to see current state
3. **Re-run the specific migration** - It should now work with the idempotent fixes

### If policies are missing:

- Re-run the specific migration file
- The `DROP POLICY IF EXISTS` will safely handle existing policies
- The `CREATE POLICY` will add missing ones

### If tables are missing:

- Re-run the migration that creates that table
- `CREATE TABLE IF NOT EXISTS` will skip if it exists

## Notes

- All migrations are now **safe to run multiple times**
- Migrations can be run in any order (though the recommended order above is best)
- No data will be lost when re-running migrations
- Seed data uses `ON CONFLICT DO UPDATE` to safely update existing records

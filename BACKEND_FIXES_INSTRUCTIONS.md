# Backend Fixes - Implementation Instructions

## Overview
This document outlines the fixes for two backend issues:
1. Missing `is_archived` column in `chats` table
2. RAG RPC function type mismatch (bigint vs uuid)

## Task 1: Add `is_archived` Column

### Step 1: Run Migration
Execute the SQL in `supabase_is_archived_migration.sql` in your Supabase SQL Editor:

```sql
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_chats_is_archived ON chats(is_archived) WHERE is_archived = false;
```

### Step 2: Verify
- Check that the column exists: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'chats' AND column_name = 'is_archived';`
- Should return: `is_archived | boolean`

### Step 3: Code Changes (Already Applied)
- ✅ `src/app/api/chats/list/route.ts` - Updated to use `.eq('is_archived', false)`
- ✅ `src/app/api/chats/resolve/route.ts` - Updated to use `.eq('is_archived', false)`

## Task 2: Fix RAG RPC Type Mismatch

### Step 1: Run Overload Functions
Execute the SQL in `supabase_vector_search_rpc_overloads.sql` in your Supabase SQL Editor.

This creates:
- 4-arg version (base) - with uuid cast
- 5-arg version (with `filter_active`) - with uuid cast
- 6-arg version (with `filter_active` and `filter_document_type`) - with uuid cast

### Step 2: Update Base Function (Optional but Recommended)
If you haven't run the base function yet, also update `supabase_vector_search_rpc.sql` to cast `id::uuid` (already updated in the file).

### Step 3: Verify Functions
Check that all overloads exist:
```sql
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'match_documents' 
ORDER BY pronargs;
```

Should return:
- `match_documents | 4`
- `match_documents | 5`
- `match_documents | 6`

### Step 4: Test RAG
1. Start dev server
2. Send a message in Tutor chat
3. Check logs - should NOT see `[RAG] RPC Error (6-arg): Returned type bigint does not match expected type uuid`
4. RAG should work correctly

## Task 3: Verify Session Flows

After running the migrations:

1. **Clinical Desk → Start New Clinical Scenario**
   - Should create new `snapshot` session
   - Should appear in sidebar

2. **Clinical Desk → Clinical Reflection → Explore with Tutor**
   - Should create new `reflection` session
   - Should appear in sidebar

3. **Clinical Desk → Ask a clinical question**
   - Should create new `question` session
   - Should appear in sidebar

4. **Clinical Desk → Jump Back In**
   - Should resume most recent session (any type)
   - Should NOT create a new session

5. **Tutor Sidebar**
   - Should show all sessions
   - Should highlight active session
   - Should NOT show "No chats yet" when sessions exist

## Troubleshooting

### Error: "column chats.is_archived does not exist"
- **Solution**: Run `supabase_is_archived_migration.sql`

### Error: "Returned type bigint does not match expected type uuid"
- **Solution**: Run `supabase_vector_search_rpc_overloads.sql` to update all function overloads with uuid casting

### Sidebar shows "No chats yet" but sessions exist
- **Check**: Verify `is_archived` column exists and default is `false`
- **Check**: Verify API route uses `.eq('is_archived', false)` not `.is('is_archived', null)`

### RAG still failing
- **Check**: All three function overloads (4, 5, 6 arg) exist
- **Check**: All functions cast `documents.id::uuid` in SELECT
- **Check**: Function return type is `RETURNS TABLE (id uuid, ...)`


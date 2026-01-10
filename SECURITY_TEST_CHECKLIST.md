# Multi-Tenant Security Test Checklist

## CRITICAL: Test Data Isolation Between Users

This checklist verifies that documents are properly isolated between user accounts. Run these tests after deploying RLS policies and code changes.

---

## Pre-Test Setup

1. **Create Two Test Accounts**
   - Account A: `test-user-a@example.com`
   - Account B: `test-user-b@example.com`
   - Use different browsers or incognito windows to maintain separate sessions

2. **Verify Database State**
   - Run `supabase_documents_rls_policies.sql` in Supabase SQL Editor
   - Confirm RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'documents';`
   - Should return `rowsecurity = true`

---

## Test 1: Document Upload Isolation

**Goal**: Verify users can only see their own uploaded documents

### Steps:
1. **As Account A:**
   - Sign in to the application
   - Navigate to `/binder`
   - Upload a PDF file (e.g., `test-doc-a.pdf`)
   - Verify the file appears in the binder list
   - Note the filename

2. **As Account B:**
   - Sign in to the application (different browser/incognito)
   - Navigate to `/binder`
   - **EXPECTED**: `test-doc-a.pdf` should NOT appear in the list
   - Upload a different PDF (e.g., `test-doc-b.pdf`)
   - Verify only `test-doc-b.pdf` appears

3. **Verify via Direct Database Query (Optional - Admin Only):**
   ```sql
   -- As Account A's user_id
   SET request.jwt.claim.sub = 'account-a-user-id';
   SELECT metadata->>'filename' FROM documents;
   -- Should only return Account A's files
   
   -- As Account B's user_id
   SET request.jwt.claim.sub = 'account-b-user-id';
   SELECT metadata->>'filename' FROM documents;
   -- Should only return Account B's files
   ```

**✅ PASS**: Account B cannot see Account A's documents

---

## Test 2: Batch Deletion Isolation

**Goal**: Verify users cannot delete other users' documents

### Steps:
1. **As Account A:**
   - Upload `test-doc-a.pdf`
   - Note the filename

2. **As Account B:**
   - Attempt to delete `test-doc-a.pdf` (if it somehow appears)
   - **EXPECTED**: 
     - Either: File doesn't appear (preferred)
     - Or: Delete operation fails with 401/403 error
     - Or: Delete operation succeeds but doesn't actually delete (RLS blocks it)

3. **Verify:**
   - As Account A, confirm `test-doc-a.pdf` still exists
   - As Account B, confirm they cannot see or affect Account A's files

**✅ PASS**: Users cannot delete other users' documents

---

## Test 3: Context Toggle Isolation

**Goal**: Verify users cannot toggle other users' document context

### Steps:
1. **As Account A:**
   - Upload `test-doc-a.pdf`
   - Toggle context ON/OFF
   - Verify toggle works

2. **As Account B:**
   - If `test-doc-a.pdf` appears (shouldn't), attempt to toggle it
   - **EXPECTED**: 
     - Either: File doesn't appear
     - Or: Toggle operation fails with 401/403 error
     - Or: Toggle appears to work but doesn't affect Account A's document

3. **Verify:**
   - As Account A, confirm context state is unchanged by Account B's actions

**✅ PASS**: Users cannot modify other users' document context

---

## Test 4: API Route Security

**Goal**: Verify API routes enforce user authentication and filtering

### Steps:
1. **Test `/api/binder` (GET):**
   ```bash
   # Without authentication
   curl http://localhost:3000/api/binder
   # EXPECTED: 401 Unauthorized
   
   # With Account A's session cookie
   curl http://localhost:3000/api/binder -H "Cookie: sb-xxx-auth-token=..."
   # EXPECTED: Only Account A's documents
   ```

2. **Test `/api/process` (POST):**
   ```bash
   # Without authentication
   curl -X POST http://localhost:3000/api/process \
     -H "Content-Type: application/json" \
     -d '{"text": "test", "filename": "test.pdf"}'
   # EXPECTED: 401 Unauthorized
   ```

**✅ PASS**: API routes require authentication and return only user's data

---

## Test 5: Vector Search Isolation (When Implemented)

**Goal**: Verify vector search only returns documents from the authenticated user

### Steps:
1. **As Account A:**
   - Upload `medical-textbook-a.pdf` with content about "diabetes"
   - Ensure document is active (`is_active: true`)

2. **As Account B:**
   - Upload `medical-textbook-b.pdf` with content about "hypertension"
   - Ensure document is active

3. **Test Vector Search:**
   - As Account A, ask a question about "diabetes"
   - **EXPECTED**: AI should use context from `medical-textbook-a.pdf` only
   - AI should NOT reference content from Account B's documents

4. **Verify via Database:**
   - Check that vector search RPC function (when implemented) includes:
     - `WHERE user_id = auth.uid()` filter
     - `AND (metadata->>'is_active' = 'true' OR metadata->>'is_active' IS NULL)` filter

**✅ PASS**: Vector search only uses authenticated user's active documents

---

## Test 6: RLS Policy Enforcement

**Goal**: Verify RLS policies prevent direct database access

### Steps:
1. **As Account A:**
   - Upload `test-doc-a.pdf`
   - Note the document ID from browser dev tools or logs

2. **As Account B (with database access):**
   - Attempt to query Account A's document directly:
     ```sql
     -- This should fail or return empty due to RLS
     SELECT * FROM documents WHERE id = 'account-a-document-id';
     ```
   - **EXPECTED**: Query returns empty or fails (RLS blocks it)

3. **Verify Service Role Bypass (If Applicable):**
   - If using service role for admin operations, ensure it's:
     - Only used in isolated admin functions
     - Never used for user-facing queries
     - Logged and audited

**✅ PASS**: RLS prevents unauthorized database access

---

## Test 7: Edge Cases

### Test 7a: Empty User ID
- Attempt to upload document with `user_id = NULL`
- **EXPECTED**: Insert fails (NOT NULL constraint or RLS policy)

### Test 7b: Invalid User ID
- Attempt to upload document with `user_id = 'invalid-uuid'`
- **EXPECTED**: Insert fails (foreign key constraint)

### Test 7c: Deleted User
- Delete a user account
- **EXPECTED**: User's documents are cascade deleted (if CASCADE is set)
- Or: Documents remain but are inaccessible (if RESTRICT is set)

---

## Automated Test Script (Optional)

Create a test script to run these checks automatically:

```typescript
// tests/security/multi-tenant.test.ts
import { createClient } from '@supabase/supabase-js'

describe('Multi-Tenant Security', () => {
  it('should isolate documents between users', async () => {
    // Create two test users
    // Upload documents as each user
    // Verify cross-user access is blocked
  })
})
```

---

## Sign-Off

- [ ] Test 1: Document Upload Isolation - PASSED
- [ ] Test 2: Batch Deletion Isolation - PASSED
- [ ] Test 3: Context Toggle Isolation - PASSED
- [ ] Test 4: API Route Security - PASSED
- [ ] Test 5: Vector Search Isolation - PASSED (when implemented)
- [ ] Test 6: RLS Policy Enforcement - PASSED
- [ ] Test 7: Edge Cases - PASSED

**Tested By**: _________________  
**Date**: _________________  
**Environment**: [ ] Development [ ] Staging [ ] Production

---

## Security Notes

- **Never disable RLS** in production, even for debugging
- **Always use authenticated Supabase clients** for user-facing operations
- **Service role key** should only be used in isolated admin functions
- **Log all document access** for audit trails
- **Monitor for unusual cross-user access patterns**


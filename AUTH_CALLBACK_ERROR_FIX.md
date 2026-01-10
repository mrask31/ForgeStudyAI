# Auth Callback Error Fix

## Problem
User is being redirected to `/login?error=auth-code-error` after email verification.

## Root Cause
The auth callback route hits its fallback error case when:
1. No `code` parameter in URL (unlikely - email verification links include it)
2. `exchangeCodeForSession` fails (most likely)

## Fixes Applied

### 1. Removed Problematic Type Casting
Changed from:
```typescript
profileClient = createClient(...) as any
```

To proper separate client instances for service role key operations.

### 2. Added Explicit Error Handling
Now explicitly checks for `exchangeCodeForSession` errors and redirects immediately with error logging.

### 3. Improved Service Role Key Pattern
Using separate `adminClient` instance instead of type-casting, which is cleaner and safer.

## Next Steps for Debugging

1. **Check Vercel Logs:**
   - Look for `[Auth Callback] Error exchanging code for session:` messages
   - This will show the actual error from Supabase

2. **Common Causes:**
   - Code expired (Supabase codes expire after some time)
   - Code already used (codes are single-use)
   - Network/timeout issues
   - Supabase configuration issues

3. **Check Verification Email:**
   - Is the verification link being clicked quickly enough?
   - Is the URL malformed?
   - Does it include the `code` parameter?

## Testing

After deployment, check Vercel function logs when user clicks verification link to see the actual error message.


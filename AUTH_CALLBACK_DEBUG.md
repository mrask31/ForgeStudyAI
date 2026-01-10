# Auth Callback Error Debug

## Issue
User is being redirected to `/login?error=auth-code-error`, which means the auth callback route is hitting its fallback error case.

## Code Flow Analysis

The auth callback route has this structure:

```typescript
if (code) {
  // Exchange code for session
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  
  if (!error) {
    // Handle profile creation/update
    // Redirect based on subscription status
  }
  // If error exists, falls through to error case
}

// ERROR CASE - This is where user is ending up
return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
```

## Possible Causes

1. **No `code` parameter in URL**
   - Email verification link might be malformed
   - Code parameter might be missing

2. **Code exchange fails**
   - `exchangeCodeForSession` returns an error
   - Code might be expired or invalid

3. **Service role key issue**
   - My recent changes to use service role key might have broken the flow
   - Type casting issue with `as any`

4. **Uncaught exception**
   - An error is being thrown and not caught
   - JavaScript error stops execution

## Debug Steps

1. **Check Vercel logs for:**
   - `[Auth Callback]` error messages
   - Any exceptions or errors
   - What error `exchangeCodeForSession` is returning

2. **Check the verification email link:**
   - Does it have a `code` parameter?
   - Is the URL correct?

3. **Test with logging:**
   - Add console.log statements to see where execution stops
   - Log the error from `exchangeCodeForSession`

## Fix Applied

Removed the `as any` type casting which might have been causing issues. Now using proper type for adminClient.


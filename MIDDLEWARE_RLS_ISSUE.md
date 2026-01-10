# Middleware RLS Issue - Root Cause Analysis

## Problem
User with `subscription_status = "pending_payment"` is getting access to protected routes, even though middleware should redirect them to `/billing/payment-required`.

## Evidence
- ✅ User exists in `auth.users`
- ✅ Profile exists with `subscription_status = "pending_payment"`
- ✅ `subscription_status` column exists in `profiles` table
- ❌ User is getting access (should be blocked)

## Root Cause: RLS Blocking Middleware Queries

The middleware uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` to query the `profiles` table. If RLS (Row Level Security) is enabled on the `profiles` table, the middleware query might be:

1. **Returning NULL/empty** - RLS policies might block the middleware from reading the profile
2. **Failing silently** - The query error is caught, but `profile` is null, so the check passes incorrectly

## Current Middleware Code Problem

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('subscription_status')
  .eq('id', user.id)
  .single()

const subscriptionStatus = profile?.subscription_status
const hasActiveSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

if (!hasActiveSubscription) {
  return NextResponse.redirect(new URL('/billing/payment-required', request.url))
}
```

**If RLS blocks the query:**
- `profile` is `null`
- `subscriptionStatus` is `undefined`
- `hasActiveSubscription` is `false`
- Should redirect, BUT...

**The problem:** If the query errors or returns null, and there's no error handling, the middleware might be allowing access by default (failing open instead of failing closed).

## Solutions

### Option 1: Use Service Role Key in Middleware (RECOMMENDED)
Middleware needs to bypass RLS to check subscription status. Use the service role key.

**⚠️ CRITICAL:** The service role key bypasses ALL RLS policies. Only use it in server-side code (middleware, API routes), NEVER in client-side code.

**Changes needed:**
1. Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel environment variables
2. Update middleware to use service role key for profile queries
3. Keep anon key for auth operations

### Option 2: Create a Public RLS Policy for Subscription Status
Create an RLS policy that allows reading `subscription_status` for any authenticated user. However, this is less secure.

### Option 3: Move Subscription Check to API Route
Check subscription status in an API route (which can use service role key), then set a cookie or header that middleware can read.

## Recommended Fix: Option 1

**Step 1:** Add service role key to Vercel
- Go to Vercel Dashboard → Project → Settings → Environment Variables
- Add `SUPABASE_SERVICE_ROLE_KEY` (get it from Supabase Dashboard → Settings → API)

**Step 2:** Update middleware to use service role for profile queries

**Step 3:** Test that users with `pending_payment` are blocked

## How to Verify RLS is the Issue

Run this in Supabase SQL Editor to check RLS policies:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Check RLS policies
SELECT * 
FROM pg_policies 
WHERE tablename = 'profiles';
```

If RLS is enabled and policies require `auth.uid() = user_id`, then middleware (which runs server-side without a user session context) cannot read the profile.


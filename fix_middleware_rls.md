# Fix: Middleware RLS Issue

## Problem
Middleware uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` to query `profiles` table, but RLS is blocking the query, causing middleware to fail silently and allow access to users with `pending_payment` status.

## Solution
Use service role key in middleware for profile queries ONLY. Service role key bypasses RLS.

## Steps

1. **Get Service Role Key from Supabase:**
   - Go to Supabase Dashboard → Settings → API
   - Copy the `service_role` key (NOT the anon key)
   - ⚠️ This key bypasses ALL RLS - keep it secret!

2. **Add to Vercel Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `SUPABASE_SERVICE_ROLE_KEY` = (your service role key)
   - Make sure it's set for Production, Preview, and Development

3. **Update middleware.ts:**
   - Create a separate Supabase client using service role key for profile queries
   - Keep anon key for auth operations
   - Use service role client ONLY for reading subscription_status


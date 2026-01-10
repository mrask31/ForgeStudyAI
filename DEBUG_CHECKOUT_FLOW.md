# Debug: Checkout Flow Bypass Issue

## Problem
User verifies email, gets redirected to `/checkout`, but bypasses the credit card screen and gets access to the app.

## Flow Analysis

1. **Email Verification → Auth Callback**
   - User clicks verification link
   - `/auth/callback?code=...` is called
   - Auth callback exchanges code for session
   - Auth callback queries profile (now using service role key)
   - Auth callback should redirect to `/checkout?plan=monthly` if `subscription_status = 'pending_payment'`

2. **Checkout Page**
   - `/checkout` page loads
   - Calls `startStripeCheckout(plan)`
   - `startStripeCheckout` calls `/api/stripe/checkout`
   - If API returns 401, redirects to `/signup?plan=...`
   - If API succeeds, redirects to Stripe Checkout URL
   - If API fails, redirects to `/readiness` (dashboard)

3. **Middleware Protection**
   - `/checkout` is in `billingRoutes`
   - Middleware skips subscription check for billing routes
   - So `/checkout` should be accessible

## Potential Issues

1. **Checkout API Returns 401**
   - If user is not authenticated (session not set yet), API returns 401
   - `startStripeCheckout` redirects to `/signup?plan=...`
   - But user is already authenticated, so this shouldn't happen

2. **Checkout API Fails**
   - If API fails for any reason, checkout page redirects to `/readiness`
   - This would bypass the payment screen!

3. **Middleware Not Running**
   - If middleware isn't running on `/readiness`, user gets access
   - But `/readiness` is in `protectedRoutes`, so middleware should block it

4. **Service Role Key Not Set in Vercel**
   - If service role key isn't set, middleware falls back to anon key
   - Anon key might be blocked by RLS
   - Middleware query fails, but maybe it's not blocking correctly?

## Debug Steps

1. Check Vercel logs for:
   - Middleware errors
   - Checkout API errors
   - Auth callback errors

2. Check if service role key is actually set in Vercel:
   - Vercel Dashboard → Settings → Environment Variables
   - Verify `SUPABASE_SERVICE_ROLE_KEY` exists

3. Check browser console for:
   - Checkout page errors
   - Redirects happening

4. Check network tab for:
   - `/api/stripe/checkout` response
   - Any 401/403 errors


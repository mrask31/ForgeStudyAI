# ForgeStudy Auth & Subscription Flow - Security Test Checklist

## Overview
This checklist ensures the auth and subscription flow is secure, prevents redirect loops, and properly gates access to protected routes.

---

## Test Environment Setup

### Prerequisites
- [ ] Local development environment running
- [ ] Supabase project configured
- [ ] Stripe test mode configured
- [ ] Environment variables set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `NEXT_PUBLIC_APP_URL`

### Test Accounts
- [ ] Create test account 1: `test1@example.com` (for full flow)
- [ ] Create test account 2: `test2@example.com` (for no-subscription flow)
- [ ] Create test account 3: `test3@example.com` (for expired subscription)

---

## 1. Public Routes (No Auth Required)

### Test 1.1: Landing Page
- [ ] Visit `/` without auth
- [ ] Page loads successfully
- [ ] No redirect to login
- [ ] CTA buttons visible

### Test 1.2: Auth Pages
- [ ] Visit `/login` without auth → loads
- [ ] Visit `/signup` without auth → loads
- [ ] Visit `/reset` without auth → loads
- [ ] Visit `/reset-password` without auth → loads

### Test 1.3: Legal Pages
- [ ] Visit `/privacy` without auth → loads
- [ ] Visit `/terms` without auth → loads

### Test 1.4: Grade Band Pages
- [ ] Visit `/middle` without auth → loads
- [ ] Visit `/high` without auth → loads
- [ ] Visit `/elementary` without auth → redirects to `/middle`

### Test 1.5: Checkout Page
- [ ] Visit `/checkout` without auth → loads
- [ ] Visit `/checkout?plan=individual` without auth → loads

---

## 2. New User Signup Flow

### Test 2.1: Email Signup
- [ ] Visit `/signup`
- [ ] Enter email: `test1@example.com`
- [ ] Enter password: `TestPassword123!`
- [ ] Click "Sign up"
- [ ] Verify email sent to inbox
- [ ] Check email contains link to `/auth/callback?code=...`

### Test 2.2: Auth Callback
- [ ] Click email verification link
- [ ] Verify redirect to `/checkout`
- [ ] Check browser URL contains `/checkout`
- [ ] Verify no error messages

### Test 2.3: Checkout Flow
- [ ] On `/checkout`, select "Individual Plan"
- [ ] Click "Subscribe"
- [ ] Redirected to Stripe checkout
- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Enter expiry: `12/34`, CVC: `123`
- [ ] Click "Subscribe"
- [ ] Verify redirect to `/billing/success`

### Test 2.4: Billing Success
- [ ] On `/billing/success`, see "You're all set!" message
- [ ] Wait 2 seconds
- [ ] Verify auto-redirect to `/profiles/new`

### Test 2.5: Profile Creation
- [ ] On `/profiles/new`, create student profile
- [ ] Enter name, grade, etc.
- [ ] Click "Create profile"
- [ ] Verify redirect to app (e.g., `/tutor` or `/profiles`)

### Test 2.6: App Access
- [ ] Visit `/tutor` → loads successfully
- [ ] Visit `/clinical-desk` → loads successfully
- [ ] Visit `/binder` → loads successfully
- [ ] No redirect to checkout

---

## 3. Returning User Flow (With Active Subscription)

### Test 3.1: Login
- [ ] Sign out
- [ ] Visit `/login`
- [ ] Enter credentials for test1@example.com
- [ ] Click "Sign in"
- [ ] Verify redirect to `/profiles` or last visited page

### Test 3.2: Direct Access to Protected Routes
- [ ] Visit `/tutor` → loads immediately
- [ ] Visit `/clinical-desk` → loads immediately
- [ ] Visit `/binder` → loads immediately
- [ ] No redirect to checkout

### Test 3.3: Profile Access
- [ ] Visit `/profiles` → loads
- [ ] Visit `/profiles/new` → loads
- [ ] Visit `/post-login` → loads

---

## 4. Returning User Flow (Without Subscription)

### Test 4.1: Create Account Without Completing Checkout
- [ ] Sign up with `test2@example.com`
- [ ] Verify email
- [ ] On `/checkout`, close tab (don't complete payment)

### Test 4.2: Login Without Subscription
- [ ] Visit `/login`
- [ ] Enter credentials for test2@example.com
- [ ] Click "Sign in"
- [ ] Verify redirect to `/checkout` (not `/profiles`)

### Test 4.3: Protected Route Access Without Subscription
- [ ] Try to visit `/tutor` directly
- [ ] Verify redirect to `/checkout`
- [ ] Try to visit `/clinical-desk` directly
- [ ] Verify redirect to `/checkout`

### Test 4.4: Complete Checkout After Login
- [ ] On `/checkout`, select plan
- [ ] Complete Stripe checkout
- [ ] Verify redirect to `/billing/success`
- [ ] Verify redirect to `/profiles/new`
- [ ] Verify access to `/tutor` now works

---

## 5. Subscription Status Transitions

### Test 5.1: Trialing Status
- [ ] Create new account
- [ ] Complete checkout
- [ ] Check database: `subscription_status = 'trialing'`
- [ ] Verify access to protected routes

### Test 5.2: Active Status
- [ ] Manually update subscription in Stripe to "active"
- [ ] Wait for webhook to fire
- [ ] Check database: `subscription_status = 'active'`
- [ ] Verify continued access to protected routes

### Test 5.3: Past Due Status
- [ ] Manually update subscription in Stripe to "past_due"
- [ ] Wait for webhook to fire
- [ ] Check database: `subscription_status = 'past_due'`
- [ ] Try to access `/tutor`
- [ ] Verify redirect to `/checkout`

### Test 5.4: Canceled Status
- [ ] Visit `/settings` (or wherever cancel is)
- [ ] Cancel subscription
- [ ] Wait for webhook to fire
- [ ] Check database: `subscription_status = 'canceled'`
- [ ] Try to access `/tutor`
- [ ] Verify redirect to `/checkout`

---

## 6. Redirect Loop Prevention

### Test 6.1: Checkout → Protected Route Loop
- [ ] Sign in without subscription
- [ ] Verify redirect to `/checkout`
- [ ] Try to visit `/tutor` in new tab
- [ ] Verify redirect to `/checkout` (not back to `/tutor`)
- [ ] Complete checkout
- [ ] Verify redirect to `/billing/success` → `/profiles/new`
- [ ] Verify no loops

### Test 6.2: Billing Success → Checkout Loop
- [ ] Complete checkout
- [ ] On `/billing/success`, wait for subscription verification
- [ ] Verify redirect to `/profiles/new` (not back to `/checkout`)

### Test 6.3: Profiles → Checkout Loop
- [ ] Sign in with account that has subscription
- [ ] Visit `/profiles`
- [ ] Verify no redirect to `/checkout`
- [ ] Visit `/profiles/new`
- [ ] Verify no redirect to `/checkout`

---

## 7. Auth-Only Routes (No Subscription Check)

### Test 7.1: Profiles Routes
- [ ] Sign in without subscription
- [ ] Visit `/profiles` → loads (no redirect to checkout)
- [ ] Visit `/profiles/new` → loads (no redirect to checkout)
- [ ] Visit `/profiles/[id]/edit` → loads (no redirect to checkout)

### Test 7.2: Post-Login Route
- [ ] Sign in without subscription
- [ ] Visit `/post-login` → loads (no redirect to checkout)

### Test 7.3: Profile Dashboard Routes
- [ ] Sign in without subscription
- [ ] Visit `/p/[profileId]/dashboard` → loads (no redirect to checkout)

---

## 8. Billing Routes (Always Accessible)

### Test 8.1: Checkout Access
- [ ] Sign in without subscription
- [ ] Visit `/checkout` → loads
- [ ] Sign in with subscription
- [ ] Visit `/checkout` → loads (no redirect)

### Test 8.2: Billing Pages
- [ ] Visit `/billing/success` → loads
- [ ] Visit `/billing/cancel` → loads
- [ ] Visit `/billing/payment-required` → loads

---

## 9. Middleware Edge Cases

### Test 9.1: Missing Supabase Env Vars
- [ ] Temporarily remove `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Visit `/` → loads (public route)
- [ ] Visit `/tutor` → redirects to `/login`
- [ ] Restore env var

### Test 9.2: Missing Service Role Key
- [ ] Temporarily remove `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Sign in
- [ ] Visit `/tutor` → should still work (fallback to anon key)
- [ ] Restore env var

### Test 9.3: Supabase Client Error
- [ ] Temporarily set invalid `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Visit `/` → loads (public route)
- [ ] Visit `/tutor` → redirects to `/login`
- [ ] Restore env var

### Test 9.4: Profile Fetch Error
- [ ] Sign in
- [ ] Temporarily break RLS policy on profiles table
- [ ] Visit `/tutor` → redirects to `/checkout` (fail secure)
- [ ] Restore RLS policy

---

## 10. Webhook Verification

### Test 10.1: Checkout Session Completed
- [ ] Complete Stripe checkout
- [ ] Check Stripe webhook logs
- [ ] Verify `checkout.session.completed` event received
- [ ] Check database: `subscription_status` updated
- [ ] Check database: `stripe_customer_id` set
- [ ] Check database: `stripe_subscription_id` set

### Test 10.2: Subscription Updated
- [ ] Manually update subscription in Stripe dashboard
- [ ] Check Stripe webhook logs
- [ ] Verify `customer.subscription.updated` event received
- [ ] Check database: `subscription_status` updated

### Test 10.3: Subscription Deleted
- [ ] Cancel subscription in Stripe dashboard
- [ ] Check Stripe webhook logs
- [ ] Verify `customer.subscription.deleted` event received
- [ ] Check database: `subscription_status = 'canceled'`

---

## 11. Security Checks

### Test 11.1: Unauthenticated Access
- [ ] Sign out
- [ ] Try to visit `/tutor` → redirects to `/login`
- [ ] Try to visit `/clinical-desk` → redirects to `/login`
- [ ] Try to visit `/binder` → redirects to `/login`
- [ ] Try to visit `/settings` → redirects to `/login`

### Test 11.2: Subscription Bypass Attempt
- [ ] Sign in without subscription
- [ ] Try to visit `/tutor` → redirects to `/checkout`
- [ ] Try to visit `/clinical-desk` → redirects to `/checkout`
- [ ] Try to visit `/binder` → redirects to `/checkout`

### Test 11.3: Direct API Access
- [ ] Sign out
- [ ] Try to fetch `/api/chat/proof` → 401 or 403
- [ ] Try to fetch `/api/chats/list` → 401 or 403
- [ ] Sign in without subscription
- [ ] Try to fetch `/api/chat/proof` → 401 or 403 (if gated)

### Test 11.4: Profile Creation Guardrails
- [ ] Sign in with subscription
- [ ] Create 1 student profile
- [ ] Try to create 2nd profile without family plan
- [ ] Verify redirect to `/profiles` (blocked)
- [ ] Upgrade to family plan
- [ ] Create 2nd profile → succeeds

---

## 12. User Experience Checks

### Test 12.1: Cache Control Headers
- [ ] Visit `/login`
- [ ] Check response headers: `Cache-Control: no-store`
- [ ] Visit `/signup`
- [ ] Check response headers: `Cache-Control: no-store`
- [ ] Visit `/`
- [ ] Check response headers: `Cache-Control: no-store`

### Test 12.2: Redirect Preservation
- [ ] Sign out
- [ ] Visit `/tutor`
- [ ] Verify redirect to `/login?redirect=/tutor`
- [ ] Sign in
- [ ] Verify redirect back to `/tutor` (after checkout if needed)

### Test 12.3: Error Messages
- [ ] Visit `/auth/callback` without code
- [ ] Verify redirect to `/login?error=auth-code-error`
- [ ] Visit `/auth/callback?code=invalid`
- [ ] Verify redirect to `/login?error=auth-exchange-failed`

---

## 13. Database Integrity

### Test 13.1: Profile Creation
- [ ] Sign up new user
- [ ] Check database: profile row created
- [ ] Verify `subscription_status = 'pending_payment'`
- [ ] Verify `onboarding_completed = false`
- [ ] Verify `onboarding_step = 0`

### Test 13.2: Profile Update
- [ ] Complete checkout
- [ ] Check database: `subscription_status` updated to 'trialing'
- [ ] Check database: `stripe_customer_id` set
- [ ] Check database: `stripe_subscription_id` set

### Test 13.3: Onboarding Fields Fallback
- [ ] Drop `onboarding_completed` and `onboarding_step` columns
- [ ] Sign up new user
- [ ] Verify no error (fallback works)
- [ ] Check logs: "Onboarding columns may not exist, retrying without them"
- [ ] Restore columns

---

## 14. Performance Checks

### Test 14.1: Middleware Performance
- [ ] Sign in
- [ ] Visit `/tutor`
- [ ] Check response time < 500ms
- [ ] Visit `/clinical-desk`
- [ ] Check response time < 500ms

### Test 14.2: Subscription Check Caching
- [ ] Sign in
- [ ] Visit `/tutor` 10 times
- [ ] Verify no excessive database queries
- [ ] Check Supabase logs for query count

---

## 15. Rollback Verification

### Test 15.1: Revert Auth Callback
- [ ] Revert `src/app/auth/callback/route.ts` to previous version
- [ ] Sign up new user
- [ ] Verify old flow still works
- [ ] Restore new version

### Test 15.2: Revert Middleware
- [ ] Revert `middleware.ts` to previous version
- [ ] Sign in
- [ ] Verify old gating logic still works
- [ ] Restore new version

---

## Test Results Summary

### Pass/Fail Counts
- Total Tests: 100+
- Passed: ___
- Failed: ___
- Skipped: ___

### Critical Issues Found
1. 
2. 
3. 

### Non-Critical Issues Found
1. 
2. 
3. 

### Recommendations
1. 
2. 
3. 

---

## Sign-Off

- [ ] All critical tests passed
- [ ] All security checks passed
- [ ] No redirect loops detected
- [ ] Webhook integration verified
- [ ] Database integrity confirmed
- [ ] Ready for staging deployment

**Tested by:** _______________  
**Date:** _______________  
**Environment:** _______________  
**Notes:** _______________

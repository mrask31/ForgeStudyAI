# Account Creation Flow - Status Check

## ✅ Current Setup Status

### **YES, we are set up to handle account creations** - with one critical missing piece

---

## Complete Flow Breakdown

### 1. **User Signs Up** ✅
**Location:** `src/app/(public)/signup/page.tsx`

- User enters email and password
- Calls `supabase.auth.signUp()`
- Supabase creates user in `auth.users` table
- **Email verification is sent** (if configured in Supabase Dashboard - see `SUPABASE_EMAIL_SETUP.md`)

**Status:** ✅ Code ready, but email sending needs Supabase Dashboard configuration

---

### 2. **Profile Auto-Creation** ✅
**Location:** Database trigger in `supabase_profiles_base_table.sql`

- **Database trigger:** `on_auth_user_created` fires automatically
- **Function:** `handle_new_user()` creates profile in `public.profiles`
- **Default status:** `subscription_status = 'pending_payment'`
- **Happens:** Immediately when user signs up (before email verification)

**Status:** ✅ Fully automated via database trigger

**SQL Migration Required:**
```sql
-- Run: supabase_profiles_base_table.sql
-- This creates the trigger that auto-creates profiles
```

---

### 3. **Email Verification** ✅
**Location:** `src/app/auth/callback/route.ts`

- User clicks verification link in email
- Code exchanges verification code for session
- **Backup profile check:** Ensures profile exists (in case trigger failed)
- Creates/updates profile if missing
- Redirects based on subscription status:
  - If `pending_payment` → `/checkout`
  - If has plan param → `/checkout?plan=monthly`
  - If active → `/post-login`

**Status:** ✅ Fully implemented with fallback safety

---

### 4. **Subscription Check (Middleware)** ✅
**Location:** `middleware.ts`

- Checks subscription status for all protected routes
- Blocks access if status is not `active` or `trialing`
- Redirects to `/billing/payment-required` if unpaid
- Uses service role key to bypass RLS (if configured)

**Status:** ✅ Implemented, but requires `SUPABASE_SERVICE_ROLE_KEY` env var

**Required Environment Variable:**
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

### 5. **Post-Login Routing** ✅
**Location:** `src/app/(app)/post-login/page.tsx`

- Routes users based on student profile count:
  - **0 profiles** → `/profiles/new` (create first profile)
  - **1 profile** → `/p/{profileId}/dashboard` (auto-enter)
  - **2+ profiles** → `/profiles` (profile picker)

**Status:** ✅ Fully implemented

---

### 6. **Student Profile Creation** ✅
**Location:** `src/app/actions/student-profiles.ts`

- User creates first student profile
- Validates grade band, display name, etc.
- Enforces max 4 profiles per account
- **Welcome email queued:** If first profile, queues `welcome-1` email event

**Status:** ✅ Fully implemented with email event queuing

**SQL Migrations Required:**
```sql
-- Run: supabase_student_profiles_migration.sql
-- Run: supabase_email_templates_migration.sql
-- Run: supabase_email_events_migration.sql
```

---

### 7. **Welcome Email Event** ✅
**Location:** `src/app/actions/email-events.ts` + `student-profiles.ts`

- When first student profile is created, queues `welcome-1` email event
- Stores in `email_events` table with status `'queued'`
- Includes metadata: `{ reason: "first_profile_created", parentName: "..." }`
- **Note:** Email sending not implemented yet (just queuing)

**Status:** ✅ Queuing implemented, sending not yet implemented

---

## ⚠️ Missing/Incomplete Pieces

### 1. **Email Verification Configuration** ❌
**Issue:** Supabase Dashboard email settings not configured

**Required:**
- Enable email confirmations in Supabase Dashboard
- Configure SMTP (for production) or use built-in service (for dev)

**See:** `SUPABASE_EMAIL_SETUP.md` for detailed instructions

---

### 2. **Service Role Key in Middleware** ⚠️
**Issue:** Middleware may fail if RLS blocks profile queries

**Required:**
- Add `SUPABASE_SERVICE_ROLE_KEY` to environment variables
- Middleware will use it to bypass RLS for subscription checks

**Current:** Middleware has fallback logic, but service role key is recommended

---

### 3. **Email Sending Service** ❌
**Issue:** Welcome emails are queued but not sent

**Required:**
- Implement email sending service (Resend, SendGrid, etc.)
- Process `email_events` table with status `'queued'`
- Update status to `'sent'` or `'failed'`

**Note:** This is intentionally not implemented yet (per requirements)

---

## ✅ Database Migrations Checklist

Run these SQL migrations in Supabase SQL Editor (in order):

1. ✅ `supabase_profiles_base_table.sql` - Creates profiles table + trigger
2. ✅ `supabase_subscription_status_migration.sql` - Adds subscription columns
3. ✅ `supabase_student_profiles_migration.sql` - Creates student_profiles table
4. ✅ `supabase_email_templates_migration.sql` - Creates email_templates table + seeds
5. ✅ `supabase_email_events_migration.sql` - Creates email_events table

---

## ✅ Environment Variables Checklist

Required in `.env.local` and production:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For middleware

# App URL (for email redirects)
NEXT_PUBLIC_APP_URL=https://yourdomain.com  # Or localhost:3000 for dev

# Stripe (for checkout)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Stripe price IDs (client-visible)
NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_INDIVIDUAL_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_PRICE_FAMILY_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_FAMILY_ANNUAL=price_...
```

---

## 🧪 Testing the Flow

### Test Account Creation:

1. **Sign Up:**
   - Go to `/signup`
   - Enter email and password
   - Submit form
   - ✅ Should see "Check your email" message

2. **Verify Email:**
   - Check email inbox (and spam)
   - Click verification link
   - ✅ Should redirect to `/checkout` (if email verification configured)

3. **Complete Payment:**
   - Go through Stripe checkout
   - ✅ Should redirect to `/post-login` after payment

4. **Create Student Profile:**
   - Should redirect to `/profiles/new` (if no profiles)
   - Create first profile
   - ✅ Should queue welcome email event
   - ✅ Should redirect to dashboard

5. **Verify Email Event:**
   ```sql
   SELECT * FROM email_events 
   WHERE user_id = 'your_user_id' 
   AND template_slug = 'welcome-1';
   ```
   - ✅ Should see one row with `status = 'queued'`

---

## Summary

### ✅ **What's Working:**
- Account creation (signup form)
- Profile auto-creation (database trigger)
- Email verification handling (auth callback)
- Subscription status tracking
- Middleware protection
- Post-login routing
- Student profile creation
- Welcome email event queuing

### ❌ **What's Missing:**
- **Email verification sending** (Supabase Dashboard config)
- **Email sending service** (for welcome emails - intentionally not implemented)
- **Service role key** (recommended for middleware, but has fallback)

### 🎯 **Next Steps:**
1. **Immediate:** Configure email verification in Supabase Dashboard
2. **Production:** Set up custom SMTP for email sending
3. **Future:** Implement email sending service for queued events

---

## Quick Answer

**YES, we are set up to handle account creations**, but you need to:

1. ✅ Run database migrations (if not already done)
2. ❌ Configure email verification in Supabase Dashboard
3. ⚠️ Add `SUPABASE_SERVICE_ROLE_KEY` to environment variables (recommended)

The code is ready - it just needs Supabase Dashboard configuration for email sending.

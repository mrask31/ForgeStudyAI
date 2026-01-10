# Subscription Status Security - Setup Instructions

## ✅ Implementation Complete

The secure onboarding flow has been implemented using **Status-Based Access Control**. Users can no longer access the app without completing payment.

---

## 📋 What Was Implemented

### 1. Database Schema (`supabase_subscription_status_migration.sql`)
- Added `subscription_status` column to `profiles` table (default: `'pending_payment'`)
- Added `stripe_customer_id` column for Stripe customer tracking
- Added `stripe_subscription_id` column for subscription tracking
- Created database trigger to auto-create profiles with correct status on user signup
- Added indexes for performance

**Status Values:**
- `pending_payment` - Account created but payment not completed
- `trialing` - Active subscription in 7-day free trial
- `active` - Active paid subscription
- `past_due` - Payment failed, subscription needs attention
- `canceled` - Subscription canceled

### 2. Stripe Webhook (`src/app/api/stripe/webhook/route.ts`)
- Handles `checkout.session.completed` - Updates status to `trialing`/`active` on successful payment
- Handles `customer.subscription.updated` - Updates status on subscription changes
- Handles `customer.subscription.deleted` - Updates status to `canceled`
- Verifies Stripe webhook signatures for security

### 3. Middleware Protection (`middleware.ts`)
- Checks subscription status for all protected routes
- Blocks access if status is not `active` or `trialing`
- Redirects unpaid users to `/billing/payment-required`

### 4. Payment Required Page (`src/app/(app)/billing/payment-required/page.tsx`)
- Clear messaging explaining payment is required
- Button to start checkout flow
- Shown to users who try to access app without payment

### 5. Updated Cancel Page (`src/app/(app)/billing/cancel/page.tsx`)
- Removed "Continue to Tutor" link (prevents access)
- Added "Complete Payment Setup" button
- Clear messaging that payment is required

### 6. Auth Callback (`src/app/auth/callback/route.ts`)
- Ensures profile exists with correct status on email verification
- Creates profile if missing

---

## 🚀 Setup Steps

### Step 1: Run Database Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the entire contents of `supabase_subscription_status_migration.sql`
3. Paste into SQL Editor and click **Run**
4. Verify columns were added: Check `profiles` table in Table Editor

### Step 2: Set Up Stripe Webhook

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter endpoint URL:
   - **Development:** `https://your-app.vercel.app/api/stripe/webhook`
   - **Local testing:** Use Stripe CLI (see below)
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_...`)

### Step 3: Add Webhook Secret to Environment Variables

Add to your `.env.local` (and production environment):

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Important:** Use different secrets for development and production!

### Step 4: Test Locally with Stripe CLI (Optional)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will give you a webhook signing secret for local testing.

---

## 🔒 How It Works

### User Flow:

1. **User signs up** → Account created with `subscription_status = 'pending_payment'`
2. **User verifies email** → Profile confirmed, status remains `pending_payment`
3. **User redirected to Stripe checkout** → Enters payment info
4. **Payment succeeds:**
   - Stripe sends webhook to `/api/stripe/webhook`
   - Webhook updates `subscription_status` to `trialing` or `active`
   - User can now access the app
5. **Payment cancelled:**
   - Status remains `pending_payment`
   - User cannot access protected routes
   - Middleware redirects to `/billing/payment-required`

### Security:

- ✅ Middleware checks status on every protected route request
- ✅ Webhook signature verification prevents unauthorized updates
- ✅ No access without active subscription
- ✅ Users can retry checkout without re-signup

---

## 🧪 Testing Checklist

- [ ] Run database migration
- [ ] Set up Stripe webhook endpoint
- [ ] Add `STRIPE_WEBHOOK_SECRET` to environment variables
- [ ] Test signup flow:
  - [ ] Sign up → Verify email → Checkout → Success → Can access app
  - [ ] Sign up → Verify email → Cancel checkout → Cannot access app
- [ ] Test retry flow:
  - [ ] Cancel checkout → Click "Complete Payment Setup" → Checkout → Success
- [ ] Verify webhook updates status correctly (check Stripe Dashboard → Webhooks → View logs)

---

## 📝 Notes

- **Existing Users:** The migration sets all existing users to `pending_payment` status. You may want to manually update existing paying customers.
- **Webhook Testing:** Use Stripe Dashboard → Webhooks → Send test webhook to test your endpoint
- **Monitoring:** Check Stripe Dashboard → Webhooks → Logs for webhook delivery status

---

## 🐛 Troubleshooting

### Users can still access app without payment
- Check that middleware is running (check console for errors)
- Verify profile has `subscription_status` set correctly
- Check webhook is receiving events (Stripe Dashboard → Webhooks → Logs)

### Webhook not updating status
- Verify `STRIPE_WEBHOOK_SECRET` is set correctly
- Check webhook signature verification in logs
- Ensure webhook endpoint is accessible (not blocked by firewall)
- Check Stripe Dashboard → Webhooks → Logs for delivery errors

### Profile not created on signup
- Check database trigger was created (`handle_new_user` function)
- Verify trigger is active in Supabase Dashboard
- Check auth callback is creating profile as fallback


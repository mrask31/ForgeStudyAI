# Secure Onboarding & Payment Flow Plan

## 🚨 Current Problem

**Critical Security Flaw:** Users can create an account, verify email, cancel checkout, and STILL access the full app without payment. This allows free access to paid features.

### Current Flow (BROKEN):
1. User clicks pricing card → redirected to `/signup?plan=monthly`
2. User signs up → **Account created immediately**
3. User verifies email → **Logged in, account active**
4. User redirected to Stripe checkout
5. User cancels checkout → **Still logged in, can access `/tutor`**

**Result:** User has full access without payment!

---

## ✅ Recommended Solution: Account Status Tracking

### Option 1: Status-Based Access Control (RECOMMENDED)

**Flow:**
1. User signs up → Account created with status: `pending_payment`
2. User verifies email → Account verified, but status remains `pending_payment`
3. User redirected to Stripe checkout
4. **Checkout Success:**
   - Stripe webhook updates account status to `active` or `trialing`
   - User can now access app
5. **Checkout Cancel:**
   - Account status remains `pending_payment`
   - User redirected to cancel page with message
   - Middleware blocks access to protected routes
   - Account can be cleaned up after X days (optional)

**Database Schema Addition:**
```sql
ALTER TABLE profiles ADD COLUMN subscription_status TEXT DEFAULT 'pending_payment';
-- Values: 'pending_payment', 'trialing', 'active', 'past_due', 'canceled', 'deleted'
ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN stripe_subscription_id TEXT;
```

**Middleware Protection:**
```typescript
// Check subscription status before allowing access
if (user && isProtectedRoute) {
  const profile = await getProfile(user.id)
  if (profile?.subscription_status !== 'active' && 
      profile?.subscription_status !== 'trialing') {
    return NextResponse.redirect('/billing/payment-required')
  }
}
```

**Pros:**
- ✅ Simple to implement
- ✅ Users can retry checkout without re-signup
- ✅ Account data preserved for analytics
- ✅ Can track conversion metrics
- ✅ Graceful handling of failures

**Cons:**
- ⚠️ Accounts created before payment (but access is blocked)

---

### Option 2: Payment-First (Account Created After Payment)

**Flow:**
1. User clicks pricing card → redirected to `/signup-checkout?plan=monthly`
2. **Single page with:**
   - Email + Password form (for account creation)
   - Stripe Elements (payment collection)
   - "Create Account & Start Trial" button
3. **On Submit:**
   - Collect payment info via Stripe Elements
   - Create Stripe Customer + Payment Method
   - Create Stripe Subscription (with trial)
   - **Only then** create Supabase account
   - Log user in
   - Redirect to success page

**Pros:**
- ✅ Account only created after payment
- ✅ No cleanup needed
- ✅ Single-step process (better UX)

**Cons:**
- ⚠️ More complex (Stripe Elements integration)
- ⚠️ Email verification happens after payment (or skipped)
- ⚠️ If payment fails, no account exists (harder retry flow)

---

### Option 3: Hybrid Approach (BEST UX)

**Flow:**
1. User clicks pricing card → `/signup-checkout?plan=monthly`
2. **Step 1: Collect Email + Password**
   - Create account with status: `pending_payment`
   - Send verification email
3. **Step 2: Email Verification**
   - User clicks verification link
   - Redirected to checkout with pre-filled email
4. **Step 3: Payment Collection**
   - Stripe Checkout (email pre-filled)
   - Payment succeeds → Webhook updates status to `trialing`
   - Payment cancelled → Account remains `pending_payment`, access blocked

**Pros:**
- ✅ Email verified before payment (better security)
- ✅ Clean separation of concerns
- ✅ Can retry checkout easily
- ✅ Access controlled by status

**Cons:**
- ⚠️ Two-step process (but necessary for email verification)

---

## 🎯 RECOMMENDED IMPLEMENTATION: Option 1 (Status-Based)

**Why Option 1?**
- Simplest to implement
- Most robust error handling
- Best user experience (can retry)
- Industry standard approach

### Implementation Steps:

1. **Add subscription status to profiles table**
2. **Create Stripe webhook endpoint** to update status on payment success
3. **Update middleware** to check subscription status
4. **Add payment-required page** for users without active subscriptions
5. **Update cancel page** to explain they need to complete payment
6. **Optional: Cleanup job** to delete `pending_payment` accounts after 7 days

---

## 📋 Implementation Checklist

### Phase 1: Database Schema
- [ ] Add `subscription_status` column to `profiles` table
- [ ] Add `stripe_customer_id` column
- [ ] Add `stripe_subscription_id` column
- [ ] Create migration script

### Phase 2: Stripe Webhook
- [ ] Create `/api/stripe/webhook` endpoint
- [ ] Handle `checkout.session.completed` event
- [ ] Update profile status to `trialing` or `active`
- [ ] Store Stripe customer/subscription IDs
- [ ] Handle subscription updates (canceled, past_due, etc.)

### Phase 3: Access Control
- [ ] Update middleware to check subscription status
- [ ] Create `/billing/payment-required` page
- [ ] Redirect unpaid users to payment page
- [ ] Update cancel page messaging

### Phase 4: Signup Flow Updates
- [ ] Set default `subscription_status = 'pending_payment'` on signup
- [ ] Update cancel page to prevent access
- [ ] Add retry checkout button to cancel page

### Phase 5: Optional Cleanup
- [ ] Create cleanup script for old `pending_payment` accounts
- [ ] Schedule or run periodically

---

## 🔒 Security Considerations

1. **Never allow access to protected routes without active subscription**
2. **Webhook must verify Stripe signature** (security)
3. **Idempotent webhook handling** (prevent duplicate processing)
4. **Rate limiting** on checkout endpoint
5. **Monitor for abuse** (multiple accounts, cancelled checkouts)

---

## 🧪 Testing Plan

1. **Test successful checkout flow:**
   - Signup → Verify → Checkout → Success → Access granted

2. **Test cancelled checkout:**
   - Signup → Verify → Cancel → Access denied

3. **Test retry flow:**
   - Cancel → Click retry → Checkout → Success → Access granted

4. **Test webhook handling:**
   - Mock Stripe webhook events
   - Verify status updates correctly

5. **Test edge cases:**
   - Payment failure
   - Expired checkout session
   - Multiple checkout attempts


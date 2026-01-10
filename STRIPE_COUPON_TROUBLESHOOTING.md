# Stripe Coupon Code Troubleshooting Guide

## ✅ Code Implementation Status

The coupon code functionality is **correctly implemented** in the checkout route:
- `allow_promotion_codes: true` is set ✅
- Promotion code field should appear in Stripe Checkout ✅

If the coupon code field is showing but codes aren't working, the issue is likely with the **coupon configuration in Stripe**, not the code.

---

## 🔍 Common Issues & Solutions

### 1. **Trial Period Compatibility** ⚠️ MOST LIKELY ISSUE

**Problem:** Some coupon types don't work well with subscriptions that have trial periods.

**Solution:**
- **Percentage-off coupons** (e.g., 20% off) work with trials
- **Amount-off coupons** (e.g., $10 off) may not apply during trial
- **Try creating a percentage-off coupon instead**

**How to check:**
- In Stripe Dashboard → Products → Coupons
- Look at the coupon type (percentage vs. amount)
- If it's amount-off, try creating a percentage-off coupon

---

### 2. **Coupon Restrictions**

**Check these settings in Stripe Dashboard:**

#### Product/Price Restrictions
- Is the coupon restricted to specific products?
- Does it apply to ALL products or only certain ones?
- **Fix:** Make sure the coupon applies to your subscription prices

#### Customer Restrictions
- Is it limited to "First time customers only"?
- Is it limited to specific customer emails?
- **Fix:** Remove customer restrictions or ensure the user meets them

#### Minimum Amount
- Does the coupon require a minimum purchase amount?
- **Fix:** Check if your subscription price meets the minimum

---

### 3. **Test vs Live Mode Mismatch**

**Problem:** Coupon created in Test mode won't work in Live mode (and vice versa).

**How to check:**
- Stripe Dashboard → Toggle between "Test mode" and "Live mode"
- Make sure the coupon exists in the mode you're testing
- Make sure your `STRIPE_SECRET_KEY` matches the mode

**Fix:**
- Create the coupon in the same mode you're testing
- Or switch your app to match the coupon's mode

---

### 4. **Coupon Expiration or Limits**

**Check in Stripe Dashboard:**
- Has the coupon expired? (Check "Valid until" date)
- Has it reached its redemption limit? (Check "Times redeemable")
- Is it deactivated? (Check if it's active)

**Fix:**
- Create a new coupon without expiration
- Increase or remove redemption limits
- Reactivate if deactivated

---

### 5. **Coupon Applies to Wrong Duration**

**Problem:** Some coupons are configured to apply only to the first billing cycle, but with a trial, the first charge happens after the trial.

**Solution:**
- In Stripe Dashboard → Coupon settings
- Check "Duration" setting:
  - "Once" - Applies to first charge (after trial)
  - "Forever" - Applies to all charges
  - "Repeating" - Applies for X months
- For subscriptions with trials, "Once" or "Forever" usually work best

---

## 🧪 Testing Steps

### Step 1: Verify Coupon in Stripe Dashboard

1. Go to **Stripe Dashboard** → **Products** → **Coupons**
2. Click on your coupon
3. Check:
   - ✅ Status: **Active**
   - ✅ Valid until: **Not expired** (or no expiration)
   - ✅ Times redeemable: **Not reached** (or unlimited)
   - ✅ Applies to: **All products** (or includes your subscription prices)
   - ✅ Type: **Percentage off** (recommended for trials)

### Step 2: Test the Coupon Directly in Stripe

1. Go to **Stripe Dashboard** → **Customers** → **Create test customer**
2. Go to **Subscriptions** → **Create subscription**
3. Select your price
4. Try applying the coupon code
5. If it works here but not in Checkout, the issue is with Checkout configuration
6. If it doesn't work here either, the issue is with the coupon itself

### Step 3: Check Your Environment

1. Verify you're using the correct Stripe mode:
   - Test mode: `sk_test_...`
   - Live mode: `sk_live_...`
2. Make sure the coupon exists in the same mode

### Step 4: Create a Simple Test Coupon

Create a new coupon with these settings:
- **Name:** TEST20
- **Type:** Percentage off
- **Percent off:** 20%
- **Duration:** Forever (or Once)
- **Applies to:** All products
- **No expiration**
- **No redemption limit**
- **No customer restrictions**

Test this simple coupon. If it works, the issue is with your original coupon's settings.

---

## 🔧 Recommended Coupon Configuration for Subscriptions with Trials

For best compatibility with subscriptions that have trial periods:

1. **Type:** Percentage off (not amount off)
2. **Duration:** "Once" (applies to first charge after trial) or "Forever"
3. **Applies to:** All products (or specifically your subscription prices)
4. **No expiration** (or set a far future date)
5. **No redemption limit** (or set a high limit)
6. **No customer restrictions** (unless specifically needed)

---

## 📝 Quick Checklist

Before reporting an issue, verify:

- [ ] Coupon is **Active** in Stripe Dashboard
- [ ] Coupon is in the **same mode** (test/live) as your app
- [ ] Coupon **hasn't expired**
- [ ] Coupon **hasn't reached redemption limit**
- [ ] Coupon **applies to your subscription prices**
- [ ] Coupon is **percentage-off** (not amount-off) for best trial compatibility
- [ ] No **customer restrictions** blocking the user
- [ ] No **minimum amount** requirement not met

---

## 🆘 Still Not Working?

If the coupon still doesn't work after checking all of the above:

1. **Check Stripe Webhook Logs:**
   - Stripe Dashboard → Webhooks → Your endpoint → Logs
   - Look for any errors related to the checkout session

2. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Look for any JavaScript errors when entering the coupon

3. **Try a Different Coupon:**
   - Create a brand new coupon with minimal restrictions
   - Test if that works

4. **Contact Stripe Support:**
   - If the coupon works in Stripe Dashboard but not in Checkout
   - They can check for account-level restrictions


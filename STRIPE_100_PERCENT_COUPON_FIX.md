# Fix for 100% Off Coupon Processing Error

## Problem

When using a **100% off coupon** with **"Duration: Once"** and a **7-day trial period**, Stripe returns a processing error because:

1. Coupon applies to the first billing cycle (after trial)
2. With 100% off, that first billing is $0
3. Stripe rejects $0 subscription charges

## Solution: Change Coupon Duration

### Option 1: Use "Forever" Duration (Recommended)

**Steps:**
1. Go to Stripe Dashboard → Products → Coupons
2. Open your coupon (e.g., "Free1")
3. Change **Duration** from "Once" to "Forever"
4. Save changes
5. Test checkout again

**Why this works:**
- "Forever" applies the discount to all billing cycles
- The subscription starts with 100% off immediately
- No $0 charge issue

**Note:** You can manually cancel or modify the subscription later if you only want the first month free.

### Option 2: Remove Trial Period for 100% Off Coupons

If you want to keep "Duration: Once", you would need to:
- Not set `trial_period_days` when a 100% off coupon is detected
- But this requires code changes and detecting the coupon before checkout
- Not recommended - easier to just use "Forever" duration

## Testing

After changing to "Forever" duration:
1. Clear your browser cache/cookies (or use incognito)
2. Go through checkout again
3. Apply the coupon code
4. Complete payment

The subscription should now process successfully.


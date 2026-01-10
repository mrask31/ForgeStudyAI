# Stripe Checkout Processing Error - Debugging Guide

## How to Check Stripe Logs

### 1. Stripe Dashboard → Events/Logs

1. **Go to Stripe Dashboard** → **Developers** → **Events**
   - URL: `https://dashboard.stripe.com/test/events` (test mode)
   - URL: `https://dashboard.stripe.com/events` (live mode)

2. **Filter by Time Range**
   - Select the time when you tried to complete checkout
   - Look for events related to your checkout session

3. **Look for These Event Types:**
   - `checkout.session.completed` - Successful checkout
   - `checkout.session.async_payment_failed` - Payment failed
   - `charge.failed` - Charge failed
   - `payment_intent.payment_failed` - Payment intent failed
   - `customer.subscription.created` - Subscription created

4. **Click on the Event** to see detailed error messages

### 2. Stripe Dashboard → Payments/Charges

1. **Go to Stripe Dashboard** → **Payments**
   - Look for failed payment attempts
   - Click on a failed payment to see error details

### 3. Stripe Dashboard → Logs (Detailed)

1. **Go to Stripe Dashboard** → **Developers** → **Logs**
   - Shows API request/response logs
   - More detailed than Events
   - Look for error responses from the API

---

## Common Errors and Solutions

### Error: "Your account cannot currently make live charges"
- **Cause:** Stripe account not fully activated
- **Solution:** Complete Stripe account activation (bank account, business info, etc.)

### Error: "card_declined" or "insufficient_funds"
- **Cause:** Test card issues or real card declined
- **Solution:** 
  - Test mode: Use test cards like `4242 4242 4242 4242`
  - Live mode: Card was declined by bank

### Error: "rate_limit" 
- **Cause:** Too many API requests
- **Solution:** Wait a few minutes and try again

### Error: "invalid_request_error"
- **Cause:** Invalid parameters in checkout session
- **Solution:** Check our checkout API route for issues

### Error: "api_key_expired" or "authentication_required"
- **Cause:** Invalid or expired API key
- **Solution:** Check `STRIPE_SECRET_KEY` environment variable

---

## Check Our Server Logs

Check your server console/terminal where `npm run dev` is running. Look for:

- `[Stripe Checkout]` log messages
- Any error stack traces
- API response errors

---

## Test Mode vs Live Mode

**Make sure you're testing in the right mode:**

- **Test Mode:** Use `sk_test_...` key and test cards
- **Live Mode:** Use `sk_live_...` key and real cards

Check which mode your `STRIPE_SECRET_KEY` is for.

---

## Quick Debugging Steps

1. **Check Stripe Dashboard → Events**
   - Find the checkout session attempt
   - Read the error message

2. **Check Server Logs**
   - Look for `[Stripe Checkout]` messages
   - Check for error stack traces

3. **Verify API Key**
   - Make sure `STRIPE_SECRET_KEY` is set correctly
   - Check if it matches the mode (test/live) you're testing in

4. **Try Test Cards**
   - Test mode: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC

5. **Check Stripe Account Status**
   - Go to Stripe Dashboard → Settings → Account
   - Make sure account is activated
   - Check for any warnings or required actions

---

## What to Share

If you need help, share:
1. The exact error message from Stripe Dashboard → Events
2. Any errors from your server console
3. Whether you're in test or live mode
4. The card type you're using (test card or real card)


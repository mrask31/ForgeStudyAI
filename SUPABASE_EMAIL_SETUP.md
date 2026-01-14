# Supabase Email Verification Setup

## Issue
Email verification emails are not being sent during signup. This is because Supabase email configuration needs to be set up in the Supabase Dashboard.

## Setup Steps

### Option 1: Use Supabase's Built-in Email Service (Easiest - Limited)

1. **Go to Supabase Dashboard** → Your Project → **Authentication** → **Email Templates**
2. **Enable Email Confirmation:**
   - Go to **Authentication** → **Settings** → **Auth**
   - Under "Email Auth", ensure **"Enable email confirmations"** is checked
   - Set **"Confirm email"** to `true`

3. **Configure Email Templates:**
   - Go to **Authentication** → **Email Templates**
   - Customize the "Confirm signup" template if needed
   - The default template should work, but you can customize the subject and body

4. **Limitations:**
   - Supabase's built-in email service has rate limits (typically 3-4 emails per hour per user)
   - Emails come from `noreply@mail.app.supabase.io` (not your domain)
   - Not suitable for production with high volume

### Option 2: Configure Custom SMTP (Recommended for Production)

1. **Get SMTP Credentials:**
   - Use a service like:
     - **Resend** (recommended, developer-friendly)
     - **SendGrid**
     - **Mailgun**
     - **Amazon SES**
     - **Postmark**

2. **Configure in Supabase:**
   - Go to **Project Settings** → **Auth** → **SMTP Settings**
   - Enable **"Enable Custom SMTP"**
   - Enter your SMTP credentials:
     - **Host:** (e.g., `smtp.resend.com` for Resend)
     - **Port:** (e.g., `587` or `465`)
     - **Username:** (your SMTP username/API key)
     - **Password:** (your SMTP password/API secret)
     - **Sender email:** (e.g., `noreply@forgestudy.com`)
     - **Sender name:** (e.g., `ForgeStudy Platform`)

3. **Example: Resend Setup:**
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: [Your Resend API Key]
   Sender email: noreply@forgestudy.com
   Sender name: ForgeStudy Platform
   ```

4. **Enable Email Confirmation:**
   - Go to **Authentication** → **Settings** → **Auth**
   - Ensure **"Enable email confirmations"** is checked

### Option 3: Use Supabase's Email Service with Custom Domain (Best for Production)

1. **Set up Custom Domain:**
   - Go to **Project Settings** → **Auth** → **Email Templates**
   - Configure a custom domain for email sending
   - This requires DNS configuration

2. **Enable Email Confirmation:**
   - Go to **Authentication** → **Settings** → **Auth**
   - Ensure **"Enable email confirmations"** is checked

## Verify Configuration

1. **Check Email Settings:**
   - Go to **Authentication** → **Settings** → **Auth**
   - Verify **"Enable email confirmations"** is `true`
   - Verify **"Secure email change"** is enabled if needed

2. **Test Email Sending:**
   - Try signing up with a test email
   - Check Supabase Dashboard → **Logs** → **Auth Logs** for email sending status
   - Check your email inbox (and spam folder)

3. **Check Email Templates:**
   - Go to **Authentication** → **Email Templates**
   - Verify the "Confirm signup" template is configured
   - The redirect URL should be: `{{ .SiteURL }}/auth/callback`

## Troubleshooting

### Emails Not Sending

1. **Check Supabase Logs:**
   - Go to **Logs** → **Auth Logs**
   - Look for errors related to email sending

2. **Verify SMTP Credentials:**
   - Test SMTP credentials with a tool like `telnet` or an SMTP tester
   - Ensure credentials are correct and not expired

3. **Check Rate Limits:**
   - Supabase has rate limits on email sending
   - If using built-in service, you may hit limits quickly
   - Consider upgrading to custom SMTP

4. **Verify Email Confirmation is Enabled:**
   - Go to **Authentication** → **Settings** → **Auth**
   - Ensure **"Enable email confirmations"** is checked

### Emails Going to Spam

1. **Configure SPF/DKIM Records:**
   - If using custom SMTP, ensure DNS records are configured
   - Your email provider (Resend, SendGrid, etc.) will provide DNS records

2. **Use a Custom Domain:**
   - Emails from `@mail.app.supabase.io` are more likely to be marked as spam
   - Use a custom domain for better deliverability

## Current Code Status

✅ **Code is ready** - The signup page (`src/app/(public)/signup/page.tsx`) is already configured to:
- Call `supabase.auth.signUp()` which triggers email sending
- Handle email verification state
- Provide a "Resend email" button
- Poll for verification status

❌ **Missing:** Supabase Dashboard email configuration

## Next Steps

1. **Immediate:** Configure email in Supabase Dashboard (Option 1 or 2 above)
2. **Production:** Set up custom SMTP with a service like Resend (Option 2)
3. **Long-term:** Consider custom domain email setup (Option 3)

## Additional Notes

- The email templates we created (`email_templates` table) are for **welcome emails after profile creation**, not for email verification
- Email verification is handled entirely by Supabase Auth
- The verification email redirects to `/auth/callback` which is already implemented

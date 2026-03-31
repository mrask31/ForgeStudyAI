'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const BASE_URL = process.env['NEXT_PUBLIC_APP_URL'] || 'https://www.forgestudyai.com'

/**
 * Create a parental consent record and send the consent email.
 * Called after creating a minor's student profile.
 */
export async function sendConsentEmail(studentProfileId: string, parentEmail: string, studentName: string) {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const token = randomUUID()

  // Insert parental consent record
  const { error: insertError } = await admin
    .from('parental_consents')
    .insert({
      student_profile_id: studentProfileId,
      parent_email: parentEmail,
      status: 'pending',
      token,
    })

  if (insertError) {
    console.error('[Consent] Failed to create consent record:', insertError)
    throw new Error('Failed to create consent record')
  }

  const approveUrl = `${BASE_URL}/api/consent/${token}?action=approve`
  const denyUrl = `${BASE_URL}/api/consent/${token}?action=deny`

  // Send email via Resend
  const resendKey = process.env['RESEND_API_KEY']
  if (!resendKey) {
    console.warn('[Consent] RESEND_API_KEY not configured — consent email not sent')
    return
  }

  const html = `
<h2 style="font-family: sans-serif; color: #1a1a2e;">Your child wants to join ForgeStudy AI</h2>

<p style="font-family: sans-serif; color: #444;">
  A ForgeStudy AI account has been created for <strong>${studentName}</strong>. Before they can access the platform,
  we need your permission as their parent or guardian.
</p>

<h3 style="font-family: sans-serif; color: #1a1a2e;">What is ForgeStudy AI?</h3>
<p style="font-family: sans-serif; color: #444;">
  ForgeStudy AI is a COPPA-compliant AI tutoring platform for students in grades 6–12.
  It helps students study smarter using a Socratic AI tutor that asks guiding questions
  rather than giving away answers.
</p>

<h3 style="font-family: sans-serif; color: #1a1a2e;">What data do we collect?</h3>
<ul style="font-family: sans-serif; color: #444;">
  <li>Your child's first name and grade level</li>
  <li>Study session transcripts (used to personalize tutoring)</li>
  <li>School assignment titles synced from Canvas or Google Classroom (if connected)</li>
  <li>Mastery scores per subject (stored privately)</li>
</ul>
<p style="font-family: sans-serif; color: #444;">
  We never sell student data. We never show ads. All data is encrypted and stored securely.
  You can request deletion of your child's data at any time by emailing support@forgestudyai.com.
</p>

<p style="font-family: sans-serif; color: #444;">
  Please choose one of the options below:
</p>

<p style="text-align: center; margin: 32px 0;">
  <a href="${approveUrl}"
     style="background-color: #6c63ff; color: white; padding: 14px 28px; border-radius: 8px;
            text-decoration: none; font-family: sans-serif; font-weight: bold; display: inline-block; margin-right: 16px;">
    &#10003; Approve Account
  </a>
  <a href="${denyUrl}"
     style="background-color: #444; color: white; padding: 14px 28px; border-radius: 8px;
            text-decoration: none; font-family: sans-serif; font-weight: bold; display: inline-block;">
    &#10007; Deny Account
  </a>
</p>

<p style="font-family: sans-serif; color: #888; font-size: 13px;">
  This link expires in 7 days. If you did not expect this email, you can safely ignore it —
  the account will remain inactive without your approval.
</p>

<p style="font-family: sans-serif; color: #888; font-size: 13px;">
  Questions? Email us at support@forgestudyai.com<br>
  — The ForgeStudy AI Team<br>
  MJR Intelligence Group LLC | Webster Groves, MO
</p>
`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ForgeStudy AI <noreply@forgestudyai.com>',
        to: [parentEmail],
        subject: "Action Required: Approve your child's ForgeStudy AI account",
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[Consent] Resend API error:', res.status, body)
    } else {
      console.log('[Consent] Consent email sent to:', parentEmail)
    }
  } catch (err: any) {
    console.error('[Consent] Failed to send email:', err.message)
  }
}

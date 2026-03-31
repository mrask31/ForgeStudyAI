import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const action = request.nextUrl.searchParams.get('action')
  const { token } = params

  if (!token || !action || !['approve', 'deny'].includes(action)) {
    return htmlResponse('Invalid Link', 'This consent link is invalid or malformed.', false)
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Look up consent record
  const { data: consent, error: lookupError } = await admin
    .from('parental_consents')
    .select('id, student_profile_id, status, created_at')
    .eq('token', token)
    .single()

  if (lookupError || !consent) {
    return htmlResponse('Link Not Found', 'This consent link was not found or has already been used.', false)
  }

  // Check if already responded
  if (consent.status !== 'pending') {
    const alreadyMsg = consent.status === 'approved'
      ? 'This account has already been approved.'
      : 'This account has already been denied.'
    return htmlResponse('Already Responded', alreadyMsg, consent.status === 'approved')
  }

  // Check expiry (7 days)
  const created = new Date(consent.created_at)
  if (Date.now() - created.getTime() > 7 * 24 * 60 * 60 * 1000) {
    return htmlResponse('Link Expired', 'This consent link has expired. Please ask the account holder to resend the request.', false)
  }

  const newStatus = action === 'approve' ? 'approved' : 'denied'

  // Update parental_consents
  await admin
    .from('parental_consents')
    .update({ status: newStatus, responded_at: new Date().toISOString() })
    .eq('id', consent.id)

  // Update student_profiles.consent_status
  await admin
    .from('student_profiles')
    .update({ consent_status: newStatus })
    .eq('id', consent.student_profile_id)

  if (action === 'approve') {
    return htmlResponse(
      'Account Approved!',
      "Your child can now log in to ForgeStudy AI. Thank you for approving their account.",
      true
    )
  } else {
    return htmlResponse(
      'Account Denied',
      "Your child's account has been deactivated. If you think this was a mistake, email support@forgestudyai.com.",
      false
    )
  }
}

function htmlResponse(title: string, message: string, success: boolean) {
  const color = success ? '#6c63ff' : '#666'
  const icon = success ? '&#10003;' : '&#10007;'

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ForgeStudy AI</title></head>
<body style="margin:0;padding:40px 20px;font-family:system-ui,sans-serif;background:#f8f9fa;text-align:center;">
  <div style="max-width:480px;margin:60px auto;background:white;border-radius:16px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="width:64px;height:64px;border-radius:50%;background:${color};color:white;font-size:28px;line-height:64px;margin:0 auto 20px;font-weight:bold;">${icon}</div>
    <h1 style="color:#1a1a2e;font-size:24px;margin-bottom:12px;">${title}</h1>
    <p style="color:#555;font-size:16px;line-height:1.6;">${message}</p>
    <p style="margin-top:32px;"><a href="https://www.forgestudyai.com" style="color:${color};text-decoration:none;font-weight:600;">Go to ForgeStudy AI &rarr;</a></p>
    <p style="color:#aaa;font-size:12px;margin-top:24px;">MJR Intelligence Group LLC | Webster Groves, MO</p>
  </div>
</body></html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

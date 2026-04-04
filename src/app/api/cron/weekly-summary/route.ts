import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/weekly-summary
 * Weekly cron (Sunday 10am): sends a teacher-ready weekly summary
 * email to each parent via Resend. CCs teacher if configured.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const now = new Date()
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const dateRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

    // Get all student profiles with parent info
    const { data: profiles } = await supabase
      .from('student_profiles')
      .select('id, display_name, owner_id, grade_band, grade')

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ summaries: 0 })
    }

    let emailsSent = 0

    for (const profile of profiles) {
      // Get parent profile (for email, teacher info)
      const { data: parentProfile } = await supabase
        .from('profiles')
        .select('id, teacher_email, teacher_name')
        .eq('id', profile.owner_id)
        .single()

      // Get parent auth email
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.owner_id)
      const parentEmail = authUser?.user?.email
      if (!parentEmail) continue

      // Count sessions this week
      const { count: sessionsCount } = await supabase
        .from('mastery_checks')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profile.id)
        .gte('created_at', sevenDaysAgo)

      // Get mastery scores with changes
      const { data: masteryScores } = await supabase
        .from('mastery_scores')
        .select('score, sessions_count, student_classes!inner(name)')
        .eq('profile_id', profile.id)

      const { data: masteryChanges } = await supabase
        .from('mastery_checks')
        .select('class_id, score_delta, student_classes!inner(name)')
        .eq('profile_id', profile.id)
        .gte('created_at', sevenDaysAgo)

      // Aggregate mastery changes
      const courseDeltas = new Map<string, { name: string; delta: number }>()
      for (const check of masteryChanges || []) {
        const name = (check as any).student_classes?.name || 'Unknown'
        const existing = courseDeltas.get(check.class_id) || { name, delta: 0 }
        existing.delta += check.score_delta || 0
        courseDeltas.set(check.class_id, existing)
      }

      // Get portfolio entries this week
      const { data: newEntries } = await supabase
        .from('portfolio_entries')
        .select('title, type, content')
        .eq('profile_id', profile.id)
        .gte('created_at', sevenDaysAgo)

      // Get upcoming assignments
      const { data: upcoming } = await supabase
        .from('manual_assignments')
        .select('title, due_date')
        .eq('profile_id', profile.id)
        .gte('due_date', now.toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(3)

      // Build subjects list
      const subjects = (masteryScores || [])
        .map((s: any) => s.student_classes?.name)
        .filter(Boolean)
        .join(', ')

      // Build mastery progress section
      const masteryLines = (masteryScores || []).map((s: any) => {
        const name = s.student_classes?.name || 'Unknown'
        const delta = courseDeltas.get(name)?.delta
        const deltaStr = delta ? ` (${delta >= 0 ? '+' : ''}${delta})` : ' (no sessions this week)'
        const emoji = delta && delta > 10 ? ' ✅' : delta && delta > 0 ? ' 📈' : ''
        return `• ${name}: ${s.score}/100${deltaStr}${emoji}`
      }).join('\n')

      // Build notable moments section
      const notableMoments = (newEntries || []).map((e: any) => {
        return `• ${e.content || e.title}`
      }).join('\n')

      // Build upcoming section
      const upcomingLines = (upcoming || []).map((a: any) => {
        const dueDate = new Date(a.due_date)
        const day = dueDate.toLocaleDateString('en-US', { weekday: 'long' })
        return `• ${a.title} — ${day}`
      }).join('\n')

      const studentName = profile.display_name || 'Your student'

      const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
  <h2 style="color: #1a1a2e;">Hi there,</h2>
  <p>Here's ${studentName}'s learning summary for the week of ${dateRange}.</p>

  <h3 style="margin-top: 24px;">📊 THIS WEEK</h3>
  <ul style="list-style: none; padding: 0;">
    <li>• Total study sessions: ${sessionsCount || 0}</li>
    ${subjects ? `<li>• Subjects studied: ${subjects}</li>` : ''}
  </ul>

  ${masteryLines ? `
  <h3 style="margin-top: 24px;">🧠 MASTERY PROGRESS</h3>
  <pre style="font-family: inherit; white-space: pre-wrap;">${masteryLines}</pre>
  ` : ''}

  ${notableMoments ? `
  <h3 style="margin-top: 24px;">💡 NOTABLE MOMENTS</h3>
  <pre style="font-family: inherit; white-space: pre-wrap;">${notableMoments}</pre>
  ` : ''}

  ${upcomingLines ? `
  <h3 style="margin-top: 24px;">📅 UPCOMING</h3>
  <pre style="font-family: inherit; white-space: pre-wrap;">${upcomingLines}</pre>
  ` : ''}

  <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
  <p style="color: #6b7280; font-size: 13px;">
    Want to share this with ${studentName}'s teacher?<br>
    Simply forward this email — it contains everything a teacher needs to understand how ${studentName} learns and what they're working on.
  </p>

  <p style="margin-top: 24px;">Keep it up, ${studentName}! 🎉</p>
  <p style="color: #6b7280; font-size: 13px;">— The ForgeStudy Team<br>forgestudyai.com</p>
</div>`

      // Send via Resend (or log if no key)
      if (!resendKey) {
        console.log(`[Weekly Summary] Email for ${studentName}:\n`, emailHtml.replace(/<[^>]+>/g, ''))
        emailsSent++
        continue
      }

      const recipients = [parentEmail]
      const ccRecipients: string[] = []
      if (parentProfile?.teacher_email) {
        ccRecipients.push(parentProfile.teacher_email)
      }

      try {
        const emailBody: any = {
          from: 'ForgeStudy AI <noreply@forgestudyai.com>',
          to: recipients,
          subject: `📚 ${studentName}'s Weekly Study Summary — ${dateRange}`,
          html: emailHtml,
        }
        if (ccRecipients.length > 0) {
          emailBody.cc = ccRecipients
        }

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailBody),
        })

        if (!res.ok) {
          const err = await res.text()
          console.error(`[Weekly Summary] Failed to send email for ${studentName}:`, err)
        } else {
          console.log(`[Weekly Summary] Email sent for ${studentName} to ${parentEmail}${ccRecipients.length ? ` (CC: ${ccRecipients.join(', ')})` : ''}`)
          emailsSent++
        }
      } catch (emailErr: any) {
        console.error(`[Weekly Summary] Email error for ${studentName}:`, emailErr.message)
      }
    }

    return NextResponse.json({ emailsSent })
  } catch (error: any) {
    console.error('[Weekly Summary] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

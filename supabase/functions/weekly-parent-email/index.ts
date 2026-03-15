/**
 * Weekly Parent Intelligence Email
 *
 * Supabase Edge Function — runs every Sunday at 8am CT via cron.
 * For each parent: query their students' study activity from the past 7 days,
 * build a summary, and send via Mailchimp transactional API.
 * Logs send in email_events to prevent duplicates.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAILCHIMP_API_KEY = Deno.env.get('MAILCHIMP_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FROM_EMAIL = 'hello@forgestudy.com';
const TEMPLATE_SLUG = 'weekly-parent-summary';

interface StudentSummary {
  displayName: string;
  topicsStudied: number;
  masteryChange: number;
  averageMastery: number;
  upcomingDueDates: Array<{ title: string; dueDate: string }>;
  studyStreak: number;
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Get all parents (users who own student profiles)
    const { data: parents, error: parentsError } = await supabase
      .from('student_profiles')
      .select('owner_id')
      .order('owner_id');

    if (parentsError || !parents) {
      return new Response(JSON.stringify({ error: 'Failed to fetch parents' }), { status: 500 });
    }

    // Deduplicate parent IDs
    const parentIds = [...new Set(parents.map((p: any) => p.owner_id))];
    let sentCount = 0;
    let skippedCount = 0;

    for (const parentId of parentIds) {
      // 2. Check for duplicate — skip if already sent this week
      const { data: existingEvent } = await supabase
        .from('email_events')
        .select('id')
        .eq('user_id', parentId)
        .eq('template_slug', TEMPLATE_SLUG)
        .gte('created_at', weekAgo.toISOString())
        .limit(1)
        .maybeSingle();

      if (existingEvent) {
        skippedCount++;
        continue;
      }

      // 3. Get parent email
      const { data: authUser } = await supabase.auth.admin.getUserById(parentId);
      if (!authUser?.user?.email) {
        skippedCount++;
        continue;
      }

      // 4. Get parent's students
      const { data: students } = await supabase
        .from('student_profiles')
        .select('id, display_name')
        .eq('owner_id', parentId);

      if (!students || students.length === 0) {
        skippedCount++;
        continue;
      }

      const studentSummaries: StudentSummary[] = [];

      for (const student of students) {
        // Topics studied (topics with last_studied_at in past 7 days)
        const { data: studiedTopics } = await supabase
          .from('study_topics')
          .select('id, title, mastery_score')
          .eq('profile_id', student.id)
          .gte('last_studied_at', weekAgo.toISOString());

        const topicsStudied = studiedTopics?.length || 0;

        // All active topics for average mastery
        const { data: allTopics } = await supabase
          .from('study_topics')
          .select('mastery_score')
          .eq('profile_id', student.id)
          .gte('orbit_state', 1);

        const avgMastery = allTopics && allTopics.length > 0
          ? Math.round(allTopics.reduce((sum: number, t: any) => sum + (t.mastery_score || 0), 0) / allTopics.length)
          : 0;

        // Chat sessions count for study streak (distinct days with messages)
        const { data: recentChats } = await supabase
          .from('chats')
          .select('updated_at')
          .eq('user_id', parentId)
          .gte('updated_at', weekAgo.toISOString())
          .order('updated_at', { ascending: true });

        const uniqueDays = new Set(
          (recentChats || []).map((c: any) =>
            new Date(c.updated_at).toISOString().split('T')[0]
          )
        );
        const studyStreak = uniqueDays.size;

        // Upcoming due dates (next 7 days)
        const { data: assignments } = await supabase
          .from('synced_assignments')
          .select('title, due_date')
          .eq('student_id', student.id)
          .gte('due_date', now.toISOString())
          .lte('due_date', weekAhead.toISOString())
          .order('due_date', { ascending: true })
          .limit(5);

        studentSummaries.push({
          displayName: student.display_name || 'Student',
          topicsStudied,
          masteryChange: 0, // Simplified — would need historical snapshot
          averageMastery: avgMastery,
          upcomingDueDates: (assignments || []).map((a: any) => ({
            title: a.title,
            dueDate: a.due_date,
          })),
          studyStreak,
        });
      }

      // 5. Build email HTML
      const emailHtml = buildEmailHtml(studentSummaries);

      // 6. Send via Mailchimp Transactional API (Mandrill)
      if (MAILCHIMP_API_KEY) {
        try {
          const mandrillRes = await fetch('https://mandrillapp.com/api/1.0/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: MAILCHIMP_API_KEY,
              message: {
                from_email: FROM_EMAIL,
                from_name: 'ForgeStudy',
                to: [{ email: authUser.user.email, type: 'to' }],
                subject: 'Weekly Learning Update — ForgeStudy',
                html: emailHtml,
                tags: ['weekly-summary'],
              },
            }),
          });

          const sendResult = await mandrillRes.json();
          const status = Array.isArray(sendResult) && sendResult[0]?.status === 'sent'
            ? 'sent'
            : 'failed';

          // 7. Log in email_events
          await supabase.from('email_events').insert({
            user_id: parentId,
            template_slug: TEMPLATE_SLUG,
            status,
            metadata: {
              studentCount: students.length,
              summaries: studentSummaries.map(s => ({
                name: s.displayName,
                topicsStudied: s.topicsStudied,
                avgMastery: s.averageMastery,
              })),
            },
          });

          if (status === 'sent') sentCount++;
          else skippedCount++;
        } catch (sendError) {
          console.error(`[WeeklyEmail] Send failed for ${parentId}:`, sendError);
          await supabase.from('email_events').insert({
            user_id: parentId,
            template_slug: TEMPLATE_SLUG,
            status: 'failed',
            metadata: { error: String(sendError) },
          });
          skippedCount++;
        }
      } else {
        // No API key — log as skipped
        await supabase.from('email_events').insert({
          user_id: parentId,
          template_slug: TEMPLATE_SLUG,
          status: 'skipped',
          metadata: { reason: 'no_api_key' },
        });
        skippedCount++;
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, skipped: skippedCount, total: parentIds.length }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[WeeklyEmail] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});

function buildEmailHtml(summaries: StudentSummary[]): string {
  const studentBlocks = summaries.map(s => {
    const dueDatesHtml = s.upcomingDueDates.length > 0
      ? s.upcomingDueDates.map(d => {
          const date = new Date(d.dueDate).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
          });
          return `<li style="margin:4px 0;color:#cbd5e1;">${d.title} — <strong>${date}</strong></li>`;
        }).join('')
      : '<li style="color:#64748b;">No upcoming assignments</li>';

    return `
      <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:16px;">
        <h2 style="color:#e2e8f0;margin:0 0 16px 0;font-size:20px;">${s.displayName}</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#94a3b8;">Topics Studied</td>
            <td style="padding:8px 0;color:#e2e8f0;text-align:right;font-weight:bold;">${s.topicsStudied}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94a3b8;">Average Mastery</td>
            <td style="padding:8px 0;color:#818cf8;text-align:right;font-weight:bold;">${s.averageMastery}%</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94a3b8;">Study Streak</td>
            <td style="padding:8px 0;color:#e2e8f0;text-align:right;font-weight:bold;">${s.studyStreak} day${s.studyStreak !== 1 ? 's' : ''}</td>
          </tr>
        </table>
        <div style="margin-top:16px;">
          <h3 style="color:#94a3b8;font-size:14px;margin:0 0 8px 0;">Upcoming Due Dates</h3>
          <ul style="list-style:none;padding:0;margin:0;">${dueDatesHtml}</ul>
        </div>
      </div>`;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="color:#e2e8f0;font-size:24px;margin:0;">Weekly Learning Update</h1>
          <p style="color:#64748b;margin:8px 0 0 0;">Here's how your students did this week</p>
        </div>
        ${studentBlocks}
        <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #334155;">
          <p style="color:#475569;font-size:12px;margin:0;">
            ForgeStudy AI — The tutor that refuses to cheat.
          </p>
        </div>
      </div>
    </body>
    </html>`;
}

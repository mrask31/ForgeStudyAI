import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET /api/parent/dashboard?profileId=xxx
 * Returns real data for the parent dashboard:
 * - Topics studied this week
 * - Average mastery score
 * - Mastered topics count (>70%)
 * - Upcoming due dates (next 7 days)
 * - Last study session timestamp
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get('profileId');

  if (!profileId) {
    return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set(name, value, options); },
        remove(name: string, options: CookieOptions) { cookieStore.delete({ name, ...options }); },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify profile belongs to user
  const { data: profile } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('id', profileId)
    .eq('owner_id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Fetch all study topics for this profile
  const { data: topics } = await supabase
    .from('study_topics')
    .select('id, title, mastery_score, orbit_state, last_studied_at, next_review_date, subject')
    .eq('profile_id', profileId)
    .gte('orbit_state', 1);

  const allTopics = topics || [];

  // Topics studied this week (last_studied_at within 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const topicsStudiedThisWeek = allTopics.filter(t =>
    t.last_studied_at && new Date(t.last_studied_at) >= sevenDaysAgo
  ).length;

  // Average mastery score
  const scoredTopics = allTopics.filter(t => typeof t.mastery_score === 'number');
  const averageMastery = scoredTopics.length > 0
    ? Math.round(scoredTopics.reduce((sum, t) => sum + t.mastery_score, 0) / scoredTopics.length)
    : 0;

  // Mastered topics (>70%)
  const masteredCount = allTopics.filter(t => t.mastery_score >= 70).length;

  // Upcoming due dates (next 7 days from synced_assignments)
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const { data: assignments } = await supabase
    .from('synced_assignments')
    .select('id, title, due_date, course_name')
    .eq('student_id', profileId)
    .gte('due_date', now.toISOString())
    .lte('due_date', nextWeek.toISOString())
    .order('due_date', { ascending: true })
    .limit(10);

  const upcomingDueDates = (assignments || []).map(a => ({
    title: a.title,
    dueDate: a.due_date,
    courseName: a.course_name,
  }));

  // Last study session (most recent last_studied_at)
  const studiedTopics = allTopics
    .filter(t => t.last_studied_at)
    .sort((a, b) => new Date(b.last_studied_at!).getTime() - new Date(a.last_studied_at!).getTime());

  const lastStudySession = studiedTopics.length > 0 ? studiedTopics[0].last_studied_at : null;

  return NextResponse.json({
    topicsStudiedThisWeek,
    averageMastery,
    masteredCount,
    totalTopics: allTopics.length,
    upcomingDueDates,
    lastStudySession,
  });
}

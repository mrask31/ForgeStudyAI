import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * POST /api/streak — Update streak after a chat session
 * Called after each chat message to maintain streak data.
 */
export async function POST(req: Request) {
  const { profileId } = await req.json();

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

  // Get current profile streak data
  const { data: profile, error: profileError } = await supabase
    .from('student_profiles')
    .select('current_streak_days, longest_streak_days, last_study_date')
    .eq('id', profileId)
    .eq('owner_id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const lastStudy = profile.last_study_date;

  // Already studied today — no update needed
  if (lastStudy === today) {
    return NextResponse.json({
      current_streak_days: profile.current_streak_days,
      longest_streak_days: profile.longest_streak_days,
    });
  }

  let newStreak = 1;

  if (lastStudy) {
    const lastDate = new Date(lastStudy);
    const todayDate = new Date(today);
    const diffMs = todayDate.getTime() - lastDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day — increment streak
      newStreak = profile.current_streak_days + 1;
    } else {
      // Gap > 1 day — reset streak
      newStreak = 1;
    }
  }

  const newLongest = Math.max(newStreak, profile.longest_streak_days);

  const { error: updateError } = await supabase
    .from('student_profiles')
    .update({
      current_streak_days: newStreak,
      longest_streak_days: newLongest,
      last_study_date: today,
    })
    .eq('id', profileId)
    .eq('owner_id', user.id);

  if (updateError) {
    console.error('[Streak] Update failed:', updateError);
    return NextResponse.json({ error: 'Failed to update streak' }, { status: 500 });
  }

  return NextResponse.json({
    current_streak_days: newStreak,
    longest_streak_days: newLongest,
  });
}

/**
 * GET /api/streak?profileId=xxx — Get current streak
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

  const { data: profile, error } = await supabase
    .from('student_profiles')
    .select('current_streak_days, longest_streak_days, last_study_date')
    .eq('id', profileId)
    .eq('owner_id', user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ current_streak_days: 0, longest_streak_days: 0 });
  }

  // Check if streak is still valid (last study was today or yesterday)
  const today = new Date().toISOString().split('T')[0];
  const lastStudy = profile.last_study_date;
  let currentStreak = profile.current_streak_days;

  if (lastStudy && lastStudy !== today) {
    const lastDate = new Date(lastStudy);
    const todayDate = new Date(today);
    const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) {
      currentStreak = 0; // Streak broken
    }
  }

  return NextResponse.json({
    current_streak_days: currentStreak,
    longest_streak_days: profile.longest_streak_days,
  });
}

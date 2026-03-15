/**
 * GET /api/share/[studentId]
 *
 * Public endpoint — no auth required.
 * Returns topic names, mastery colors, and aggregate stats for a student.
 * No chat content or private data exposed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  req: NextRequest,
  { params }: { params: { studentId: string } }
) {
  const { studentId } = params;

  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
  }

  // Use service-role client to bypass RLS for public read
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch student display name
  const { data: profile } = await supabase
    .from('student_profiles')
    .select('display_name, grade_band')
    .eq('id', studentId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  // Fetch active topics (orbit_state >= 1) — names and mastery only
  const { data: topics, error } = await supabase
    .from('study_topics')
    .select('id, title, mastery_score, orbit_state')
    .eq('profile_id', studentId)
    .gte('orbit_state', 1)
    .order('mastery_score', { ascending: false });

  if (error) {
    console.error('[Share API] Error:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }

  const topicList = topics || [];
  const totalMastery = topicList.length > 0
    ? Math.round(topicList.reduce((sum, t) => sum + (t.mastery_score || 0), 0) / topicList.length)
    : 0;

  return NextResponse.json({
    displayName: profile.display_name || 'Student',
    gradeBand: profile.grade_band,
    topicCount: topicList.length,
    overallMastery: totalMastery,
    topics: topicList.map(t => ({
      id: t.id,
      title: t.title,
      masteryScore: t.mastery_score || 0,
      orbitState: t.orbit_state,
    })),
  });
}

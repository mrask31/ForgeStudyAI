'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * Get study topics with mastery data for a student profile.
 *
 * Uses service role to bypass RLS on study_topics (RLS policies may not be
 * applied in production). Ownership is verified first via the anon-key
 * client so the caller's auth session is checked.
 */
export async function getStudyTopicsWithMastery(profileId: string) {
  // 1. Verify the logged-in user owns this profile (uses anon key + cookies → RLS on student_profiles)
  const supabase = createClient();
  const { data: profile, error: profileError } = await supabase
    .from('student_profiles')
    .select('id, owner_id')
    .eq('id', profileId)
    .single();

  if (profileError || !profile) {
    console.error('[getStudyTopicsWithMastery] Profile access denied or not found:', {
      profileId,
      error: profileError?.message,
      code: profileError?.code,
    });
    return [];
  }

  // 2. Query study_topics with service role to bypass potentially missing RLS policies
  const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: topics, error } = await supabaseAdmin
    .from('study_topics')
    .select('id, title, mastery_score, orbit_state, next_review_date, updated_at, last_studied_at')
    .eq('profile_id', profileId)
    .gte('orbit_state', 1)
    .order('mastery_score', { ascending: false });

  if (error) {
    console.error('[getStudyTopicsWithMastery] Query error:', {
      profileId,
      error: error.message,
      code: error.code,
    });
    return [];
  }

  console.log('[getStudyTopicsWithMastery] Returned', topics?.length ?? 0, 'topics for profile', profileId);
  return topics || [];
}

/**
 * Get count of quarantined topics (orbit_state = 0) for decontamination banner
 */
export async function getQuarantinedTopicsCount(profileId: string): Promise<number> {
  // Verify ownership via anon key (RLS on student_profiles)
  const supabase = createClient();
  const { data: profile, error: profileError } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('id', profileId)
    .single();

  if (profileError || !profile) {
    return 0;
  }

  // Use service role to count quarantined topics
  const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { count, error } = await supabaseAdmin
    .from('study_topics')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('orbit_state', 0);

  if (error) {
    console.error('[getQuarantinedTopicsCount] Error:', error);
    return 0;
  }

  return count || 0;
}

export interface CoursePlanet {
  courseId: string;
  courseName: string;
  topicCount: number;
  avgMastery: number;
  topics: { id: string; title: string; mastery_score: number; orbit_state: number; next_review_date: string | null; last_studied_at: string | null }[];
}

/** Get topics grouped by course for Galaxy planet view */
export async function getTopicsGroupedByCourse(profileId: string): Promise<CoursePlanet[]> {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('id', profileId)
    .single();
  if (!profile) return [];

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all active topics with their synced_assignment course info
  const { data: topics } = await admin
    .from('study_topics')
    .select('id, title, mastery_score, orbit_state, next_review_date, last_studied_at, synced_assignment_id')
    .eq('profile_id', profileId)
    .gte('orbit_state', 1)
    .order('mastery_score', { ascending: false });

  if (!topics || topics.length === 0) return [];

  const assignmentIds = topics.map(t => t.synced_assignment_id).filter(Boolean) as string[];

  // Get course info from synced_assignments
  const { data: assignments } = assignmentIds.length > 0
    ? await admin
        .from('synced_assignments')
        .select('id, course_id, course_name')
        .in('id', assignmentIds)
    : { data: [] };

  const assignmentMap = new Map((assignments || []).map(a => [a.id, { courseId: a.course_id, courseName: a.course_name }]));

  // Group topics by course
  const courseMap = new Map<string, CoursePlanet>();
  for (const topic of topics) {
    const courseInfo = topic.synced_assignment_id ? assignmentMap.get(topic.synced_assignment_id) : null;
    const courseId = courseInfo?.courseId || '__uncategorized__';
    const courseName = courseInfo?.courseName || 'Other Topics';

    if (!courseMap.has(courseId)) {
      courseMap.set(courseId, { courseId, courseName, topicCount: 0, avgMastery: 0, topics: [] });
    }
    const planet = courseMap.get(courseId)!;
    planet.topics.push({
      id: topic.id,
      title: topic.title,
      mastery_score: topic.mastery_score || 0,
      orbit_state: topic.orbit_state,
      next_review_date: topic.next_review_date,
      last_studied_at: topic.last_studied_at,
    });
    planet.topicCount++;
  }

  // Calculate averages
  for (const planet of Array.from(courseMap.values())) {
    const total = planet.topics.reduce((s, t) => s + t.mastery_score, 0);
    planet.avgMastery = planet.topicCount > 0 ? Math.round(total / planet.topicCount) : 0;
  }

  return Array.from(courseMap.values()).sort((a, b) => b.topicCount - a.topicCount);
}

/**
 * Update orbit_state for a topic (Airlock Release)
 *
 * Transitions quarantined topics from orbit_state = 0 to orbit_state = 1.
 * Called by SmartCTA when student clicks to begin a quarantined task.
 */
export async function updateOrbitState(topicId: string, newState: number): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('study_topics')
    .update({ orbit_state: newState })
    .eq('id', topicId);

  if (error) {
    console.error('[updateOrbitState] Error:', error);
    return false;
  }

  console.log('[updateOrbitState] Topic transitioned:', { topicId, newState });
  return true;
}

'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export interface CourseInfo {
  courseId: string;
  courseName: string;
  topicCount: number;
  avgMastery: number;
  upcomingDue: { title: string; dueDate: string }[];
}

export interface CourseDetail {
  courseId: string;
  courseName: string;
  topics: {
    id: string;
    title: string;
    mastery_score: number;
    orbit_state: number;
    last_studied_at: string | null;
    next_review_date: string | null;
  }[];
  assignments: {
    id: string;
    title: string;
    due_date: string | null;
    course_name: string;
    study_topic_id: string | null;
  }[];
  sessions: {
    id: string;
    status: string;
    topics_passed: number;
    topics_failed: number;
    created_at: string;
  }[];
}

/** List all courses for the active profile, derived from synced_assignments */
export async function getCourses(profileId: string): Promise<CourseInfo[]> {
  const supabase = createClient();
  // Verify ownership
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

  // Get all assignments for this student grouped by course
  const { data: assignments } = await admin
    .from('synced_assignments')
    .select('course_id, course_name, title, due_date, study_topic_id')
    .eq('student_id', profileId);

  if (!assignments || assignments.length === 0) return [];

  // Get all topics for mastery scores
  const { data: topics } = await admin
    .from('study_topics')
    .select('id, mastery_score')
    .eq('profile_id', profileId)
    .gte('orbit_state', 1);

  const topicMap = new Map((topics || []).map(t => [t.id, t.mastery_score || 0]));

  // Group by course
  const courseMap = new Map<string, { name: string; topicIds: string[]; dues: { title: string; dueDate: string }[] }>();
  for (const a of assignments) {
    if (!courseMap.has(a.course_id)) {
      courseMap.set(a.course_id, { name: a.course_name, topicIds: [], dues: [] });
    }
    const c = courseMap.get(a.course_id)!;
    if (a.study_topic_id) c.topicIds.push(a.study_topic_id);
    if (a.due_date && new Date(a.due_date) > new Date()) {
      c.dues.push({ title: a.title, dueDate: a.due_date });
    }
  }

  const result: CourseInfo[] = [];
  for (const [courseId, info] of Array.from(courseMap)) {
    const scores = info.topicIds.map(id => topicMap.get(id) ?? 0);
    const avgMastery = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const upcomingDue = info.dues
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 3);

    result.push({
      courseId,
      courseName: info.name,
      topicCount: info.topicIds.length,
      avgMastery,
      upcomingDue,
    });
  }

  return result.sort((a, b) => a.courseName.localeCompare(b.courseName));
}

/** Get detailed course data including topics, assignments, and session history */
export async function getCourseDetail(profileId: string, courseId: string): Promise<CourseDetail | null> {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('id', profileId)
    .single();
  if (!profile) return null;

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get assignments for this course
  const { data: assignments } = await admin
    .from('synced_assignments')
    .select('id, title, due_date, course_name, course_id, study_topic_id')
    .eq('student_id', profileId)
    .eq('course_id', courseId);

  if (!assignments || assignments.length === 0) return null;

  const courseName = assignments[0].course_name;
  const topicIds = assignments.map(a => a.study_topic_id).filter(Boolean) as string[];

  // Get topics
  const { data: topics } = topicIds.length > 0
    ? await admin
        .from('study_topics')
        .select('id, title, mastery_score, orbit_state, last_studied_at, next_review_date')
        .in('id', topicIds)
        .gte('orbit_state', 1)
        .order('mastery_score', { ascending: false })
    : { data: [] };

  // Get vault sessions that include any of these topics
  const { data: sessions } = topicIds.length > 0
    ? await admin
        .from('vault_sessions')
        .select('id, status, topics_passed, topics_failed, created_at')
        .eq('profile_id', profileId)
        .overlaps('topic_ids', topicIds)
        .order('created_at', { ascending: false })
        .limit(10)
    : { data: [] };

  return {
    courseId,
    courseName,
    topics: topics || [],
    assignments: assignments.map(a => ({
      id: a.id,
      title: a.title,
      due_date: a.due_date,
      course_name: a.course_name,
      study_topic_id: a.study_topic_id,
    })),
    sessions: sessions || [],
  };
}

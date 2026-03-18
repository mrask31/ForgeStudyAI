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

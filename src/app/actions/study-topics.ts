'use server';

import { createClient } from '@/lib/supabase/server';

export async function getStudyTopicsWithMastery(profileId: string) {
  const supabase = createClient();
  
  // Filter by orbit_state >= 1 to only show active/visible topics
  // This hides quarantined topics (orbit_state = 0) from automated email ingestion
  const { data: topics, error } = await supabase
    .from('study_topics')
    .select('id, title, mastery_score, orbit_state')
    .eq('profile_id', profileId)
    .gte('orbit_state', 1) // CRITICAL: Only show active topics
    .order('mastery_score', { ascending: false });
  
  if (error) {
    console.error('[getStudyTopicsWithMastery] Error:', error);
    return [];
  }
  
  return topics || [];
}

/**
 * Get count of quarantined topics (orbit_state = 0) for decontamination banner
 */
export async function getQuarantinedTopicsCount(profileId: string): Promise<number> {
  const supabase = createClient();
  
  const { count, error } = await supabase
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
 * This is the "Airlock Door" mechanism that transitions quarantined topics
 * from orbit_state = 0 (invisible) to orbit_state = 1 (active/visible).
 * 
 * Called by SmartCTA when student clicks to begin a quarantined task.
 * 
 * Requirements: 3.5
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
  
  console.log('[updateOrbitState] Topic transitioned:', {
    topicId,
    newState,
  });
  
  return true;
}

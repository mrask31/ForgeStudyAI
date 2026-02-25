'use server';

import { createClient } from '@/lib/supabase/server';

export async function getStudyTopicsWithMastery(profileId: string) {
  const supabase = createClient();
  
  const { data: topics, error } = await supabase
    .from('study_topics')
    .select('id, title, mastery_score')
    .eq('profile_id', profileId)
    .order('mastery_score', { ascending: false });
  
  if (error) {
    console.error('[getStudyTopicsWithMastery] Error:', error);
    return [];
  }
  
  return topics || [];
}

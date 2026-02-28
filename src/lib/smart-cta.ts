'use server';

import { createClient } from '@/lib/supabase/server';

export interface SmartCTAResult {
  label: string;
  action: string; // URL to navigate to
  reason: 'deadline' | 'low_mastery' | 'decay' | 'new' | 'quarantine' | 'vault';
  priority: number;
  topicId?: string;
  orbitState?: number; // 0 = quarantined, 1 = active, 2 = mastered, 3 = ghost
  vaultTopicIds?: string[]; // For Vault batch sessions
}

export async function calculateSmartCTA(
  userId: string,
  profileId: string
): Promise<SmartCTAResult> {
  const supabase = createClient();
  
  // 0. Check for Ghost Nodes (HIGHEST PRIORITY - The Vault)
  // If foundation is crumbling, we cannot let them learn new things
  const { data: ghostNodes } = await supabase
    .from('study_topics')
    .select('id, title')
    .eq('profile_id', profileId)
    .eq('orbit_state', 3) // Ghost Nodes
    .order('next_review_date', { ascending: true }) // Most overdue first
    .limit(5); // Cap at 5 per session
  
  if (ghostNodes && ghostNodes.length > 0) {
    return {
      label: `🔐 Review ${ghostNodes.length} Fading Memor${ghostNodes.length !== 1 ? 'ies' : 'y'}`,
      action: `/vault/session`, // Will be handled by SmartCTA to create session first
      reason: 'vault',
      priority: 0, // HIGHEST PRIORITY
      vaultTopicIds: ghostNodes.map(n => n.id),
    };
  }
  
  // 1. Check for upcoming deadlines (high priority)
  const { data: deadlines } = await supabase
    .from('homework_tasks')
    .select('*, homework_plans!inner(title, user_id)')
    .eq('homework_plans.user_id', userId)
    .gte('due_date', new Date().toISOString().split('T')[0])
    .lte('due_date', new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('due_date', { ascending: true })
    .limit(1);
  
  if (deadlines && deadlines.length > 0) {
    const task = deadlines[0];
    return {
      label: `Study for ${task.homework_plans.title}`,
      action: `/tutor?homework=${task.id}`,
      reason: 'deadline',
      priority: 1,
    };
  }
  
  // 2. Check for quarantined topics with imminent deadlines (high priority)
  // This is the "Airlock Door" - quarantined items can be surfaced by SmartCTA
  const { data: quarantinedTopics } = await supabase
    .from('study_topics')
    .select('*')
    .eq('profile_id', profileId)
    .eq('orbit_state', 0)
    .order('created_at', { ascending: true })
    .limit(1);
  
  if (quarantinedTopics && quarantinedTopics.length > 0) {
    const topic = quarantinedTopics[0];
    return {
      label: `Unpack New Mission: ${topic.title}`,
      action: `/tutor?topicId=${topic.id}&topicTitle=${encodeURIComponent(topic.title)}`,
      reason: 'quarantine',
      priority: 2,
      topicId: topic.id,
      orbitState: 0, // CRITICAL: Triggers airlock release sequence
    };
  }
  
  // 3. Check for low mastery topics (medium priority)
  const { data: lowMasteryTopics } = await supabase
    .from('study_topics')
    .select('*')
    .eq('profile_id', profileId)
    .gte('orbit_state', 1) // Only active topics
    .lt('mastery_score', 30)
    .order('mastery_score', { ascending: true })
    .limit(1);
  
  if (lowMasteryTopics && lowMasteryTopics.length > 0) {
    const topic = lowMasteryTopics[0];
    return {
      label: `Forge ${topic.title} Understanding`,
      action: `/tutor?topicId=${topic.id}&topicTitle=${encodeURIComponent(topic.title)}`,
      reason: 'low_mastery',
      priority: 3,
      topicId: topic.id,
      orbitState: topic.orbit_state || 1,
    };
  }
  
  // 4. Check for decay (topics not reviewed in 7+ days)
  const { data: decayTopics } = await supabase
    .from('study_topics')
    .select('id, title, mastery_score, updated_at, orbit_state')
    .eq('profile_id', profileId)
    .gte('orbit_state', 1) // Only active topics
    .gte('mastery_score', 30)
    .order('updated_at', { ascending: true })
    .limit(1);
  
  if (decayTopics && decayTopics.length > 0) {
    const topic = decayTopics[0];
    const daysSinceReview = topic.updated_at 
      ? Math.floor((Date.now() - new Date(topic.updated_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    if (daysSinceReview >= 7) {
      return {
        label: `Review ${topic.title}`,
        action: `/tutor?topicId=${topic.id}&topicTitle=${encodeURIComponent(topic.title)}`,
        reason: 'decay',
        priority: 4,
        topicId: topic.id,
        orbitState: topic.orbit_state || 1,
      };
    }
  }
  
  // 5. Default: Start new topic
  return {
    label: 'Start Studying',
    action: '/tutor',
    reason: 'new',
    priority: 5,
  };
}

/**
 * Backfill Script: Create study_topics for existing synced_assignments
 * 
 * This script processes all existing synced_assignments that don't have
 * corresponding study_topics yet and creates Galaxy nodes for them.
 * 
 * Run this once after deploying the LMS to Galaxy pipeline.
 */

import { createClient } from '@supabase/supabase-js';
import { AssignmentTopicExtractor } from './AssignmentTopicExtractor';

export async function backfillAssignmentTopics(
  supabaseUrl: string,
  supabaseKey: string,
  anthropicKey: string
): Promise<{
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
}> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const topicExtractor = new AssignmentTopicExtractor(anthropicKey);

  console.log('[Backfill] Starting backfill of synced_assignments to study_topics...');

  // Fetch all completed assignments that haven't been merged yet
  const { data: assignments, error } = await supabase
    .from('synced_assignments')
    .select('*')
    .eq('sync_status', 'completed')
    .or('merge_status.is.null,merge_status.eq.pending');

  if (error || !assignments) {
    console.error('[Backfill] Failed to fetch assignments:', error);
    return {
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
    };
  }

  console.log(`[Backfill] Found ${assignments.length} assignments to process`);

  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;

  for (const assignment of assignments) {
    try {
      console.log(`[Backfill] Processing assignment ${assignment.id}: ${assignment.title}`);

      // STEP 1: Get student's profile_id
      const { data: profile, error: profileError } = await supabase
        .from('student_profiles')
        .select('id, grade_band')
        .eq('owner_id', assignment.student_id)
        .single();

      if (profileError || !profile) {
        console.error(`[Backfill] Failed to find student profile for ${assignment.student_id}:`, profileError);
        
        await supabase
          .from('synced_assignments')
          .update({ merge_status: 'failed' })
          .eq('id', assignment.id);
        
        failureCount++;
        continue;
      }

      // STEP 2: Check if study_topic already exists
      const { data: existingTopic } = await supabase
        .from('study_topics')
        .select('id')
        .eq('synced_assignment_id', assignment.id)
        .single();

      if (existingTopic) {
        console.log(`[Backfill] Study topic already exists for assignment ${assignment.id}, skipping`);
        
        await supabase
          .from('synced_assignments')
          .update({
            merge_status: 'merged',
            study_topic_id: existingTopic.id,
          })
          .eq('id', assignment.id);
        
        skippedCount++;
        continue;
      }

      // STEP 3: Extract topic metadata using AI
      console.log(`[Backfill] Extracting topic metadata for "${assignment.title}"...`);
      
      const extracted = await topicExtractor.extractTopic(
        assignment.title,
        assignment.description,
        assignment.course_name
      );

      // STEP 4: Insert study_topic
      const now = new Date();
      const nextReviewDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day

      const { data: newTopic, error: topicError } = await supabase
        .from('study_topics')
        .insert({
          profile_id: profile.id,
          title: extracted.topic_name,
          description: extracted.description,
          subject: extracted.subject,
          grade_band: profile.grade_band,
          source: 'lms',
          orbit_state: 1, // Active - skip Quarantine for LMS
          mastery_score: 0,
          srs_ease_factor: 2.5, // SM-2 default
          srs_interval_days: 1,
          next_review_date: nextReviewDate.toISOString(),
          synced_assignment_id: assignment.id,
          metadata: {
            key_concepts: extracted.key_concepts,
            course_name: assignment.course_name,
            course_id: assignment.course_id,
            due_date: assignment.due_date,
          },
        })
        .select()
        .single();

      if (topicError || !newTopic) {
        console.error(`[Backfill] Failed to create study topic for assignment ${assignment.id}:`, topicError);
        
        await supabase
          .from('synced_assignments')
          .update({ merge_status: 'failed' })
          .eq('id', assignment.id);
        
        failureCount++;
        continue;
      }

      // STEP 5: Update synced_assignment
      await supabase
        .from('synced_assignments')
        .update({
          merge_status: 'merged',
          study_topic_id: newTopic.id,
        })
        .eq('id', assignment.id);

      console.log(`[Backfill] ✓ Created study topic ${newTopic.id} for assignment ${assignment.id}`);
      successCount++;

      // Rate limiting: wait 500ms between AI calls
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`[Backfill] Error processing assignment ${assignment.id}:`, error);
      
      await supabase
        .from('synced_assignments')
        .update({ merge_status: 'failed' })
        .eq('id', assignment.id);
      
      failureCount++;
    }
  }

  console.log('[Backfill] Backfill complete!');
  console.log(`  Total processed: ${assignments.length}`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failureCount}`);
  console.log(`  Skipped: ${skippedCount}`);

  return {
    totalProcessed: assignments.length,
    successCount,
    failureCount,
    skippedCount,
  };
}

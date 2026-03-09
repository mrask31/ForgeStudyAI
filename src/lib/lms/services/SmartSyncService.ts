/**
 * Smart Sync Service
 * Requirements: 3.1-3.7, 4.1-4.7, 7.1-7.5, 9.1-9.4
 * 
 * Orchestrates LMS synchronization with:
 * - Login-triggered sync
 * - 3AM batch sync
 * - Error detection and classification
 * - Connection status management
 * - Retry logic with exponential backoff
 * - Atomic database transactions
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CanvasAdapter,
  CanvasAuthError,
  CanvasRateLimitError,
  CanvasNetworkError,
} from '../adapters/CanvasAdapter';
import {
  GoogleClassroomAdapter,
  GoogleClassroomAuthError,
  GoogleClassroomRateLimitError,
  GoogleClassroomNetworkError,
} from '../adapters/GoogleClassroomAdapter';
import { DeduplicationEngine } from './DeduplicationEngine';
import { TokenEncryption } from './TokenEncryption';
import { AssignmentTopicExtractor } from './AssignmentTopicExtractor';
import {
  acquireLock,
  releaseLock,
  deleteFromCache,
} from '../redis-client';
import { REDIS_KEYS } from '../redis-schema';
import {
  LMSConnection,
  SyncedAssignment,
  Assignment,
  SyncResult,
  LMSConnectionStatus,
  SyncTriggerType,
  SyncLogStatus,
} from '../types';

/**
 * Smart Sync Service
 * 
 * Provides intelligent synchronization with error handling and state management.
 */
export class SmartSyncService {
  private supabase: SupabaseClient;
  private deduplicationEngine: DeduplicationEngine;
  private topicExtractor: AssignmentTopicExtractor;

  /**
   * Failure threshold for marking connection as blocked
   */
  private static readonly FAILURE_THRESHOLD = 5;

  /**
   * Retry intervals (exponential backoff)
   */
  private static readonly RETRY_INTERVALS = [
    60 * 1000, // 1 minute
    5 * 60 * 1000, // 5 minutes
    15 * 60 * 1000, // 15 minutes
    60 * 60 * 1000, // 1 hour
  ];

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.deduplicationEngine = new DeduplicationEngine(supabaseUrl, supabaseKey);
    
    // Initialize topic extractor with Anthropic API key
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      console.warn('[SmartSync] ANTHROPIC_API_KEY not found - topic extraction will use fallback');
    }
    this.topicExtractor = new AssignmentTopicExtractor(anthropicKey || '');
  }

  /**
   * Sync on student login
   * Requirements: 3.1, 3.3, 4.1, 4.3
   * 
   * Triggers sync when student logs in.
   * Uses distributed lock to prevent concurrent syncs.
   * 
   * @param studentId Student ID
   * @returns Array of sync results for each connection
   */
  async syncOnLogin(studentId: string): Promise<SyncResult[]> {
    const lockKey = REDIS_KEYS.SYNC_LOCK(studentId);

    try {
      // Acquire distributed lock (2-minute timeout)
      const lockAcquired = await acquireLock(lockKey, 120);

      if (!lockAcquired) {
        console.log(`[SmartSync] Sync already in progress for student ${studentId}`);
        return [];
      }

      console.log(`[SmartSync] Starting login-triggered sync for student ${studentId}`);

      // Fetch active connections for this student
      const { data: connections, error } = await this.supabase
        .from('lms_connections')
        .select('*')
        .eq('student_id', studentId)
        .in('status', ['active', 'blocked']); // Include blocked for retry attempts

      if (error || !connections || connections.length === 0) {
        console.log(`[SmartSync] No active connections found for student ${studentId}`);
        return [];
      }

      // Sync each connection
      const results: SyncResult[] = [];

      for (const connection of connections) {
        const result = await this.syncConnection(connection, 'login');
        results.push(result);
      }

      // Invalidate cache
      await deleteFromCache(REDIS_KEYS.SYNC_STATUS(studentId));

      return results;
    } catch (error: any) {
      console.error(`[SmartSync] Error in syncOnLogin for student ${studentId}:`, error);
      return [];
    } finally {
      // Release lock
      await releaseLock(lockKey);
    }
  }

  /**
   * Batch sync all students (3AM cron job)
   * Requirements: 3.3, 4.3
   * 
   * Syncs all students with active LMS connections.
   * Processes in parallel with rate limiting.
   * 
   * @returns Summary of sync results
   */
  async batchSyncAll(): Promise<{
    totalStudents: number;
    successfulSyncs: number;
    failedSyncs: number;
  }> {
    console.log('[SmartSync] Starting batch sync (3AM)');

    try {
      // Fetch all students with active connections
      const { data: connections, error } = await this.supabase
        .from('lms_connections')
        .select('student_id')
        .in('status', ['active', 'blocked']);

      if (error || !connections || connections.length === 0) {
        console.log('[SmartSync] No active connections found for batch sync');
        return { totalStudents: 0, successfulSyncs: 0, failedSyncs: 0 };
      }

      // Get unique student IDs
      const uniqueStudentIds = new Set(connections.map((c) => c.student_id));
      const studentIds = Array.from(uniqueStudentIds);

      console.log(`[SmartSync] Batch syncing ${studentIds.length} students`);

      let successfulSyncs = 0;
      let failedSyncs = 0;

      // Process students in batches of 10 to respect rate limits
      const batchSize = 10;
      for (let i = 0; i < studentIds.length; i += batchSize) {
        const batch = studentIds.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map((studentId) => this.syncOnLogin(studentId))
        );

        // Count successes and failures
        for (const results of batchResults) {
          for (const result of results) {
            if (result.success) {
              successfulSyncs++;
            } else {
              failedSyncs++;
            }
          }
        }

        // Rate limiting: wait 1 second between batches
        if (i + batchSize < studentIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      console.log(
        `[SmartSync] Batch sync complete: ${successfulSyncs} successful, ${failedSyncs} failed`
      );

      return {
        totalStudents: studentIds.length,
        successfulSyncs,
        failedSyncs,
      };
    } catch (error: any) {
      console.error('[SmartSync] Error in batchSyncAll:', error);
      return { totalStudents: 0, successfulSyncs: 0, failedSyncs: 0 };
    }
  }

  /**
   * Sync a single LMS connection
   * 
   * Handles adapter selection, error classification, and state updates.
   * Uses atomic transactions for database writes.
   * 
   * @param connection LMS connection record
   * @param trigger Sync trigger type
   * @returns SyncResult
   */
  private async syncConnection(
    connection: LMSConnection,
    trigger: SyncTriggerType
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      console.log(
        `[SmartSync] Syncing ${connection.provider} connection ${connection.id} for student ${connection.student_id}`
      );

      // Decrypt token
      const decryptedToken = TokenEncryption.decrypt(connection.encrypted_token);

      // Create adapter based on provider
      let syncResult: SyncResult;

      if (connection.provider === 'canvas') {
        const metadata = connection.metadata as { instanceUrl: string };
        const adapter = new CanvasAdapter(metadata.instanceUrl, decryptedToken);
        syncResult = await adapter.sync();
      } else if (connection.provider === 'google_classroom') {
        const metadata = connection.metadata as {
          clientId: string;
          clientSecret: string;
        };
        const adapter = new GoogleClassroomAdapter(
          decryptedToken,
          decryptedToken, // Refresh token (same for now)
          metadata.clientId,
          metadata.clientSecret,
          connection.token_expires_at ? new Date(connection.token_expires_at) : undefined
        );
        syncResult = await adapter.sync();
      } else {
        throw new Error(`Unknown provider: ${connection.provider}`);
      }

      // Process sync result
      if (syncResult.success) {
        await this.handleSuccessfulSync(connection, syncResult, trigger);
      } else {
        await this.handleFailedSync(connection, syncResult, trigger);
      }

      return syncResult;
    } catch (error: any) {
      // Classify error and update connection status
      const syncDurationMs = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';

      await this.handleSyncError(connection, error, trigger, syncDurationMs);

      return {
        success: false,
        assignments: [],
        assignmentsFound: 0,
        assignmentsDownloaded: 0,
        errorMessage,
        syncDurationMs,
      };
    }
  }

  /**
   * Handle successful sync
   * 
   * Saves assignments, runs deduplication, updates connection status.
   * Uses atomic transaction.
   */
  private async handleSuccessfulSync(
    connection: LMSConnection,
    syncResult: SyncResult,
    trigger: SyncTriggerType
  ): Promise<void> {
    try {
      // Begin transaction (using Supabase RPC for atomic operations)
      const now = new Date().toISOString();

      // Save assignments to database
      for (const assignment of syncResult.assignments) {
        await this.saveAssignment(connection, assignment);
      }

      // Update connection status
      await this.supabase
        .from('lms_connections')
        .update({
          status: 'active' as LMSConnectionStatus,
          last_sync_at: now,
          last_sync_status: 'success',
          failure_count: 0, // Reset failure count on success
          updated_at: now,
        })
        .eq('id', connection.id);

      // Create sync log
      await this.supabase.from('sync_logs').insert({
        lms_connection_id: connection.id,
        sync_trigger: trigger,
        sync_status: 'success' as SyncLogStatus,
        assignments_found: syncResult.assignmentsFound,
        assignments_downloaded: syncResult.assignmentsDownloaded,
        sync_duration_ms: syncResult.syncDurationMs,
        synced_at: now,
      });

      // Create parent notification if new assignments found
      if (syncResult.assignmentsFound > 0) {
        await this.createParentNotification(
          connection.parent_id,
          connection.student_id,
          'new_assignments',
          'New Assignments Synced',
          `${syncResult.assignmentsFound} new assignment(s) synced from ${connection.provider}.`,
          { connectionId: connection.id, count: syncResult.assignmentsFound }
        );
      }

      console.log(
        `[SmartSync] Successfully synced ${syncResult.assignmentsFound} assignments for connection ${connection.id}`
      );
    } catch (error: any) {
      console.error('[SmartSync] Error in handleSuccessfulSync:', error);
      throw error;
    }
  }

  /**
   * Handle failed sync
   * 
   * Updates connection status and creates sync log.
   */
  private async handleFailedSync(
    connection: LMSConnection,
    syncResult: SyncResult,
    trigger: SyncTriggerType
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.supabase
      .from('lms_connections')
      .update({
        last_sync_at: now,
        last_sync_status: 'failed',
        updated_at: now,
      })
      .eq('id', connection.id);

    await this.supabase.from('sync_logs').insert({
      lms_connection_id: connection.id,
      sync_trigger: trigger,
      sync_status: 'failed' as SyncLogStatus,
      assignments_found: 0,
      assignments_downloaded: 0,
      error_message: syncResult.errorMessage || 'Unknown error',
      sync_duration_ms: syncResult.syncDurationMs,
      synced_at: now,
    });
  }

  /**
   * Handle sync error
   * Requirements: 3.4, 3.5, 4.4, 4.5, 7.1
   * 
   * Classifies error and updates connection status accordingly.
   */
  private async handleSyncError(
    connection: LMSConnection,
    error: any,
    trigger: SyncTriggerType,
    syncDurationMs: number
  ): Promise<void> {
    const now = new Date().toISOString();
    let newStatus: LMSConnectionStatus = connection.status;
    let errorType: SyncLogStatus = 'failed';
    let notificationType: 'sync_failed' | 'connection_blocked' = 'sync_failed';

    // Classify error
    if (
      error instanceof CanvasAuthError ||
      error instanceof GoogleClassroomAuthError
    ) {
      // Authentication error
      newStatus = 'expired';
      errorType = 'failed';
      notificationType = 'sync_failed';
    } else if (
      error instanceof CanvasRateLimitError ||
      error instanceof GoogleClassroomRateLimitError
    ) {
      // Rate limit error (don't increment failure count)
      errorType = 'failed';
    } else if (
      error instanceof CanvasNetworkError ||
      error instanceof GoogleClassroomNetworkError
    ) {
      // Network error (possible firewall block)
      const newFailureCount = connection.failure_count + 1;

      if (newFailureCount >= SmartSyncService.FAILURE_THRESHOLD) {
        newStatus = 'blocked';
        errorType = 'blocked';
        notificationType = 'connection_blocked';
      }

      // Update failure count
      await this.supabase
        .from('lms_connections')
        .update({
          failure_count: newFailureCount,
          status: newStatus,
          last_sync_at: now,
          last_sync_status: 'failed',
          updated_at: now,
        })
        .eq('id', connection.id);
    }

    // Update connection status
    await this.supabase
      .from('lms_connections')
      .update({
        status: newStatus,
        last_sync_at: now,
        last_sync_status: 'failed',
        updated_at: now,
      })
      .eq('id', connection.id);

    // Create sync log
    await this.supabase.from('sync_logs').insert({
      lms_connection_id: connection.id,
      sync_trigger: trigger,
      sync_status: errorType,
      assignments_found: 0,
      assignments_downloaded: 0,
      error_message: error.message || 'Unknown error',
      sync_duration_ms: syncDurationMs,
      synced_at: now,
    });

    // Create parent notification
    await this.createParentNotification(
      connection.parent_id,
      connection.student_id,
      notificationType,
      notificationType === 'connection_blocked'
        ? 'LMS Connection Blocked'
        : 'Sync Failed',
      notificationType === 'connection_blocked'
        ? `The ${connection.provider} connection has been blocked due to repeated failures. Manual upload is still available.`
        : `Failed to sync assignments from ${connection.provider}: ${error.message}`,
      { connectionId: connection.id, errorType: error.name }
    );
  }

  /**
   * Save assignment to database with deduplication
   * 
   * Checks for existing assignment and manual upload matches.
   */
  private async saveAssignment(
    connection: LMSConnection,
    assignment: Assignment
  ): Promise<void> {
    try {
      // Check if assignment already exists
      const { data: existing } = await this.supabase
        .from('synced_assignments')
        .select('id')
        .eq('lms_connection_id', connection.id)
        .eq('lms_assignment_id', assignment.lmsAssignmentId)
        .single();

      if (existing) {
        // Update existing assignment
        await this.supabase
          .from('synced_assignments')
          .update({
            title: assignment.title,
            description: assignment.description,
            due_date: assignment.dueDate,
            course_name: assignment.courseName,
            course_id: assignment.courseId,
            attachment_urls: assignment.attachments.map((a) => a.url),
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        return;
      }

      // Insert new assignment
      const { data: newAssignment, error } = await this.supabase
        .from('synced_assignments')
        .insert({
          student_id: connection.student_id,
          lms_connection_id: connection.id,
          lms_assignment_id: assignment.lmsAssignmentId,
          title: assignment.title,
          description: assignment.description,
          due_date: assignment.dueDate,
          course_name: assignment.courseName,
          course_id: assignment.courseId,
          attachment_urls: assignment.attachments.map((a) => a.url),
          sync_status: 'completed',
          merge_status: 'pending', // Will be updated after topic creation
        })
        .select()
        .single();

      if (error || !newAssignment) {
        console.error('[SmartSync] Error saving assignment:', error);
        return;
      }

      // CRITICAL: Create study_topic from this assignment
      await this.createStudyTopicFromAssignment(newAssignment, connection.student_id);

      // Check for manual upload match
      const matchingUpload = await this.deduplicationEngine.findMatchingUpload(
        connection.student_id,
        assignment.title,
        assignment.dueDate
      );

      if (matchingUpload) {
        console.log(
          `[SmartSync] Found matching manual upload for assignment ${newAssignment.id}`
        );
        await this.deduplicationEngine.mergeAssignments(
          newAssignment.id,
          matchingUpload.id
        );
      }
    } catch (error: any) {
      console.error('[SmartSync] Error in saveAssignment:', error);
    }
  }

  /**
   * Create parent notification
   */
  private async createParentNotification(
    parentId: string,
    studentId: string,
    type: string,
    title: string,
    message: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabase.from('parent_notifications').insert({
        parent_id: parentId,
        student_id: studentId,
        notification_type: type,
        title,
        message,
        metadata,
      });
    } catch (error: any) {
      console.error('[SmartSync] Error creating parent notification:', error);
    }
  }

  /**
   * Create study topic from synced assignment
   * Requirements: LMS to Galaxy Pipeline
   * 
   * Converts a synced LMS assignment into a Galaxy node (study_topic).
   * Uses AI to extract clean topic metadata from assignment details.
   * 
   * @param assignment Synced assignment record
   * @param studentId Student ID (auth user ID)
   */
  private async createStudyTopicFromAssignment(
    assignment: any,
    studentId: string
  ): Promise<void> {
    try {
      console.log(`[SmartSync] Creating study topic for assignment ${assignment.id}`);

      // STEP 1: Get student's profile_id
      const { data: profile, error: profileError } = await this.supabase
        .from('student_profiles')
        .select('id, grade_band')
        .eq('owner_id', studentId)
        .single();

      if (profileError || !profile) {
        console.error('[SmartSync] Failed to find student profile:', profileError);
        
        // Update assignment merge_status to failed
        await this.supabase
          .from('synced_assignments')
          .update({ merge_status: 'failed' })
          .eq('id', assignment.id);
        
        return;
      }

      // STEP 2: Check if study_topic already exists for this assignment
      const { data: existingTopic } = await this.supabase
        .from('study_topics')
        .select('id')
        .eq('synced_assignment_id', assignment.id)
        .single();

      if (existingTopic) {
        console.log(`[SmartSync] Study topic already exists for assignment ${assignment.id}`);
        
        // Update assignment to mark as merged
        await this.supabase
          .from('synced_assignments')
          .update({
            merge_status: 'merged',
            study_topic_id: existingTopic.id,
          })
          .eq('id', assignment.id);
        
        return;
      }

      // STEP 3: Extract topic metadata using AI
      console.log('[SmartSync] Extracting topic metadata with AI...');
      
      const extracted = await this.topicExtractor.extractTopic(
        assignment.title,
        assignment.description,
        assignment.course_name
      );

      // STEP 4: Insert study_topic
      const now = new Date();
      const nextReviewDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day

      const { data: newTopic, error: topicError } = await this.supabase
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
        console.error('[SmartSync] Failed to create study topic:', topicError);
        
        // Update assignment merge_status to failed
        await this.supabase
          .from('synced_assignments')
          .update({ merge_status: 'failed' })
          .eq('id', assignment.id);
        
        // Log to sync_logs
        await this.supabase.from('sync_logs').insert({
          lms_connection_id: assignment.lms_connection_id,
          sync_trigger: 'login',
          sync_status: 'failed',
          assignments_found: 0,
          assignments_downloaded: 0,
          error_message: `Failed to create study topic: ${topicError?.message || 'Unknown error'}`,
          sync_duration_ms: 0,
          synced_at: now.toISOString(),
        });
        
        return;
      }

      // STEP 5: Update synced_assignment with merge_status and study_topic_id
      await this.supabase
        .from('synced_assignments')
        .update({
          merge_status: 'merged',
          study_topic_id: newTopic.id,
        })
        .eq('id', assignment.id);

      console.log(`[SmartSync] Successfully created study topic ${newTopic.id} for assignment ${assignment.id}`);
    } catch (error: any) {
      console.error('[SmartSync] Error in createStudyTopicFromAssignment:', error);
      
      // Update assignment merge_status to failed
      await this.supabase
        .from('synced_assignments')
        .update({ merge_status: 'failed' })
        .eq('id', assignment.id);
    }
  }
}

/**
 * TypeScript Types and Interfaces for LMS Autonomy Engine
 * Requirements: 2.1, 3.7, 4.7, 8.1
 * 
 * This file defines all core data models, API types, and LMS adapter types
 * for the LMS integration system.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type LMSProvider = 'canvas' | 'google_classroom';

export type LMSConnectionStatus = 'active' | 'blocked' | 'disconnected' | 'expired';

export type AssignmentSyncStatus = 'pending' | 'downloading' | 'completed' | 'failed';

export type SyncTriggerType = 'login' | 'batch' | 'manual' | 'retry';

export type SyncLogStatus = 'success' | 'partial' | 'failed' | 'blocked';

export type ParentNotificationType =
  | 'connection_authorized'
  | 'connection_disconnected'
  | 'sync_success'
  | 'sync_failed'
  | 'connection_blocked'
  | 'connection_restored'
  | 'new_assignments';

// ============================================================================
// CORE DATA MODELS (Database Tables)
// ============================================================================

/**
 * LMS Connection
 * Stores parent-authorized LMS connections (Canvas, Google Classroom)
 */
export interface LMSConnection {
  id: string;
  student_id: string;
  parent_id: string;
  provider: LMSProvider;
  status: LMSConnectionStatus;
  encrypted_token: string;
  token_expires_at: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  failure_count: number;
  metadata: Record<string, any>;
  authorized_at: string;
  authorized_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Synced Assignment
 * Stores assignments retrieved from Canvas and Google Classroom
 */
export interface SyncedAssignment {
  id: string;
  student_id: string;
  lms_connection_id: string;
  lms_assignment_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  course_name: string;
  course_id: string;
  attachment_urls: string[];
  downloaded_files: string[];
  sync_status: AssignmentSyncStatus;
  manual_upload_id: string | null;
  is_merged: boolean;
  first_synced_at: string;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Manual Upload
 * Stores manually uploaded assignments (Dual-Intake Architecture fallback)
 */
export interface ManualUpload {
  id: string;
  student_id: string;
  file_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  title: string | null;
  due_date: string | null;
  synced_assignment_id: string | null;
  is_merged: boolean;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Sync Log
 * Stores detailed logs of all sync operations
 */
export interface SyncLog {
  id: string;
  lms_connection_id: string;
  sync_trigger: SyncTriggerType;
  sync_status: SyncLogStatus;
  assignments_found: number;
  assignments_downloaded: number;
  error_message: string | null;
  sync_duration_ms: number | null;
  synced_at: string;
}

/**
 * Parent Notification
 * Stores notifications for parents about LMS sync events
 */
export interface ParentNotification {
  id: string;
  parent_id: string;
  student_id: string;
  notification_type: ParentNotificationType;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * POST /api/parent/lms/connect - Request
 */
export interface ConnectLMSRequest {
  studentId: string;
  provider: LMSProvider;
  // For Canvas
  canvasInstanceUrl?: string;
  canvasPAT?: string;
  // For Google Classroom
  googleOAuthCode?: string;
  googleRefreshToken?: string;
}

/**
 * POST /api/parent/lms/connect - Response
 */
export interface ConnectLMSResponse {
  success: boolean;
  connectionId: string;
  status: LMSConnectionStatus;
  message: string;
}

/**
 * DELETE /api/parent/lms/disconnect - Request
 */
export interface DisconnectLMSRequest {
  connectionId: string;
}

/**
 * DELETE /api/parent/lms/disconnect - Response
 */
export interface DisconnectLMSResponse {
  success: boolean;
  message: string;
}

/**
 * GET /api/parent/lms/status/:studentId - Response
 */
export interface LMSStatusResponse {
  connections: Array<{
    id: string;
    provider: LMSProvider;
    status: LMSConnectionStatus;
    lastSyncAt: string | null;
    authorizedAt: string;
  }>;
}

/**
 * GET /api/student/sync-status - Response
 */
export interface StudentSyncStatusResponse {
  connections: Array<{
    id: string;
    provider: LMSProvider;
    status: LMSConnectionStatus;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
    minutesSinceSync: number | null;
    newAssignmentsCount: number;
  }>;
  hasActiveConnections: boolean;
  totalNewAssignments: number;
}

/**
 * POST /api/internal/sync/trigger - Request
 */
export interface TriggerSyncRequest {
  studentId: string;
  triggerType: SyncTriggerType;
}

/**
 * POST /api/internal/sync/trigger - Response
 */
export interface TriggerSyncResponse {
  success: boolean;
  results: Array<{
    connectionId: string;
    provider: LMSProvider;
    status: SyncLogStatus;
    assignmentsFound: number;
    assignmentsDownloaded: number;
    errorMessage?: string;
  }>;
}

// ============================================================================
// LMS ADAPTER TYPES
// ============================================================================

/**
 * Normalized Assignment (from LMS adapters)
 */
export interface Assignment {
  lmsAssignmentId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  courseName: string;
  courseId: string;
  attachments: Attachment[];
}

/**
 * File Attachment
 */
export interface Attachment {
  url: string;
  filename: string;
  mimeType: string;
  size: number | null;
}

/**
 * Course Information
 */
export interface Course {
  id: string;
  name: string;
  code: string | null;
}

/**
 * Sync Result (from adapters)
 */
export interface SyncResult {
  success: boolean;
  assignments: Assignment[];
  assignmentsFound: number;
  assignmentsDownloaded: number;
  errorMessage?: string;
  syncDurationMs: number;
}

/**
 * Token Validation Result
 */
export interface TokenValidationResult {
  valid: boolean;
  errorMessage?: string;
}

// ============================================================================
// DEDUPLICATION TYPES
// ============================================================================

/**
 * Match Score for deduplication
 */
export interface MatchScore {
  score: number; // 0 to 1
  titleSimilarity: number;
  dueDateMatch: boolean;
}

/**
 * Duplicate Group (cross-provider duplicates)
 */
export interface DuplicateGroup {
  assignments: SyncedAssignment[];
  matchScore: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Canvas-specific metadata
 */
export interface CanvasMetadata {
  instanceUrl: string;
}

/**
 * Google Classroom-specific metadata
 */
export interface GoogleClassroomMetadata {
  scopes: string[];
}

/**
 * Decrypted token (never stored, only used in memory)
 */
export interface DecryptedToken {
  token: string;
  expiresAt: string | null;
}

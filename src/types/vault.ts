/**
 * TypeScript Type Definitions for The Vault
 * 
 * Defines interfaces for SRS tracking, vault sessions, and Ghost Nodes.
 */

/**
 * Study topic with SRS tracking fields
 * 
 * Extends the base study_topics table with SuperMemo-2 columns.
 */
export interface StudyTopicSRS {
  id: string;
  profile_id: string;
  title: string;
  orbit_state: 0 | 1 | 2 | 3; // 0=Quarantine, 1=Active, 2=Mastered, 3=Ghost Node
  mastery_score: number;
  
  // SRS fields
  srs_interval_days: number;
  srs_ease_factor: number;
  next_review_date: string | null; // ISO 8601 timestamp
  srs_reviews_completed: number;
  
  created_at: string;
  updated_at: string;
}

/**
 * Vault session record
 * 
 * Tracks a batch review session with up to 5 Ghost Nodes.
 */
export interface VaultSession {
  id: string;
  user_id: string;
  profile_id: string;
  
  // Session configuration
  topic_ids: string[];
  batch_size: number; // 1-5
  
  // Session state
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  current_topic_index: number;
  
  // Results tracking
  topics_passed: number;
  topics_failed: number;
  
  // Transcript (for debugging/analytics)
  transcript: VaultTranscriptEntry[];
  
  // Timestamps
  created_at: string;
  completed_at: string | null;
}

/**
 * Vault session transcript entry
 * 
 * Records each question/answer pair in a session for analytics.
 */
export interface VaultTranscriptEntry {
  topic_id: string;
  topic_title: string;
  question: string;
  student_answer: string;
  passed: boolean;
  brief_feedback: string;
  timestamp: string; // ISO 8601
}

/**
 * Ghost Node (orbit_state = 3)
 * 
 * Represents a previously mastered topic whose next_review_date has passed.
 */
export interface GhostNode {
  id: string;
  title: string;
  mastery_score: number;
  next_review_date: string; // ISO 8601
  days_overdue: number; // Calculated: (now - next_review_date) in days
}

/**
 * Vault Queue
 * 
 * Prioritized list of Ghost Nodes requiring review.
 */
export interface VaultQueue {
  ghost_nodes: GhostNode[];
  total_count: number; // Capped at 5 per session
  estimated_time_minutes: number; // Fixed at 3 minutes
}

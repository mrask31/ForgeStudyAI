/**
 * Proof Event Logger
 * 
 * Handles logging of proof attempts to the database with:
 * - Idempotent writes using response hash
 * - In-memory retry buffer for failed writes
 * - Query methods for parent dashboard and analytics
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  ProofEvent,
  ProofEventInsert,
  ProofStats,
  ValidationResult,
  ValidationClassification,
} from './types';
import { sanitizeExcerpt, generateResponseHash } from './utils';

/**
 * Retry buffer entry
 */
interface RetryBufferEntry {
  event: ProofEventInsert;
  timestamp: number;
  attempts: number;
}

/**
 * Proof Event Logger
 * 
 * Logs proof attempts to database with idempotency and retry logic.
 */
export class ProofEventLogger {
  private supabase: SupabaseClient;
  private retryBuffer: Map<string, RetryBufferEntry> = new Map();
  private readonly RETRY_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    
    // Start cleanup interval for expired retry buffer entries
    this.startRetryBufferCleanup();
  }

  /**
   * Cleanup resources (stop intervals)
   * Call this when done with the logger to allow Jest to exit
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Log a proof event to the database
   * 
   * Uses INSERT ... ON CONFLICT DO NOTHING for idempotency.
   * If write fails, adds to retry buffer.
   * 
   * @param chatId - Chat ID
   * @param studentId - Student profile ID
   * @param concept - Concept being validated
   * @param prompt - Explain-back prompt
   * @param studentResponse - Student's response
   * @param validationResult - Validation result from validator
   * @returns Success boolean
   */
  async logEvent(
    chatId: string,
    studentId: string,
    concept: string,
    prompt: string,
    studentResponse: string,
    validationResult: ValidationResult
  ): Promise<boolean> {
    try {
      // Generate response hash for idempotency
      const timestamp = new Date().toISOString();
      const responseHash = await generateResponseHash(chatId, studentResponse, timestamp);

      // Generate excerpt for parent display
      const excerpt = sanitizeExcerpt(studentResponse, 200);

      // Create proof event insert
      const proofEvent: ProofEventInsert = {
        chat_id: chatId,
        student_id: studentId,
        concept,
        prompt,
        student_response: studentResponse,
        student_response_excerpt: excerpt,
        response_hash: responseHash,
        validation_result: validationResult,
        classification: validationResult.classification,
      };

      // Attempt database write with idempotent insert
      const { error } = await this.supabase
        .from('proof_events')
        .insert(proofEvent);

      if (error) {
        // Check if error is due to duplicate (expected with idempotency)
        if (error.code === '23505') {
          // Unique constraint violation - this is expected and OK
          console.log(`[ProofEventLogger] Duplicate proof event detected (hash: ${responseHash}), skipping`);
          return true;
        }

        // Other error - add to retry buffer
        console.error('[ProofEventLogger] Database write failed:', error);
        this.addToRetryBuffer(responseHash, proofEvent);
        return false;
      }

      // Success - remove from retry buffer if it was there
      this.retryBuffer.delete(responseHash);
      return true;

    } catch (err) {
      console.error('[ProofEventLogger] Unexpected error in logEvent:', err);
      return false;
    }
  }

  /**
   * Get proof history for a student
   * 
   * @param studentId - Student profile ID
   * @param limit - Maximum number of events to return (default: 50)
   * @returns Array of proof events
   */
  async getStudentProofHistory(
    studentId: string,
    limit: number = 50
  ): Promise<ProofEvent[]> {
    try {
      const { data, error } = await this.supabase
        .from('proof_events')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[ProofEventLogger] Failed to fetch student proof history:', error);
        return [];
      }

      return (data || []) as ProofEvent[];
    } catch (err) {
      console.error('[ProofEventLogger] Unexpected error in getStudentProofHistory:', err);
      return [];
    }
  }

  /**
   * Get proof events for a specific chat
   * 
   * @param chatId - Chat ID
   * @returns Array of proof events
   */
  async getChatProofEvents(chatId: string): Promise<ProofEvent[]> {
    try {
      const { data, error } = await this.supabase
        .from('proof_events')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[ProofEventLogger] Failed to fetch chat proof events:', error);
        return [];
      }

      return (data || []) as ProofEvent[];
    } catch (err) {
      console.error('[ProofEventLogger] Unexpected error in getChatProofEvents:', err);
      return [];
    }
  }

  /**
   * Get proof statistics for a student
   * 
   * Aggregates:
   * - Total attempts
   * - Pass/partial/retry counts
   * - Pass rate
   * - List of concepts proven
   * 
   * @param studentId - Student profile ID
   * @returns Proof statistics
   */
  async getProofStats(studentId: string): Promise<ProofStats> {
    try {
      const events = await this.getStudentProofHistory(studentId, 1000);

      const stats: ProofStats = {
        totalAttempts: events.length,
        passCount: 0,
        partialCount: 0,
        retryCount: 0,
        passRate: 0,
        conceptsProven: [],
      };

      // Count classifications
      const conceptsSet = new Set<string>();
      for (const event of events) {
        switch (event.classification) {
          case 'pass':
            stats.passCount++;
            conceptsSet.add(event.concept);
            break;
          case 'partial':
            stats.partialCount++;
            break;
          case 'retry':
            stats.retryCount++;
            break;
        }
      }

      // Calculate pass rate
      if (stats.totalAttempts > 0) {
        stats.passRate = stats.passCount / stats.totalAttempts;
      }

      // Convert concepts set to array
      stats.conceptsProven = Array.from(conceptsSet);

      return stats;
    } catch (err) {
      console.error('[ProofEventLogger] Unexpected error in getProofStats:', err);
      return {
        totalAttempts: 0,
        passCount: 0,
        partialCount: 0,
        retryCount: 0,
        passRate: 0,
        conceptsProven: [],
      };
    }
  }

  /**
   * Add failed event to retry buffer
   * 
   * @param hash - Response hash
   * @param event - Proof event to retry
   */
  private addToRetryBuffer(hash: string, event: ProofEventInsert): void {
    const existing = this.retryBuffer.get(hash);
    
    if (existing) {
      // Increment attempts
      existing.attempts++;
      if (existing.attempts >= this.MAX_RETRY_ATTEMPTS) {
        console.error(`[ProofEventLogger] Max retry attempts reached for hash: ${hash}`);
        this.retryBuffer.delete(hash);
      }
    } else {
      // Add new entry
      this.retryBuffer.set(hash, {
        event,
        timestamp: Date.now(),
        attempts: 1,
      });
    }
  }

  /**
   * Start cleanup interval for expired retry buffer entries
   */
  private startRetryBufferCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expired: string[] = [];

      for (const [hash, entry] of Array.from(this.retryBuffer.entries())) {
        if (now - entry.timestamp > this.RETRY_TTL) {
          expired.push(hash);
        }
      }

      for (const hash of expired) {
        console.log(`[ProofEventLogger] Removing expired retry buffer entry: ${hash}`);
        this.retryBuffer.delete(hash);
      }
    }, 60 * 1000).unref(); // Run every minute, unref to allow process to exit
  }

  /**
   * Attempt to retry failed events in buffer
   * 
   * Call this periodically to retry failed writes.
   */
  async retryFailedEvents(): Promise<void> {
    const entries = Array.from(this.retryBuffer.entries());
    
    for (const [hash, entry] of entries) {
      try {
        const { error } = await this.supabase
          .from('proof_events')
          .insert(entry.event);

        if (!error) {
          console.log(`[ProofEventLogger] Successfully retried event: ${hash}`);
          this.retryBuffer.delete(hash);
        } else if (error.code === '23505') {
          // Duplicate - remove from buffer
          this.retryBuffer.delete(hash);
        } else {
          // Still failing - increment attempts
          entry.attempts++;
          if (entry.attempts >= this.MAX_RETRY_ATTEMPTS) {
            console.error(`[ProofEventLogger] Max retry attempts reached for hash: ${hash}`);
            this.retryBuffer.delete(hash);
          }
        }
      } catch (err) {
        console.error(`[ProofEventLogger] Error retrying event ${hash}:`, err);
      }
    }
  }

  /**
   * Get retry buffer size (for monitoring)
   */
  getRetryBufferSize(): number {
    return this.retryBuffer.size;
  }
}

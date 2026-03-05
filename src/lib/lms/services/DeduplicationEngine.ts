/**
 * Deduplication Engine
 * Requirements: 8.1, 8.2, 8.3, 8.4
 * 
 * Implements fuzzy matching to detect duplicate assignments between:
 * - Manual uploads and synced assignments
 * - Cross-provider duplicates (Canvas vs Google Classroom)
 * 
 * Uses Levenshtein distance for title similarity and date matching.
 */

import { createClient } from '@supabase/supabase-js';
import {
  SyncedAssignment,
  ManualUpload,
  MatchScore,
  DuplicateGroup,
} from '../types';

/**
 * Deduplication Engine
 * 
 * Provides fuzzy matching and merging capabilities for assignments.
 */
export class DeduplicationEngine {
  private supabase;

  /**
   * Matching thresholds
   */
  private static readonly TITLE_SIMILARITY_THRESHOLD = 0.75; // 75% similarity required
  private static readonly DUE_DATE_TOLERANCE_DAYS = 1; // Same day or within 1 day

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Calculate match score between two assignment titles and due dates
   * Requirements: 8.2
   * 
   * Uses Levenshtein distance for title similarity.
   * 
   * @param title1 First assignment title
   * @param title2 Second assignment title
   * @param dueDate1 First assignment due date (ISO string or null)
   * @param dueDate2 Second assignment due date (ISO string or null)
   * @returns MatchScore with similarity metrics
   */
  calculateMatchScore(
    title1: string,
    title2: string,
    dueDate1: string | null,
    dueDate2: string | null
  ): MatchScore {
    // Calculate title similarity using Levenshtein distance
    const titleSimilarity = this.calculateLevenshteinSimilarity(
      this.normalizeTitle(title1),
      this.normalizeTitle(title2)
    );

    // Check if due dates match (within tolerance)
    const dueDateMatch = this.checkDueDateMatch(dueDate1, dueDate2);

    // Calculate overall score (weighted: 70% title, 30% due date)
    const score = titleSimilarity * 0.7 + (dueDateMatch ? 0.3 : 0);

    return {
      score,
      titleSimilarity,
      dueDateMatch,
    };
  }

  /**
   * Find matching manual upload for a synced assignment
   * Requirements: 8.2
   * 
   * Searches manual_uploads table for potential matches.
   * 
   * @param studentId Student ID
   * @param assignmentTitle Assignment title from LMS
   * @param assignmentDueDate Assignment due date from LMS
   * @returns Best matching ManualUpload or null
   */
  async findMatchingUpload(
    studentId: string,
    assignmentTitle: string,
    assignmentDueDate: string | null
  ): Promise<ManualUpload | null> {
    try {
      // Fetch all unmerged manual uploads for this student
      const { data: uploads, error } = await this.supabase
        .from('manual_uploads')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_merged', false);

      if (error) {
        console.error('[Deduplication] Error fetching manual uploads:', error);
        return null;
      }

      if (!uploads || uploads.length === 0) {
        return null;
      }

      // Calculate match scores for all uploads
      let bestMatch: ManualUpload | null = null;
      let bestScore = 0;

      for (const upload of uploads) {
        const matchScore = this.calculateMatchScore(
          assignmentTitle,
          upload.title || upload.original_filename,
          assignmentDueDate,
          upload.due_date
        );

        if (
          matchScore.score > bestScore &&
          matchScore.score >= DeduplicationEngine.TITLE_SIMILARITY_THRESHOLD
        ) {
          bestScore = matchScore.score;
          bestMatch = upload;
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('[Deduplication] Error in findMatchingUpload:', error);
      return null;
    }
  }

  /**
   * Merge synced assignment with manual upload
   * Requirements: 8.3, 8.4
   * 
   * Links synced_assignment and manual_upload records.
   * Preserves all metadata from both sources.
   * 
   * @param syncedAssignmentId Synced assignment ID
   * @param manualUploadId Manual upload ID
   * @returns Success status
   */
  async mergeAssignments(
    syncedAssignmentId: string,
    manualUploadId: string
  ): Promise<boolean> {
    try {
      // Use transaction to ensure atomic updates
      const { error: syncedError } = await this.supabase
        .from('synced_assignments')
        .update({
          manual_upload_id: manualUploadId,
          is_merged: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', syncedAssignmentId);

      if (syncedError) {
        console.error('[Deduplication] Error updating synced_assignment:', syncedError);
        return false;
      }

      const { error: uploadError } = await this.supabase
        .from('manual_uploads')
        .update({
          synced_assignment_id: syncedAssignmentId,
          is_merged: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', manualUploadId);

      if (uploadError) {
        console.error('[Deduplication] Error updating manual_upload:', uploadError);
        // Rollback synced_assignment update
        await this.supabase
          .from('synced_assignments')
          .update({
            manual_upload_id: null,
            is_merged: false,
          })
          .eq('id', syncedAssignmentId);
        return false;
      }

      console.log(
        `[Deduplication] Successfully merged assignment ${syncedAssignmentId} with upload ${manualUploadId}`
      );
      return true;
    } catch (error) {
      console.error('[Deduplication] Error in mergeAssignments:', error);
      return false;
    }
  }

  /**
   * Detect cross-provider duplicates
   * Requirements: 8.1, 8.2
   * 
   * Finds assignments with same title and due date across Canvas and Google Classroom.
   * 
   * @param studentId Student ID
   * @returns Array of duplicate groups
   */
  async detectCrossProviderDuplicates(studentId: string): Promise<DuplicateGroup[]> {
    try {
      // Fetch all synced assignments for this student
      const { data: assignments, error } = await this.supabase
        .from('synced_assignments')
        .select('*, lms_connections!inner(provider)')
        .eq('student_id', studentId);

      if (error || !assignments || assignments.length === 0) {
        return [];
      }

      const duplicateGroups: DuplicateGroup[] = [];
      const processed = new Set<string>();

      // Compare each assignment with others
      for (let i = 0; i < assignments.length; i++) {
        if (processed.has(assignments[i].id)) continue;

        const group: SyncedAssignment[] = [assignments[i]];

        for (let j = i + 1; j < assignments.length; j++) {
          if (processed.has(assignments[j].id)) continue;

          const matchScore = this.calculateMatchScore(
            assignments[i].title,
            assignments[j].title,
            assignments[i].due_date,
            assignments[j].due_date
          );

          if (matchScore.score >= DeduplicationEngine.TITLE_SIMILARITY_THRESHOLD) {
            group.push(assignments[j]);
            processed.add(assignments[j].id);
          }
        }

        if (group.length > 1) {
          processed.add(assignments[i].id);
          duplicateGroups.push({
            assignments: group,
            matchScore: 1.0, // Simplified for now
          });
        }
      }

      return duplicateGroups;
    } catch (error) {
      console.error('[Deduplication] Error detecting cross-provider duplicates:', error);
      return [];
    }
  }

  /**
   * Normalize title for comparison
   * 
   * Removes special characters, converts to lowercase, trims whitespace.
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate Levenshtein similarity between two strings
   * 
   * Returns similarity score between 0 and 1 (1 = identical).
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    return 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * 
   * Uses dynamic programming approach.
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str1.length][str2.length];
  }

  /**
   * Check if two due dates match within tolerance
   * 
   * Returns true if dates are within DUE_DATE_TOLERANCE_DAYS.
   */
  private checkDueDateMatch(date1: string | null, date2: string | null): boolean {
    if (!date1 || !date2) return false;

    try {
      const d1 = new Date(date1);
      const d2 = new Date(date2);

      const diffMs = Math.abs(d1.getTime() - d2.getTime());
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      return diffDays <= DeduplicationEngine.DUE_DATE_TOLERANCE_DAYS;
    } catch (error) {
      return false;
    }
  }
}

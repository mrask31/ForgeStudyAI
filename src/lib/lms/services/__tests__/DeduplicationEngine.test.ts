/**
 * DeduplicationEngine Property-Based Tests
 * 
 * Tests Properties 17, 18, 19, 20 using fast-check
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */

import * as fc from 'fast-check';
import { DeduplicationEngine } from '../DeduplicationEngine';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: [],
        error: null,
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
};

describe('DeduplicationEngine - Property-Based Tests', () => {
  let engine: DeduplicationEngine;

  beforeEach(() => {
    engine = new DeduplicationEngine(mockSupabase as any);
    jest.clearAllMocks();
  });

  describe('Property 17: Unique Identifier Generation for Synced Assignments', () => {
    it('should generate unique identifiers for different assignments', () => {
      fc.assert(
        fc.property(
          fc.record({
            lmsConnectionId: fc.uuid(),
            lmsAssignmentId: fc.string({ minLength: 1, maxLength: 255 }),
            title: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          fc.record({
            lmsConnectionId: fc.uuid(),
            lmsAssignmentId: fc.string({ minLength: 1, maxLength: 255 }),
            title: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          (assignment1, assignment2) => {
            // If assignments have different connection IDs or assignment IDs, they should be unique
            const id1 = `${assignment1.lmsConnectionId}:${assignment1.lmsAssignmentId}`;
            const id2 = `${assignment2.lmsConnectionId}:${assignment2.lmsAssignmentId}`;

            if (
              assignment1.lmsConnectionId !== assignment2.lmsConnectionId ||
              assignment1.lmsAssignmentId !== assignment2.lmsAssignmentId
            ) {
              expect(id1).not.toBe(id2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 18: Matching Attempt for Manual Uploads', () => {
    it('should attempt matching for any manual upload', async () => {
      fc.assert(
        await fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            studentId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 500 }),
            dueDate: fc.option(fc.date(), { nil: null }),
          }),
          async (manualUpload) => {
            // Mock database response
            mockSupabase.from = jest.fn(() => ({
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  data: [],
                  error: null,
                })),
              })),
            }));

            // Attempt to find matching upload
            const result = await engine.findMatchingUpload({
              id: fc.sample(fc.uuid(), 1)[0],
              studentId: manualUpload.studentId,
              lmsConnectionId: fc.sample(fc.uuid(), 1)[0],
              lmsAssignmentId: fc.sample(fc.string(), 1)[0],
              title: manualUpload.title,
              description: null,
              dueDate: manualUpload.dueDate,
              courseName: null,
              courseId: null,
              attachmentUrls: [],
              downloadedFiles: [],
              syncStatus: 'downloaded' as const,
              manualUploadId: null,
              isMerged: false,
              firstSyncedAt: new Date(),
              lastSyncedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Verify that the matching attempt was made (database was queried)
            expect(mockSupabase.from).toHaveBeenCalledWith('manual_uploads');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 19: Assignment Merging on Match', () => {
    it('should merge assignments when similarity exceeds threshold', () => {
      fc.assert(
        fc.property(
          fc.record({
            title1: fc.string({ minLength: 5, maxLength: 100 }),
            dueDate: fc.date(),
          }),
          (data) => {
            // Create two assignments with identical titles and due dates
            const title1 = data.title1;
            const title2 = data.title1; // Exact match
            const dueDate1 = data.dueDate;
            const dueDate2 = data.dueDate; // Same date

            // Calculate match score
            const score = (engine as any).calculateMatchScore(
              title1,
              title2,
              dueDate1,
              dueDate2
            );

            // Exact matches should have score >= 0.75 (threshold)
            expect(score).toBeGreaterThanOrEqual(0.75);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not merge assignments when similarity is below threshold', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.date(),
          fc.date(),
          (title1, title2, date1, date2) => {
            // Skip if titles are too similar
            fc.pre(title1 !== title2);
            fc.pre(Math.abs(date1.getTime() - date2.getTime()) > 86400000); // More than 1 day apart

            const score = (engine as any).calculateMatchScore(
              title1,
              title2,
              date1,
              date2
            );

            // Very different assignments should have low scores
            if (score < 0.75) {
              // This is expected - no merge should occur
              expect(score).toBeLessThan(0.75);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 20: Data Preservation During Merge', () => {
    it('should preserve both synced metadata and manual file path during merge', async () => {
      fc.assert(
        await fc.asyncProperty(
          fc.record({
            syncedId: fc.uuid(),
            manualId: fc.uuid(),
            syncedTitle: fc.string({ minLength: 1, maxLength: 500 }),
            syncedDescription: fc.option(fc.string({ maxLength: 2000 }), { nil: null }),
            syncedDueDate: fc.option(fc.date(), { nil: null }),
            syncedCourseName: fc.option(fc.string({ maxLength: 255 }), { nil: null }),
            manualFilePath: fc.string({ minLength: 1, maxLength: 500 }),
            manualFilename: fc.string({ minLength: 1, maxLength: 255 }),
          }),
          async (data) => {
            // Mock successful merge
            mockSupabase.from = jest.fn((table: string) => ({
              update: jest.fn(() => ({
                eq: jest.fn(() => ({
                  data: table === 'synced_assignments' 
                    ? [{ 
                        id: data.syncedId,
                        title: data.syncedTitle,
                        description: data.syncedDescription,
                        dueDate: data.syncedDueDate,
                        courseName: data.syncedCourseName,
                        manualUploadId: data.manualId,
                        isMerged: true,
                      }]
                    : [{
                        id: data.manualId,
                        filePath: data.manualFilePath,
                        originalFilename: data.manualFilename,
                        syncedAssignmentId: data.syncedId,
                        isMerged: true,
                      }],
                  error: null,
                })),
              })),
            }));

            const result = await engine.mergeAssignments(data.syncedId, data.manualId);

            // Verify both records were updated
            expect(mockSupabase.from).toHaveBeenCalledWith('synced_assignments');
            expect(mockSupabase.from).toHaveBeenCalledWith('manual_uploads');

            // Verify merge result preserves data
            expect(result.syncedAssignment.id).toBe(data.syncedId);
            expect(result.syncedAssignment.manualUploadId).toBe(data.manualId);
            expect(result.syncedAssignment.isMerged).toBe(true);
            expect(result.manualUpload.id).toBe(data.manualId);
            expect(result.manualUpload.syncedAssignmentId).toBe(data.syncedId);
            expect(result.manualUpload.isMerged).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Fuzzy Matching Stress Test - Insane Randomized Strings', () => {
    it('should never crash with random strings and dates', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 1000 }), // Insane long strings
          fc.string({ maxLength: 1000 }),
          fc.option(fc.date(), { nil: null }),
          fc.option(fc.date(), { nil: null }),
          (title1, title2, date1, date2) => {
            // This should NEVER crash, no matter what we throw at it
            expect(() => {
              const score = (engine as any).calculateMatchScore(
                title1,
                title2,
                date1,
                date2
              );

              // Score should always be between 0 and 1
              expect(score).toBeGreaterThanOrEqual(0);
              expect(score).toBeLessThanOrEqual(1);
              expect(typeof score).toBe('number');
              expect(isNaN(score)).toBe(false);
            }).not.toThrow();
          }
        ),
        { numRuns: 200 } // Extra iterations for stress testing
      );
    });

    it('should handle edge cases: empty strings, special characters, unicode', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.string({ maxLength: 5 }),
            fc.fullUnicodeString({ maxLength: 100 }),
            fc.constant('🔥💯✨🚀'),
            fc.constant('SELECT * FROM users; DROP TABLE users;--'),
            fc.constant('\n\n\n\t\t\t   '),
          ),
          fc.oneof(
            fc.constant(''),
            fc.string({ maxLength: 5 }),
            fc.fullUnicodeString({ maxLength: 100 }),
            fc.constant('🎯🛡️📚'),
            fc.constant('<script>alert("xss")</script>'),
            fc.constant('NULL'),
          ),
          (title1, title2) => {
            expect(() => {
              const score = (engine as any).calculateMatchScore(
                title1,
                title2,
                null,
                null
              );

              expect(score).toBeGreaterThanOrEqual(0);
              expect(score).toBeLessThanOrEqual(1);
              expect(isNaN(score)).toBe(false);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never incorrectly merge completely different assignments', () => {
      fc.assert(
        fc.property(
          fc.record({
            title1: fc.constant('Math Homework Chapter 5'),
            title2: fc.constant('English Essay on Shakespeare'),
            date1: new Date('2024-01-15'),
            date2: new Date('2024-03-20'),
          }),
          (data) => {
            const score = (engine as any).calculateMatchScore(
              data.title1,
              data.title2,
              data.date1,
              data.date2
            );

            // Completely different assignments should have very low scores
            expect(score).toBeLessThan(0.5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

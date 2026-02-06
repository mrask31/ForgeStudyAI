/**
 * Property-based tests for Proof Event Logger
 * 
 * Property 7: Proof Event Persistence Completeness
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import * as fc from 'fast-check';
import { ProofEventLogger } from '../logger';
import type { ValidationResult, ValidationClassification } from '../types';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client for testing
const createMockSupabase = () => {
  const storage = new Map<string, any>();
  const eventsById = new Map<string, any>();
  let insertCallCount = 0;

  return {
    client: {
      from: (table: string) => ({
        insert: async (data: any) => {
          insertCallCount++;
          
          // Simulate unique constraint violation for duplicates
          const existingKey = `${data.chat_id}|${data.response_hash}`;
          if (storage.has(existingKey)) {
            return {
              error: { code: '23505', message: 'duplicate key value violates unique constraint' },
              data: null,
            };
          }

          // Store the event
          const id = `event-${Date.now()}-${Math.random()}`;
          const event = { ...data, id, created_at: new Date().toISOString() };
          storage.set(existingKey, event);
          eventsById.set(id, event);

          return { error: null, data: event };
        },
        select: (columns: string) => {
          const createQueryBuilder = (filterColumn?: string, filterValue?: any, orderColumn?: string, orderAsc?: boolean) => {
            const getFilteredResults = () => {
              const allEvents = Array.from(eventsById.values());
              let results = allEvents;
              
              if (filterColumn && filterValue !== undefined) {
                results = results.filter((e: any) => e && e[filterColumn] === filterValue);
              }
              
              if (orderColumn) {
                results = results.sort((a: any, b: any) => {
                  if (orderAsc) {
                    return a[orderColumn] > b[orderColumn] ? 1 : -1;
                  }
                  return a[orderColumn] < b[orderColumn] ? 1 : -1;
                });
              }
              
              return results;
            };

            return {
              eq: (column: string, value: any) => createQueryBuilder(column, value, orderColumn, orderAsc),
              order: (col: string, opts?: any) => {
                const ascending = opts?.ascending ?? false;
                // Create a new query builder with the order parameters
                const orderedBuilder = createQueryBuilder(filterColumn, filterValue, col, ascending);
                
                // Return an object that can be awaited OR have .limit() called
                return {
                  limit: async (n: number) => {
                    const results = getFilteredResults().slice(0, n);
                    return { data: results, error: null };
                  },
                  then: async (resolve: any) => {
                    const results = getFilteredResults();
                    resolve({ data: results, error: null });
                  },
                };
              },
              then: async (resolve: any) => {
                const results = getFilteredResults();
                resolve({ data: results, error: null });
              },
            };
          };

          return createQueryBuilder();
        },
      }),
    } as any,
    storage,
    eventsById,
    insertCallCount: () => insertCallCount,
    reset: () => {
      storage.clear();
      eventsById.clear();
      insertCallCount = 0;
    },
  };
};

// Arbitraries for property testing
const validationClassificationArb = fc.constantFrom<ValidationClassification>('pass', 'partial', 'retry');

const validationResultArb = fc.record({
  classification: validationClassificationArb,
  keyConcepts: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
  relationships: fc.array(fc.string({ minLength: 5, maxLength: 30 }), { maxLength: 3 }),
  misconceptions: fc.array(fc.string({ minLength: 5, maxLength: 30 }), { maxLength: 3 }),
  depthAssessment: fc.string({ minLength: 10, maxLength: 100 }),
  guidance: fc.string({ minLength: 10, maxLength: 200 }),
  isParroting: fc.boolean(),
  isKeywordStuffing: fc.boolean(),
  isVagueAcknowledgment: fc.boolean(),
}) as fc.Arbitrary<ValidationResult>;

const proofAttemptArb = fc.record({
  chatId: fc.uuid(),
  studentId: fc.uuid(),
  concept: fc.string({ minLength: 5, maxLength: 50 }),
  prompt: fc.string({ minLength: 20, maxLength: 200 }),
  studentResponse: fc.string({ minLength: 10, maxLength: 500 }),
  validationResult: validationResultArb,
});

describe('Property 7: Proof Event Persistence Completeness', () => {
  afterEach(() => {
    // No global cleanup needed - each test creates its own logger
  });

  it('should persist complete proof event records with all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(proofAttemptArb, async (attempt) => {
        const mock = createMockSupabase();
        const logger = new ProofEventLogger(mock.client);

        try {
          // Log the event
          const success = await logger.logEvent(
            attempt.chatId,
            attempt.studentId,
            attempt.concept,
            attempt.prompt,
            attempt.studentResponse,
            attempt.validationResult
          );

          // Verify success
          expect(success).toBe(true);

          // Verify event was stored
          const events = await logger.getChatProofEvents(attempt.chatId);
          expect(events.length).toBe(1);

          const stored = events[0];

          // Verify all required fields are present
          expect(stored.id).toBeDefined();
          expect(stored.chat_id).toBe(attempt.chatId);
          expect(stored.student_id).toBe(attempt.studentId);
          expect(stored.concept).toBe(attempt.concept);
          expect(stored.prompt).toBe(attempt.prompt);
          expect(stored.student_response).toBe(attempt.studentResponse);
          expect(stored.student_response_excerpt).toBeDefined();
          expect(stored.student_response_excerpt.length).toBeLessThanOrEqual(203); // 200 + '...'
          expect(stored.response_hash).toBeDefined();
          expect(stored.response_hash).toMatch(/^[0-9a-f]{64}$/);
          expect(stored.validation_result).toEqual(attempt.validationResult);
          expect(stored.classification).toBe(attempt.validationResult.classification);
          expect(stored.created_at).toBeDefined();

          // Verify queryable by parent dashboard (student_id query)
          const studentEvents = await logger.getStudentProofHistory(attempt.studentId);
          expect(studentEvents.length).toBe(1);
          expect(studentEvents[0].id).toBe(stored.id);
        } finally {
          logger.destroy();
          mock.reset();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should enforce idempotency: duplicate hash does not create duplicate records', async () => {
    await fc.assert(
      fc.asyncProperty(proofAttemptArb, async (attempt) => {
        const mock = createMockSupabase();
        const logger = new ProofEventLogger(mock.client);

        try {
          // Log the event once
          const success1 = await logger.logEvent(
            attempt.chatId,
            attempt.studentId,
            attempt.concept,
            attempt.prompt,
            attempt.studentResponse,
            attempt.validationResult
          );

          expect(success1).toBe(true);

          // Get the stored event to extract its hash
          const events1 = await logger.getChatProofEvents(attempt.chatId);
          expect(events1.length).toBe(1);
          const storedHash = events1[0].response_hash;

          // Manually insert a duplicate with the same hash (simulating a retry or race condition)
          const duplicateEvent = {
            chat_id: attempt.chatId,
            student_id: attempt.studentId,
            concept: attempt.concept,
            prompt: attempt.prompt,
            student_response: attempt.studentResponse,
            student_response_excerpt: events1[0].student_response_excerpt,
            response_hash: storedHash, // Use the same hash
            validation_result: attempt.validationResult,
            classification: attempt.validationResult.classification,
          };

          // Try to insert duplicate - should fail due to unique constraint
          const { error } = await mock.client.from('proof_events').insert(duplicateEvent);
          expect(error).toBeTruthy();
          expect(error?.code).toBe('23505'); // Unique constraint violation

          // Verify still only one event stored
          const events2 = await logger.getChatProofEvents(attempt.chatId);
          expect(events2.length).toBe(1);
        } finally {
          logger.destroy();
          mock.reset();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle all classification types (pass, partial, retry)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(proofAttemptArb, { minLength: 3, maxLength: 10 }),
        async (attempts) => {
          const mock = createMockSupabase();
          const logger = new ProofEventLogger(mock.client);

          try {
            // Ensure we have at least one of each classification
            const classifications: ValidationClassification[] = ['pass', 'partial', 'retry'];
            const modifiedAttempts = attempts.slice(0, 3).map((attempt, i) => ({
              ...attempt,
              validationResult: {
                ...attempt.validationResult,
                classification: classifications[i],
              },
            }));

            // Log all events
            for (const attempt of modifiedAttempts) {
              await logger.logEvent(
                attempt.chatId,
                attempt.studentId,
                attempt.concept,
                attempt.prompt,
                attempt.studentResponse,
                attempt.validationResult
              );
            }

            // Verify all classifications were stored correctly
            for (let i = 0; i < modifiedAttempts.length; i++) {
              const events = await logger.getChatProofEvents(modifiedAttempts[i].chatId);
              expect(events[0].classification).toBe(classifications[i]);
            }
          } finally {
            logger.destroy();
            mock.reset();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should correctly aggregate proof statistics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(proofAttemptArb, { minLength: 5, maxLength: 20 }),
        async (attempts) => {
          const mock = createMockSupabase();
          const logger = new ProofEventLogger(mock.client);

          try {
            // Use same student ID for all attempts
            const studentId = attempts[0].studentId;
            const modifiedAttempts = attempts.map(a => ({ ...a, studentId }));

            // Log all events
            for (const attempt of modifiedAttempts) {
              await logger.logEvent(
                attempt.chatId,
                studentId,
                attempt.concept,
                attempt.prompt,
                attempt.studentResponse,
                attempt.validationResult
              );
            }

            // Get stats
            const stats = await logger.getProofStats(studentId);

            // Verify counts
            expect(stats.totalAttempts).toBe(modifiedAttempts.length);

            const expectedPassCount = modifiedAttempts.filter(
              a => a.validationResult.classification === 'pass'
            ).length;
            const expectedPartialCount = modifiedAttempts.filter(
              a => a.validationResult.classification === 'partial'
            ).length;
            const expectedRetryCount = modifiedAttempts.filter(
              a => a.validationResult.classification === 'retry'
            ).length;

            expect(stats.passCount).toBe(expectedPassCount);
            expect(stats.partialCount).toBe(expectedPartialCount);
            expect(stats.retryCount).toBe(expectedRetryCount);

            // Verify pass rate
            const expectedPassRate = expectedPassCount / modifiedAttempts.length;
            expect(stats.passRate).toBeCloseTo(expectedPassRate, 5);

            // Verify concepts proven (only pass events)
            const expectedConcepts = new Set(
              modifiedAttempts
                .filter(a => a.validationResult.classification === 'pass')
                .map(a => a.concept)
            );
            expect(stats.conceptsProven.length).toBe(expectedConcepts.size);
            for (const concept of stats.conceptsProven) {
              expect(expectedConcepts.has(concept)).toBe(true);
            }
          } finally {
            logger.destroy();
            mock.reset();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

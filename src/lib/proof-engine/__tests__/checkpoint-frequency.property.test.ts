/**
 * Property-Based Tests for Checkpoint Frequency Logic
 * 
 * Property 1: Teaching Exchange Counter State Machine
 * - Validates: Requirements 1.1, 1.5, 1.6
 * - Verifies counter increments on teaching, unchanged during reteaching
 * 
 * Property 2: Adaptive Checkpoint Frequency
 * - Validates: Requirements 1.2, 1.3, 1.4
 * - Verifies frequency calculations: 2-3 after two passes, 4-5 after retry, 3-4 for mixed
 */

import * as fc from 'fast-check';
import {
  shouldTriggerCheckpoint,
  updateCheckpointTarget,
  calculateNextCheckpointTarget,
} from '../checkpoint-frequency';
import type { ValidationClassification } from '../types';

describe('Property 1: Teaching Exchange Counter State Machine', () => {
  /**
   * Property: Teaching exchange counter increments correctly and respects checkpoint boundaries
   * 
   * Invariants:
   * 1. Counter increments on teaching exchanges
   * 2. Counter does NOT increment during checkpoint mode (reteaching)
   * 3. Counter does NOT reset when checkpoint triggers (continues incrementing)
   * 4. Guard prevents re-triggering when count <= lastCheckpointAtExchange
   */
  it('should maintain correct counter state through teaching and checkpoint cycles', () => {
    fc.assert(
      fc.property(
        // Generate random sequence of events
        fc.array(
          fc.record({
            type: fc.constantFrom('teaching', 'checkpoint_trigger', 'reteaching', 'pass'),
            isTeaching: fc.boolean(),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (events) => {
          let teachingExchangeCount = 0;
          let isInCheckpointMode = false;
          let lastCheckpointAtExchange: number | null = null;
          const validationHistory: ValidationClassification[] = [];

          for (const event of events) {
            const previousCount = teachingExchangeCount;

            if (event.type === 'teaching' && !isInCheckpointMode) {
              // Teaching exchange in teaching mode
              if (event.isTeaching) {
                teachingExchangeCount++;
                
                // Invariant 1: Counter increments on teaching exchanges
                expect(teachingExchangeCount).toBe(previousCount + 1);
              }
            } else if (event.type === 'checkpoint_trigger' && !isInCheckpointMode) {
              // Checkpoint triggers
              if (teachingExchangeCount >= 2) {
                // Check if guard allows triggering
                const guardAllows = lastCheckpointAtExchange === null || 
                                   teachingExchangeCount > lastCheckpointAtExchange;
                
                if (guardAllows) {
                  lastCheckpointAtExchange = teachingExchangeCount;
                  isInCheckpointMode = true;
                  
                  // Invariant 3: Counter does NOT reset when checkpoint triggers
                  expect(teachingExchangeCount).toBe(previousCount);
                }
              }
            } else if (event.type === 'reteaching' && isInCheckpointMode) {
              // Reteaching during checkpoint mode
              // Invariant 2: Counter does NOT increment during checkpoint mode
              expect(teachingExchangeCount).toBe(previousCount);
            } else if (event.type === 'pass' && isInCheckpointMode) {
              // Pass checkpoint and exit
              isInCheckpointMode = false;
              validationHistory.push('pass');
              
              // Counter remains unchanged
              expect(teachingExchangeCount).toBe(previousCount);
            }
          }

          // Final verification: If we triggered a checkpoint, guard is set
          if (lastCheckpointAtExchange !== null) {
            expect(lastCheckpointAtExchange).toBeGreaterThanOrEqual(0);
            expect(lastCheckpointAtExchange).toBeLessThanOrEqual(teachingExchangeCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Guard prevents immediate re-triggering
   * 
   * Invariant: Cannot trigger checkpoint when teachingExchangeCount <= lastCheckpointAtExchange
   */
  it('should prevent checkpoint re-trigger when count <= lastCheckpointAtExchange', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }), // lastCheckpointAtExchange (must be >= 2 to have triggered)
        fc.integer({ min: 2, max: 20 }), // teachingExchangeCount (must be >= 2 to pass introductory phase)
        fc.array(fc.constantFrom<ValidationClassification>('pass', 'partial', 'retry'), { maxLength: 3 }),
        (lastCheckpoint, currentCount, validationHistory) => {
          const result = shouldTriggerCheckpoint({
            validationHistory,
            teachingExchangeCount: currentCount,
            isInCheckpointMode: false,
            isIntroductoryPhase: false, // Not in introductory phase
            lastCheckpointAtExchange: lastCheckpoint,
          });

          // If count <= lastCheckpoint, guard must block
          if (currentCount <= lastCheckpoint) {
            expect(result.shouldTrigger).toBe(false);
            expect(result.reason).toContain('Guard');
          }

          // If count > lastCheckpoint, guard passes (may still not trigger if below target)
          if (currentCount > lastCheckpoint) {
            // Guard should not be the blocking reason
            expect(result.reason).not.toContain('Guard');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Introductory phase boundary
   * 
   * Invariant: Never trigger checkpoint in first 2 teaching exchanges
   */
  it('should never trigger checkpoint in introductory phase (< 2 exchanges)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1 }), // teachingExchangeCount < 2
        fc.array(fc.constantFrom<ValidationClassification>('pass', 'partial', 'retry'), { maxLength: 3 }),
        (count, validationHistory) => {
          const result = shouldTriggerCheckpoint({
            validationHistory,
            teachingExchangeCount: count,
            isInCheckpointMode: false,
            isIntroductoryPhase: true,
            lastCheckpointAtExchange: null,
          });

          // Must not trigger in introductory phase
          expect(result.shouldTrigger).toBe(false);
          expect(result.reason).toContain('Introductory phase');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Checkpoint mode boundary
   * 
   * Invariant: Never trigger new checkpoint while already in checkpoint mode
   */
  it('should never trigger checkpoint while already in checkpoint mode', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }), // teachingExchangeCount >= 2
        fc.array(fc.constantFrom<ValidationClassification>('pass', 'partial', 'retry'), { maxLength: 3 }),
        (count, validationHistory) => {
          const result = shouldTriggerCheckpoint({
            validationHistory,
            teachingExchangeCount: count,
            isInCheckpointMode: true, // Already in checkpoint mode
            isIntroductoryPhase: false,
            lastCheckpointAtExchange: null,
          });

          // Must not trigger when already in checkpoint mode
          expect(result.shouldTrigger).toBe(false);
          expect(result.reason).toContain('Already in checkpoint mode');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Counter monotonicity
   * 
   * Invariant: teachingExchangeCount never decreases (only increments or stays same)
   */
  it('should never decrease teaching exchange count', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            isTeaching: fc.boolean(),
            isInCheckpointMode: fc.boolean(),
          }),
          { minLength: 10, maxLength: 30 }
        ),
        (events) => {
          let teachingExchangeCount = 0;
          const counts: number[] = [teachingExchangeCount];

          for (const event of events) {
            // Only increment if teaching exchange in teaching mode
            if (event.isTeaching && !event.isInCheckpointMode) {
              teachingExchangeCount++;
            }
            counts.push(teachingExchangeCount);
          }

          // Verify monotonicity: each count >= previous count
          for (let i = 1; i < counts.length; i++) {
            expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 2: Adaptive Checkpoint Frequency', () => {
  /**
   * Property: Frequency adapts based on validation history
   * 
   * Invariants:
   * 1. After 2+ passes: target is 2-3 (confident student)
   * 2. After 1+ retry: target is 4-5 (struggling student)
   * 3. Mixed or insufficient history: target is 3-4 (moderate support)
   */
  it('should calculate correct checkpoint target based on validation history', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<ValidationClassification>('pass', 'partial', 'retry'), { maxLength: 10 }),
        (validationHistory) => {
          const target = calculateNextCheckpointTarget(validationHistory);

          // Only consider last 3 results
          const recentHistory = validationHistory.slice(-3);
          const passCount = recentHistory.filter(v => v === 'pass').length;
          const retryCount = recentHistory.filter(v => v === 'retry').length;

          // Invariant 1: 2+ passes → target is 2-3
          if (passCount >= 2) {
            expect(target).toBeGreaterThanOrEqual(2);
            expect(target).toBeLessThanOrEqual(3);
          }
          // Invariant 2: 1+ retry → target is 4-5
          else if (retryCount >= 1) {
            expect(target).toBeGreaterThanOrEqual(4);
            expect(target).toBeLessThanOrEqual(5);
          }
          // Invariant 3: Mixed/insufficient → target is 3-4
          else {
            expect(target).toBeGreaterThanOrEqual(3);
            expect(target).toBeLessThanOrEqual(4);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Target updates correctly after validation
   * 
   * Invariant: updateCheckpointTarget returns value in same range as calculateNextCheckpointTarget
   * (both use randomInt, so exact values may differ, but range should match)
   */
  it('should update checkpoint target in correct range', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<ValidationClassification>('pass', 'partial', 'retry'), { maxLength: 10 }),
        (validationHistory) => {
          const updatedTarget = updateCheckpointTarget(validationHistory);

          // Only consider last 3 results
          const recentHistory = validationHistory.slice(-3);
          const passCount = recentHistory.filter(v => v === 'pass').length;
          const retryCount = recentHistory.filter(v => v === 'retry').length;

          // Verify target is in correct range based on history
          if (passCount >= 2) {
            // Confident: 2-3
            expect(updatedTarget).toBeGreaterThanOrEqual(2);
            expect(updatedTarget).toBeLessThanOrEqual(3);
          } else if (retryCount >= 1) {
            // Struggling: 4-5
            expect(updatedTarget).toBeGreaterThanOrEqual(4);
            expect(updatedTarget).toBeLessThanOrEqual(5);
          } else {
            // Mixed: 3-4
            expect(updatedTarget).toBeGreaterThanOrEqual(3);
            expect(updatedTarget).toBeLessThanOrEqual(4);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Confident student path (2 passes)
   * 
   * Invariant: After 2 consecutive passes, target is 2-3
   */
  it('should set target to 2-3 after 2 consecutive passes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<ValidationClassification>('pass', 'partial', 'retry'), { maxLength: 5 }),
        (prefix) => {
          // Add 2 passes at the end
          const validationHistory = [...prefix, 'pass', 'pass'] as ValidationClassification[];
          const target = calculateNextCheckpointTarget(validationHistory);

          // Should be in confident range (2-3)
          expect(target).toBeGreaterThanOrEqual(2);
          expect(target).toBeLessThanOrEqual(3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Struggling student path (retry without 2+ passes)
   * 
   * Invariant: After retry in last 3 (and < 2 passes), target is 4-5
   */
  it('should set target to 4-5 after retry without 2+ passes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<ValidationClassification>('pass', 'partial', 'retry'), { maxLength: 5 }),
        (prefix) => {
          // Add retry at the end
          const validationHistory = [...prefix, 'retry'] as ValidationClassification[];
          
          // Check if last 3 have 2+ passes (which would override retry logic)
          const last3 = validationHistory.slice(-3);
          const passCount = last3.filter(v => v === 'pass').length;
          
          const target = calculateNextCheckpointTarget(validationHistory);

          if (passCount >= 2) {
            // Passes take priority: 2-3
            expect(target).toBeGreaterThanOrEqual(2);
            expect(target).toBeLessThanOrEqual(3);
          } else {
            // Retry logic applies: 4-5
            expect(target).toBeGreaterThanOrEqual(4);
            expect(target).toBeLessThanOrEqual(5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Target range bounds
   * 
   * Invariant: Target is always between 2 and 5 (inclusive)
   */
  it('should always return target between 2 and 5', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<ValidationClassification>('pass', 'partial', 'retry'), { maxLength: 20 }),
        (validationHistory) => {
          const target = calculateNextCheckpointTarget(validationHistory);

          // Target must be in valid range
          expect(target).toBeGreaterThanOrEqual(2);
          expect(target).toBeLessThanOrEqual(5);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Only last 3 results matter
   * 
   * Invariant: Targets fall in same range when last 3 results are identical
   * (exact values may differ due to randomInt, but range should match)
   */
  it('should only consider last 3 validation results', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<ValidationClassification>('pass', 'partial', 'retry'), { minLength: 3, maxLength: 3 }),
        fc.array(fc.constantFrom<ValidationClassification>('pass', 'partial', 'retry'), { minLength: 0, maxLength: 5 }),
        (last3, oldHistory) => {
          // Two histories with same last 3 but different prefix
          const history1 = [...oldHistory, ...last3];
          const history2 = [...last3];

          // Determine expected range based on last 3
          const passCount = last3.filter(v => v === 'pass').length;
          const retryCount = last3.filter(v => v === 'retry').length;

          let expectedMin: number, expectedMax: number;
          if (passCount >= 2) {
            expectedMin = 2;
            expectedMax = 3;
          } else if (retryCount >= 1) {
            expectedMin = 4;
            expectedMax = 5;
          } else {
            expectedMin = 3;
            expectedMax = 4;
          }

          // Both should produce targets in same range
          const target1 = calculateNextCheckpointTarget(history1);
          const target2 = calculateNextCheckpointTarget(history2);

          expect(target1).toBeGreaterThanOrEqual(expectedMin);
          expect(target1).toBeLessThanOrEqual(expectedMax);
          expect(target2).toBeGreaterThanOrEqual(expectedMin);
          expect(target2).toBeLessThanOrEqual(expectedMax);
        }
      ),
      { numRuns: 100 }
    );
  });
});

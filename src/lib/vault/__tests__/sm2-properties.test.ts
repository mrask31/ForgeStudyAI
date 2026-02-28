/**
 * Property-Based Tests for SM-2 Algorithm
 * 
 * These tests validate universal correctness properties that must hold
 * for ALL valid inputs to the SM-2 calculator.
 * 
 * Uses fast-check library for property-based testing.
 */

import fc from 'fast-check';
import { calculateNextReview } from '../sm2-calculator';

describe('SM-2 Algorithm Properties', () => {
  /**
   * Property 1: Ease factor floor is enforced
   * 
   * For ANY input where passed=false, the resulting ease factor
   * must NEVER drop below 1.3, regardless of how many times
   * the student fails.
   * 
   * Validates: Requirements 7.3
   */
  test('Property 1: Ease factor floor is enforced at 1.3', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // reviewsCompleted
        fc.double({ min: 1.3, max: 10.0, noNaN: true }), // easeFactor
        fc.integer({ min: 1, max: 365 }), // currentInterval
        (reviews, ease, interval) => {
          const result = calculateNextReview({
            passed: false,
            currentInterval: interval,
            easeFactor: ease,
            reviewsCompleted: reviews,
          });
          
          // Ease factor must NEVER drop below 1.3
          return result.newEaseFactor >= 1.3;
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property 2: Passing increases interval after warmup
   * 
   * For ANY input where passed=true AND reviewsCompleted >= 2,
   * the new interval must be STRICTLY GREATER than the current interval.
   * 
   * This ensures exponential growth after the warmup period.
   * 
   * Validates: Requirements 6.1
   */
  test('Property 2: Passing increases interval after warmup period', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 100 }), // reviewsCompleted >= 2 (after warmup)
        fc.double({ min: 1.3, max: 10.0, noNaN: true }), // easeFactor
        fc.integer({ min: 1, max: 365 }), // currentInterval
        (reviews, ease, interval) => {
          const result = calculateNextReview({
            passed: true,
            currentInterval: interval,
            easeFactor: ease,
            reviewsCompleted: reviews,
          });
          
          // New interval must be strictly greater than current
          return result.newInterval > interval;
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property 3: Failing always sets interval to 1
   * 
   * For ANY input where passed=false, the new interval must
   * ALWAYS be exactly 1 day, regardless of the current interval.
   * 
   * This ensures immediate review after failure.
   * 
   * Validates: Requirements 7.1
   */
  test('Property 3: Failing always resets interval to 1 day', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // reviewsCompleted
        fc.double({ min: 1.3, max: 10.0, noNaN: true }), // easeFactor
        fc.integer({ min: 1, max: 365 }), // currentInterval
        (reviews, ease, interval) => {
          const result = calculateNextReview({
            passed: false,
            currentInterval: interval,
            easeFactor: ease,
            reviewsCompleted: reviews,
          });
          
          // Interval must ALWAYS be 1 on failure
          return result.newInterval === 1;
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property 4: Next review date is always in the future
   * 
   * For ANY input (pass or fail), the next review date must
   * ALWAYS be in the future (greater than current timestamp).
   * 
   * This ensures the system never schedules reviews in the past.
   * 
   * Validates: Requirements 6.3, 7.4
   */
  test('Property 4: Next review date is always in the future', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // passed
        fc.integer({ min: 0, max: 100 }), // reviewsCompleted
        fc.double({ min: 1.3, max: 10.0, noNaN: true }), // easeFactor
        fc.integer({ min: 1, max: 365 }), // currentInterval
        (passed, reviews, ease, interval) => {
          const beforeCall = new Date();
          
          const result = calculateNextReview({
            passed,
            currentInterval: interval,
            easeFactor: ease,
            reviewsCompleted: reviews,
          });
          
          // Next review date must be in the future
          return result.nextReviewDate > beforeCall;
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property 5: Ease factor increases on pass
   * 
   * For ANY input where passed=true, the new ease factor must
   * be STRICTLY GREATER than the current ease factor.
   * 
   * This ensures topics get easier over time with successful reviews.
   * 
   * Validates: Requirements 6.2
   */
  test('Property 5: Ease factor increases by 0.1 on pass', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // reviewsCompleted
        fc.double({ min: 1.3, max: 10.0, noNaN: true }), // easeFactor
        fc.integer({ min: 1, max: 365 }), // currentInterval
        (reviews, ease, interval) => {
          const result = calculateNextReview({
            passed: true,
            currentInterval: interval,
            easeFactor: ease,
            reviewsCompleted: reviews,
          });
          
          // Ease factor must increase
          return result.newEaseFactor > ease;
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property 6: Ease factor decreases on fail (but respects floor)
   * 
   * For ANY input where passed=false AND easeFactor > 1.5,
   * the new ease factor must be STRICTLY LESS than the current ease factor.
   * 
   * (We use 1.5 threshold to avoid floor boundary cases)
   * 
   * Validates: Requirements 7.2
   */
  test('Property 6: Ease factor decreases by 0.2 on fail (above floor)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // reviewsCompleted
        fc.double({ min: 1.5, max: 10.0, noNaN: true }), // easeFactor > 1.5 (above floor)
        fc.integer({ min: 1, max: 365 }), // currentInterval
        (reviews, ease, interval) => {
          const result = calculateNextReview({
            passed: false,
            currentInterval: interval,
            easeFactor: ease,
            reviewsCompleted: reviews,
          });
          
          // Ease factor must decrease (but not below 1.3)
          return result.newEaseFactor < ease && result.newEaseFactor >= 1.3;
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property 7: First review is always 3 days
   * 
   * For ANY input where passed=true AND reviewsCompleted=0,
   * the new interval must ALWAYS be exactly 3 days.
   * 
   * This validates the warmup period logic.
   * 
   * Validates: Requirements 1.1
   */
  test('Property 7: First review after mastery is always 3 days', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.3, max: 10.0, noNaN: true }), // easeFactor
        fc.integer({ min: 0, max: 365 }), // currentInterval (ignored for first review)
        (ease, interval) => {
          const result = calculateNextReview({
            passed: true,
            currentInterval: interval,
            easeFactor: ease,
            reviewsCompleted: 0, // First review
          });
          
          // First review must be 3 days
          return result.newInterval === 3;
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property 8: Second review is always 6 days
   * 
   * For ANY input where passed=true AND reviewsCompleted=1,
   * the new interval must ALWAYS be exactly 6 days.
   * 
   * This validates the warmup period logic.
   * 
   * Validates: Requirements 6.1
   */
  test('Property 8: Second review after mastery is always 6 days', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.3, max: 10.0, noNaN: true }), // easeFactor
        fc.integer({ min: 1, max: 365 }), // currentInterval (ignored for second review)
        (ease, interval) => {
          const result = calculateNextReview({
            passed: true,
            currentInterval: interval,
            easeFactor: ease,
            reviewsCompleted: 1, // Second review
          });
          
          // Second review must be 6 days
          return result.newInterval === 6;
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property 9: Interval is always a positive integer
   * 
   * For ANY input, the new interval must be a positive integer
   * (no fractions, no zero, no negative values).
   * 
   * Validates: Mathematical correctness
   */
  test('Property 9: Interval is always a positive integer', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // passed
        fc.integer({ min: 0, max: 100 }), // reviewsCompleted
        fc.double({ min: 1.3, max: 10.0, noNaN: true }), // easeFactor
        fc.integer({ min: 1, max: 365 }), // currentInterval
        (passed, reviews, ease, interval) => {
          const result = calculateNextReview({
            passed,
            currentInterval: interval,
            easeFactor: ease,
            reviewsCompleted: reviews,
          });
          
          // Interval must be positive integer
          return (
            result.newInterval > 0 &&
            Number.isInteger(result.newInterval)
          );
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property 10: Ease factor is always >= 1.3
   * 
   * For ANY input (pass or fail), the new ease factor must
   * ALWAYS be >= 1.3, regardless of how many failures occur.
   * 
   * This is the most critical property for mathematical correctness.
   * 
   * Validates: Requirements 7.3
   */
  test('Property 10: Ease factor is ALWAYS >= 1.3 (universal floor)', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // passed
        fc.integer({ min: 0, max: 100 }), // reviewsCompleted
        fc.double({ min: 1.3, max: 10.0, noNaN: true }), // easeFactor
        fc.integer({ min: 1, max: 365 }), // currentInterval
        (passed, reviews, ease, interval) => {
          const result = calculateNextReview({
            passed,
            currentInterval: interval,
            easeFactor: ease,
            reviewsCompleted: reviews,
          });
          
          // Ease factor must NEVER drop below 1.3
          return result.newEaseFactor >= 1.3;
        }
      ),
      { numRuns: 1000 }
    );
  });
});

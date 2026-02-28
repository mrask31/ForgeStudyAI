/**
 * SM-2 Calculator Utility
 * 
 * Pure function implementation of the SuperMemo-2 algorithm for spaced repetition.
 * This module calculates optimal review intervals based on student performance.
 * 
 * Key principles:
 * - Pure functions with no side effects
 * - Ease factor floor at 1.3 (mathematically enforced)
 * - Exponential interval growth for successful reviews
 * - Interval reset to 1 day for failed reviews
 */

export interface SM2Input {
  passed: boolean;
  currentInterval: number; // days
  easeFactor: number; // 1.3 to ∞
  reviewsCompleted: number;
}

export interface SM2Output {
  newInterval: number; // days (integer)
  newEaseFactor: number; // 1.3 to ∞
  nextReviewDate: Date;
}

/**
 * Calculate next review interval using SuperMemo-2 algorithm
 * 
 * This is a pure function with no side effects.
 * All SM-2 logic is centralized here for testability.
 * 
 * Algorithm:
 * - Pass case: Interval grows exponentially (3 → 6 → exponential)
 * - Fail case: Interval resets to 1 day
 * - Ease factor adjusts based on performance (+0.1 on pass, -0.2 on fail)
 * - Ease factor floor at 1.3 is strictly enforced
 * 
 * @param input - Current SRS state and performance
 * @returns New SRS state with updated interval and ease factor
 */
export function calculateNextReview(input: SM2Input): SM2Output {
  const { passed, currentInterval, easeFactor, reviewsCompleted } = input;
  
  let newInterval: number;
  let newEaseFactor: number;
  
  if (passed) {
    // Success case: Increase interval and ease
    
    if (reviewsCompleted === 0) {
      // First review after mastery: 3 days
      newInterval = 3;
    } else if (reviewsCompleted === 1) {
      // Second review: 6 days
      newInterval = 6;
    } else {
      // Subsequent reviews: exponential growth
      newInterval = Math.ceil(currentInterval * easeFactor);
    }
    
    // Increase ease factor (topic is getting easier)
    newEaseFactor = easeFactor + 0.1;
    
  } else {
    // Failure case: Reset interval, decrease ease
    
    newInterval = 1; // Review tomorrow
    
    // Decrease ease factor (topic is harder than thought)
    newEaseFactor = easeFactor - 0.2;
    
    // Enforce minimum ease factor (prevent negative growth)
    if (newEaseFactor < 1.3) {
      newEaseFactor = 1.3;
    }
  }
  
  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  
  return {
    newInterval,
    newEaseFactor,
    nextReviewDate,
  };
}

/**
 * Initialize SRS tracking for newly mastered topic
 * 
 * Called when orbit_state transitions from 1 → 2
 * Sets initial values: interval=3 days, ease=2.5, reviews=0
 * 
 * @returns Initial SRS state
 */
export function initializeSRS(): SM2Output {
  return calculateNextReview({
    passed: true,
    currentInterval: 0,
    easeFactor: 2.5,
    reviewsCompleted: 0,
  });
}

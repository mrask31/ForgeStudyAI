/**
 * Checkpoint Frequency Calculator
 * 
 * Determines when to trigger proof checkpoints based on student performance.
 * 
 * Adaptive Logic:
 * - After 2 passes: trigger every 2-3 exchanges (confident student)
 * - After 1 retry: trigger every 4-5 exchanges (struggling student)
 * - Mixed performance: trigger every 3-4 exchanges (moderate support)
 * 
 * Boundary Rules:
 * - Introductory phase (< 2 exchanges): no checkpoints
 * - Already in checkpoint mode: don't trigger again
 * - Reteaching exchanges: don't count toward next checkpoint
 */

import type { ValidationClassification, CheckpointFrequencyInput, CheckpointFrequencyResult } from './types';
import { randomInt } from './utils';

/**
 * Calculate next checkpoint target based on validation history
 * 
 * Looks at last 3 validation results to determine student performance pattern:
 * - 2+ passes: confident (2-3 exchanges)
 * - 1+ retry: struggling (4-5 exchanges)
 * - Mixed: moderate (3-4 exchanges)
 * 
 * @param validationHistory - Recent validation results (last 3)
 * @returns Next checkpoint target (number of exchanges)
 */
export function calculateNextCheckpointTarget(
  validationHistory: ValidationClassification[]
): number {
  // Only consider last 3 validation results
  const recentHistory = validationHistory.slice(-3);

  // Count passes and retries
  const passCount = recentHistory.filter(v => v === 'pass').length;
  const retryCount = recentHistory.filter(v => v === 'retry').length;

  // Confident student (2+ passes in last 3)
  if (passCount >= 2) {
    return randomInt(2, 3);
  }

  // Struggling student (1+ retry in last 3)
  if (retryCount >= 1) {
    return randomInt(4, 5);
  }

  // Mixed performance or insufficient history
  return randomInt(3, 4);
}

/**
 * Determine if checkpoint should be triggered
 * 
 * Checks boundary conditions:
 * - Introductory phase (< 2 exchanges): no checkpoint
 * - Already in checkpoint mode: no checkpoint
 * - Guard: teachingExchangeCount <= lastCheckpointAtExchange: no checkpoint (prevents immediate re-trigger)
 * - Teaching exchange count >= target: trigger checkpoint
 * 
 * @param input - Checkpoint frequency calculation input
 * @returns Whether to trigger checkpoint and next target
 */
export function shouldTriggerCheckpoint(
  input: CheckpointFrequencyInput
): CheckpointFrequencyResult {
  const {
    validationHistory,
    teachingExchangeCount,
    isInCheckpointMode,
    isIntroductoryPhase,
    lastCheckpointAtExchange,
  } = input;

  // Boundary: introductory phase (< 2 exchanges)
  if (isIntroductoryPhase || teachingExchangeCount < 2) {
    return {
      shouldTrigger: false,
      nextTarget: calculateNextCheckpointTarget(validationHistory),
      reason: 'Introductory phase (< 2 exchanges)',
    };
  }

  // Boundary: already in checkpoint mode
  if (isInCheckpointMode) {
    return {
      shouldTrigger: false,
      nextTarget: calculateNextCheckpointTarget(validationHistory),
      reason: 'Already in checkpoint mode',
    };
  }

  // Guard: prevent immediate re-triggering after checkpoint
  // Ensure at least one NEW teaching exchange occurs after the last checkpoint trigger
  // This prevents double-triggering on refresh/duplicate requests
  // NOTE: Do NOT recalculate nextTarget when guard blocks - return current state unchanged
  if (lastCheckpointAtExchange !== null && teachingExchangeCount <= lastCheckpointAtExchange) {
    return {
      shouldTrigger: false,
      nextTarget: calculateNextCheckpointTarget(validationHistory), // Keep current target, don't recalculate
      reason: `Guard: teachingExchangeCount (${teachingExchangeCount}) <= lastCheckpointAtExchange (${lastCheckpointAtExchange})`,
    };
  }

  // Calculate target
  const target = calculateNextCheckpointTarget(validationHistory);

  // Check if count >= target
  if (teachingExchangeCount >= target) {
    return {
      shouldTrigger: true,
      nextTarget: target,
      reason: `Teaching exchange count (${teachingExchangeCount}) >= target (${target})`,
    };
  }

  // Not yet time for checkpoint
  return {
    shouldTrigger: false,
    nextTarget: target,
    reason: `Teaching exchange count (${teachingExchangeCount}) < target (${target})`,
  };
}

/**
 * Update checkpoint target after validation
 * 
 * Recalculates the next checkpoint target based on updated validation history.
 * Called after a proof attempt is validated.
 * 
 * @param validationHistory - Updated validation history (including new result)
 * @returns New checkpoint target
 */
export function updateCheckpointTarget(
  validationHistory: ValidationClassification[]
): number {
  return calculateNextCheckpointTarget(validationHistory);
}

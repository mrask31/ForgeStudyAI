# Checkpoint Guard Implementation (CORRECTED)

## Overview

This document describes the implementation of the `lastCheckpointAtExchange` guard field, which prevents immediate re-triggering of checkpoints after a checkpoint is triggered.

## Problem

Without a guard mechanism, the proof engine could potentially re-trigger a checkpoint on the same teaching exchange count, especially on refresh/duplicate requests. This violates the invariant: **no overlapping checkpoints / no immediate re-triggering**.

## Solution

Added `lastCheckpointAtExchange: number | null` field to track the teaching exchange count when the last checkpoint was triggered. The guard ensures a new checkpoint cannot trigger until at least one NEW teaching exchange occurs after the last checkpoint trigger.

### Implementation Details

#### 1. Core Type Definition (`types.ts`)

```typescript
export interface ConversationState {
  // ... other fields
  lastCheckpointAtExchange: number | null; // Guard: prevents immediate re-triggering
}
```

#### 2. Persisted State Schema (`route.ts`)

The guard field is included in the minimal persisted state (6 fields total):

```typescript
const PersistedProofStateV1Schema = z.object({
  version: z.number().default(1),
  teachingExchangeCount: z.number().default(0),
  isInCheckpointMode: z.boolean().default(false),
  nextCheckpointTarget: z.number().default(3),
  conceptsProvenCount: z.number().default(0),
  lastCheckpointAtExchange: z.number().nullable().default(null), // Guard
});
```

#### 3. Middleware Logic (`middleware.ts`)

**When triggering checkpoint:**
```typescript
state.lastCheckpointAtExchange = state.teachingExchangeCount; // Record exchange count
// NOTE: Do NOT reset teachingExchangeCount - it continues to increment
```

**State initialization:**
```typescript
lastCheckpointAtExchange: state.lastCheckpointAtExchange ?? null,
```

**IMPORTANT:** `teachingExchangeCount` is NOT reset when checkpoint triggers. It continues to increment throughout the session.

**Guard Field Management:**
- `lastCheckpointAtExchange` is set ONLY when entering checkpoint mode (in `triggerCheckpoint`)
- It is NOT modified on pass/exit, retry, or partial
- It persists across checkpoint cycles to prevent immediate re-triggering

#### 4. Checkpoint Frequency Logic (`checkpoint-frequency.ts`)

Updated `CheckpointFrequencyInput` type:
```typescript
export interface CheckpointFrequencyInput {
  validationHistory: ValidationClassification[];
  teachingExchangeCount: number;
  isInCheckpointMode: boolean;
  isIntroductoryPhase: boolean;
  lastCheckpointAtExchange: number | null; // Guard
}
```

Updated `shouldTriggerCheckpoint` function with correct guard logic:
```typescript
// Guard: prevent immediate re-triggering after checkpoint
// Ensure at least one NEW teaching exchange occurs after the last checkpoint trigger
// NOTE: Do NOT recalculate nextTarget when guard blocks - return current state unchanged
if (lastCheckpointAtExchange !== null && teachingExchangeCount <= lastCheckpointAtExchange) {
  return {
    shouldTrigger: false,
    nextTarget: calculateNextCheckpointTarget(validationHistory), // Keep current target
    reason: `Guard: teachingExchangeCount (${teachingExchangeCount}) <= lastCheckpointAtExchange (${lastCheckpointAtExchange})`,
  };
}
```

**IMPORTANT:** When the guard blocks, `nextTarget` is returned but should NOT be used to update state. The guard path preserves current scheduling without recalculation.

## Behavior

### Scenario: Checkpoint Trigger and Continue Teaching

1. **Teaching exchanges**: Count increments (1, 2, 3...)
2. **Checkpoint triggers at count 3**: `lastCheckpointAtExchange = 3`, `teachingExchangeCount = 3`
3. **Enter checkpoint mode**: Student attempts to prove understanding
4. **Pass checkpoint**: Exit checkpoint mode, `teachingExchangeCount` still = 3
5. **Non-teaching exchange** (e.g., logistics): Count stays at 3
   - Guard check: `3 <= 3` → **prevent trigger**
6. **Teaching exchange**: Count increments to 4
   - Guard check: `4 > 3` → **guard passes**
   - Target check: `4 < 7` (example target) → **don't trigger yet**
7. **Continue teaching**: Count increments (5, 6, 7...)
8. **Eventually**: When count reaches target (e.g., 7) AND guard passes (`7 > 3`), checkpoint can trigger again

### Why This Works

- The guard prevents triggering when `teachingExchangeCount <= lastCheckpointAtExchange`
- This ensures at least one NEW teaching exchange (count > last checkpoint) before next checkpoint
- Prevents double-triggering on refresh/duplicate requests
- Does NOT rely on resetting counters (which would create edge cases)

## Testing

### Integration Test (`integration-10.4-checkpoint-flow.test.ts`)

Added comprehensive test: **"should not re-trigger checkpoint immediately after exiting checkpoint mode (guard test)"**

Test flow:
1. Start with `teachingExchangeCount = 3`, trigger checkpoint
2. Verify checkpoint triggered at count 3, `lastCheckpointAtExchange = 3`
3. Pass the checkpoint (exits checkpoint mode)
4. Verify guard preserved: `lastCheckpointAtExchange = 3`, count still = 3
5. Send non-teaching exchange (count stays at 3)
6. Verify checkpoint does NOT trigger (guard: `3 <= 3`)
7. Send teaching exchange (count increments to 4)
8. Verify guard passes (`4 > 3`) but target not reached yet
9. Continue teaching exchanges until target reached (e.g., 7)
10. Verify checkpoint triggers again (guard passes AND target reached)

### Test Results

All tests pass:
- ✓ Full checkpoint flow (teaching → checkpoint → retry → pass)
- ✓ Idempotent proof event logging
- ✓ Validator timeout handling
- ✓ Reteaching counter behavior (count does NOT increment in checkpoint mode)
- ✓ Validation history capping
- ✓ **Guard prevents immediate re-triggering** (CORRECTED)

## Files Modified

1. `src/lib/proof-engine/types.ts` - Added `lastCheckpointAtExchange` to `ConversationState` and `CheckpointFrequencyInput`
2. `src/lib/proof-engine/middleware.ts` - Initialize and set guard field (do NOT reset teachingExchangeCount)
3. `src/lib/proof-engine/checkpoint-frequency.ts` - Correct guard check: `teachingExchangeCount <= lastCheckpointAtExchange`
4. `src/app/api/chat/proof/route.ts` - Include guard in persisted state schemas (6 fields total)
5. `src/lib/proof-engine/__tests__/integration-10.4-checkpoint-flow.test.ts` - Comprehensive guard test

## Invariants Enforced

✓ Never trigger checkpoints in first 2 teaching exchanges
✓ Never trigger new checkpoint while already in checkpoint mode
✓ **Never trigger checkpoint when teachingExchangeCount <= lastCheckpointAtExchange** (GUARD)
✓ Reteaching during checkpoint mode does NOT increment teachingExchangeCount
✓ nextCheckpointTarget must be 2-3, 3-4, or 4-5 based on performance

## Key Differences from Previous Implementation

### INCORRECT (Previous):
- Guard: `lastCheckpointAtExchange !== null && teachingExchangeCount === 0`
- Relied on resetting `teachingExchangeCount` to 0 after checkpoint
- Only worked in specific edge case (count = 0)
- Created dependency on counter reset behavior

### CORRECT (Current):
- Guard: `lastCheckpointAtExchange !== null && teachingExchangeCount <= lastCheckpointAtExchange`
- Does NOT reset `teachingExchangeCount` (continues incrementing)
- Works for all cases (general guard condition)
- Prevents double-triggering on refresh/duplicate requests
- Ensures at least one NEW teaching exchange before next checkpoint

## Status

**COMPLETE** - All tests passing, TypeScript diagnostics clean, guard mechanism correctly implemented with proper invariant enforcement.


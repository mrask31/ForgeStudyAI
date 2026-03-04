/**
 * Redis Cache Schema for LMS Autonomy Engine
 * Requirements: 5.1, 5.2, 5.3
 * 
 * This file defines Redis key patterns, TTL values, and cache invalidation strategies
 * for the LMS sync status caching system.
 */

/**
 * Redis Key Patterns
 * 
 * All keys follow a hierarchical namespace pattern for easy management and debugging.
 */
export const REDIS_KEYS = {
  /**
   * Sync Status Cache
   * Pattern: sync:status:{studentId}
   * TTL: 5 minutes (300 seconds)
   * 
   * Stores the current sync status for a student including:
   * - Active LMS connections
   * - Last sync timestamps
   * - New assignment counts
   * - Connection status indicators
   */
  SYNC_STATUS: (studentId: string) => `sync:status:${studentId}`,

  /**
   * Connection Status Cache
   * Pattern: sync:connection:{connectionId}
   * TTL: 5 minutes (300 seconds)
   * 
   * Stores individual connection status for quick lookups
   */
  CONNECTION_STATUS: (connectionId: string) => `sync:connection:${connectionId}`,

  /**
   * Sync Lock
   * Pattern: sync:lock:{studentId}
   * TTL: 2 minutes (120 seconds)
   * 
   * Prevents concurrent sync operations for the same student
   */
  SYNC_LOCK: (studentId: string) => `sync:lock:${studentId}`,
} as const;

/**
 * Redis TTL Values (in seconds)
 */
export const REDIS_TTL = {
  /** Sync status cache expires after 5 minutes */
  SYNC_STATUS: 300,
  
  /** Connection status cache expires after 5 minutes */
  CONNECTION_STATUS: 300,
  
  /** Sync lock expires after 2 minutes (safety timeout) */
  SYNC_LOCK: 120,
} as const;

/**
 * Cache Invalidation Strategy
 * 
 * The cache is invalidated in the following scenarios:
 * 
 * 1. **After Successful Sync**
 *    - Invalidate: sync:status:{studentId}
 *    - Invalidate: sync:connection:{connectionId}
 *    - Reason: New assignments may have been synced
 * 
 * 2. **After Failed Sync**
 *    - Invalidate: sync:status:{studentId}
 *    - Invalidate: sync:connection:{connectionId}
 *    - Reason: Connection status may have changed to 'blocked' or 'failed'
 * 
 * 3. **After Connection Authorization**
 *    - Invalidate: sync:status:{studentId}
 *    - Reason: New connection added
 * 
 * 4. **After Connection Disconnection**
 *    - Invalidate: sync:status:{studentId}
 *    - Invalidate: sync:connection:{connectionId}
 *    - Reason: Connection removed
 * 
 * 5. **After Manual Upload**
 *    - Invalidate: sync:status:{studentId}
 *    - Reason: New upload count changed
 * 
 * 6. **After Assignment Merge**
 *    - Invalidate: sync:status:{studentId}
 *    - Reason: Merged assignment indicators changed
 */

/**
 * Graceful Fallback Strategy
 * 
 * If Redis is unavailable:
 * 1. Log the error (do not throw)
 * 2. Fall back to direct database queries
 * 3. Continue operation without caching
 * 4. Monitor Redis connection health
 * 
 * This ensures the LMS sync system remains operational even if Redis fails.
 */

/**
 * Cache Data Structure for Sync Status
 */
export interface SyncStatusCache {
  studentId: string;
  connections: Array<{
    id: string;
    provider: 'canvas' | 'google_classroom';
    status: 'active' | 'blocked' | 'disconnected' | 'expired';
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
    minutesSinceSync: number | null;
  }>;
  newAssignmentsCount: number;
  cachedAt: string;
}

/**
 * Cache Data Structure for Connection Status
 */
export interface ConnectionStatusCache {
  id: string;
  provider: 'canvas' | 'google_classroom';
  status: 'active' | 'blocked' | 'disconnected' | 'expired';
  lastSyncAt: string | null;
  failureCount: number;
  cachedAt: string;
}

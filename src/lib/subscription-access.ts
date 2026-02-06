/**
 * Subscription Access Utility
 * 
 * Single source of truth for subscription access logic.
 * All gating must use this function.
 */

export const HAS_ACCESS_STATUSES = ['trialing', 'active'] as const;

export function hasSubscriptionAccess(status: string | null | undefined): boolean {
  return status != null && HAS_ACCESS_STATUSES.includes(status as any);
}

/**
 * Subscription Access Utility
 *
 * Single source of truth for subscription access logic.
 * All gating must use this function.
 */

export const HAS_ACCESS_STATUSES = ['trialing', 'active', 'beta'] as const;

export function hasSubscriptionAccess(
  status: string | null | undefined,
  trialEndsAt?: string | null
): boolean {
  if (status == null) return false;

  // If status is 'trialing', verify the trial hasn't actually expired
  if (status === 'trialing' && trialEndsAt) {
    const trialEnd = new Date(trialEndsAt);
    if (trialEnd <= new Date()) {
      return false; // Trial has expired even though status says 'trialing'
    }
  }

  return HAS_ACCESS_STATUSES.includes(status as any);
}

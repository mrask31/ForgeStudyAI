/**
 * Clear all stale auth and app state from localStorage.
 *
 * Supabase stores session tokens in keys prefixed with 'sb-'.
 * The app stores profile/cache data in keys prefixed with 'forgestudy-'.
 * On auth errors or logout, both must be cleared to prevent stale sessions
 * that require manual cache clearing to fix.
 */
export function clearAuthStorage() {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.startsWith('forgestudy-'))) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    // Also clear the active profile and any session-level sync flags
    localStorage.removeItem('active_profile_id');
    sessionStorage.clear();
  } catch (e) {
    console.warn('[auth-cleanup] Failed to clear storage:', e);
  }
}

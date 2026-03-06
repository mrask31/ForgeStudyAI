/**
 * Supabase Browser Client Singleton
 * 
 * This module provides a singleton instance of the Supabase browser client
 * to prevent memory leaks from creating multiple GoTrueClient instances.
 * 
 * Usage in React components:
 * ```tsx
 * import { useSupabaseBrowser } from '@/lib/supabase/client'
 * 
 * function MyComponent() {
 *   const supabase = useSupabaseBrowser()
 *   // Use supabase client...
 * }
 * ```
 */

import { createBrowserClient } from '@supabase/ssr';
import { useMemo } from 'react';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get or create a singleton Supabase browser client instance.
 * This prevents multiple GoTrueClient instances from being created.
 */
export function getSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}

/**
 * React hook to get the Supabase browser client.
 * Uses useMemo to ensure the client is only created once per component instance.
 */
export function useSupabaseBrowser() {
  return useMemo(() => getSupabaseBrowser(), []);
}

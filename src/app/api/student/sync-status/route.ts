/**
 * GET /api/student/sync-status
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 * 
 * High-traffic endpoint for Student Dashboard Dual-Intake Airlock.
 * Uses Redis cache for extreme speed.
 */

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getFromCache, setInCache } from '@/lib/lms/redis-client';
import { REDIS_KEYS, REDIS_TTL } from '@/lib/lms/redis-schema';
import type { StudentSyncStatusResponse, SyncStatusCache } from '@/lib/lms/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Authenticate student
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify user is a student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', user.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Only students can view sync status' },
        { status: 403 }
      );
    }

    // 3. Check Redis cache first
    const cacheKey = REDIS_KEYS.SYNC_STATUS(user.id);
    const cachedStatus = await getFromCache<SyncStatusCache>(cacheKey);

    if (cachedStatus) {
      // Cache hit - return immediately
      const response: StudentSyncStatusResponse = {
        connections: cachedStatus.connections.map((conn) => ({
          id: conn.id,
          provider: conn.provider,
          status: conn.status,
          lastSyncAt: conn.lastSyncAt,
          lastSyncStatus: conn.lastSyncStatus,
          minutesSinceSync: conn.minutesSinceSync,
          newAssignmentsCount: 0, // Simplified for cache
        })),
        hasActiveConnections: cachedStatus.connections.some((c) => c.status === 'active'),
        totalNewAssignments: cachedStatus.newAssignmentsCount,
      };

      return NextResponse.json(response);
    }

    // 4. Cache miss - query database
    const { data: connections, error: connectionsError } = await supabase
      .from('lms_connections')
      .select('id, provider, status, last_sync_at, last_sync_status, failure_count')
      .eq('student_id', user.id);

    if (connectionsError) {
      console.error('[Sync Status] Error fetching connections:', connectionsError);
      return NextResponse.json(
        { error: 'Failed to fetch sync status' },
        { status: 500 }
      );
    }

    // 5. Calculate new assignments count
    const { count: newAssignmentsCount } = await supabase
      .from('synced_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .gte('first_synced_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    // 6. Format response
    const now = Date.now();
    const formattedConnections = (connections || []).map((conn) => {
      let minutesSinceSync: number | null = null;

      if (conn.last_sync_at) {
        const lastSyncTime = new Date(conn.last_sync_at).getTime();
        minutesSinceSync = Math.floor((now - lastSyncTime) / (1000 * 60));
      }

      return {
        id: conn.id,
        provider: conn.provider,
        status: conn.status,
        lastSyncAt: conn.last_sync_at,
        lastSyncStatus: conn.last_sync_status,
        minutesSinceSync,
        newAssignmentsCount: 0, // Per-connection count (simplified)
      };
    });

    const response: StudentSyncStatusResponse = {
      connections: formattedConnections,
      hasActiveConnections: formattedConnections.some((c) => c.status === 'active'),
      totalNewAssignments: newAssignmentsCount || 0,
    };

    // 7. Cache the result
    const cacheData: SyncStatusCache = {
      studentId: user.id,
      connections: formattedConnections.map((conn) => ({
        id: conn.id,
        provider: conn.provider,
        status: conn.status,
        lastSyncAt: conn.lastSyncAt,
        lastSyncStatus: conn.lastSyncStatus,
        minutesSinceSync: conn.minutesSinceSync,
      })),
      newAssignmentsCount: newAssignmentsCount || 0,
      cachedAt: new Date().toISOString(),
    };

    await setInCache(cacheKey, cacheData, REDIS_TTL.SYNC_STATUS);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Sync Status] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/internal/sync/trigger
 * Requirements: 3.1, 3.3, 4.1, 4.3
 * 
 * Internal endpoint for triggering sync on student login.
 * Returns 202 Accepted immediately while sync runs asynchronously.
 */

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { SmartSyncService } from '@/lib/lms/services/SmartSyncService';
import type { TriggerSyncRequest, TriggerSyncResponse } from '@/lib/lms/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // 10 second timeout for serverless

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
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

    // 2. Parse request body
    let requestBody: TriggerSyncRequest | null = null;
    try {
      requestBody = await request.json();
    } catch {
      // No body provided
    }

    let studentId: string;

    // 3. Determine user role from profiles table
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Only students and parents can trigger sync' },
        { status: 403 }
      );
    }

    console.log('[Sync Trigger] User role:', { userId: user.id, role: userProfile.role });

    if (userProfile.role !== 'parent') {
      // Student-initiated sync
      studentId = user.id;

      // Students can only sync their own profile
      if (requestBody?.studentId && requestBody.studentId !== user.id) {
        return NextResponse.json(
          { error: 'Cannot trigger sync for another student' },
          { status: 403 }
        );
      }

      // If profileId is provided by student, we need to find the student_id from lms_connections
      if (requestBody?.profileId) {
        // Student is using profileId - find their lms_connection
        const { data: connection } = await supabase
          .from('lms_connections')
          .select('student_id')
          .eq('student_id', user.id)
          .eq('status', 'active')
          .single();

        if (!connection) {
          console.log(`[Sync Trigger] No active LMS connection found for student ${user.id}`);
          return NextResponse.json(
            { error: 'No active LMS connection found' },
            { status: 404 }
          );
        }

        studentId = connection.student_id;
      }
    } else {
      // Parent-initiated sync - profileId is required
      if (!requestBody?.profileId) {
        return NextResponse.json(
          { error: 'profileId is required for parent-initiated sync' },
          { status: 400 }
        );
      }

      // Step 1: Verify the profile belongs to this parent via student_profiles
      const { data: profile, error: profileError } = await supabase
        .from('student_profiles')
        .select('id, owner_id')
        .eq('id', requestBody.profileId)
        .eq('owner_id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('[Sync Trigger] Ownership check failed:', {
          profileId: requestBody.profileId,
          authUserId: user.id,
          profileError,
        });
        return NextResponse.json(
          { error: 'Profile not found or you do not have permission' },
          { status: 403 }
        );
      }

      console.log('[Sync Trigger] Step 1 - profile verified:', {
        profileId: profile.id,
        ownerId: profile.owner_id,
        authUserId: user.id,
      });

      // Step 2: Use service role client to bypass RLS — ownership already verified above
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Step 3: Look up lms_connection by parent_id (= auth user ID stored at connect time)
      // The connect route stores parent_id = user.id (auth UUID), so we match on that.
      // Also filter by student_id for specificity when parent has multiple students.
      const { data: connection, error: connError } = await supabaseAdmin
        .from('lms_connections')
        .select('id, student_id, parent_id, provider, status')
        .eq('parent_id', user.id)
        .eq('status', 'active')
        .limit(10);

      console.log('[Sync Trigger] Step 3 - lms_connections for parent:', JSON.stringify({
        parentAuthId: user.id,
        profileId: requestBody.profileId,
        connectionsFound: connection?.length ?? 0,
        connections: connection?.map(c => ({
          id: c.id,
          student_id: c.student_id,
          parent_id: c.parent_id,
          provider: c.provider,
          status: c.status,
        })),
        connError,
      }));

      // Find the connection matching this specific student profile
      const matched = connection?.find(c => c.student_id === requestBody.profileId);

      if (!matched) {
        // Fallback diagnostic: dump ALL connections for this parent to see the actual student_id values
        console.error('[Sync Trigger] No connection matched profileId:', {
          profileId: requestBody.profileId,
          parentAuthId: user.id,
          availableStudentIds: connection?.map(c => c.student_id),
        });
        return NextResponse.json(
          { error: 'No active LMS connection found for this profile' },
          { status: 404 }
        );
      }

      console.log('[Sync Trigger] Matched connection:', {
        connectionId: matched.id,
        studentId: matched.student_id,
        provider: matched.provider,
      });

      studentId = matched.student_id;
    }

    // 5. Return 202 Accepted immediately (async execution)
    const response = NextResponse.json(
      {
        success: true,
        message: 'Sync triggered successfully',
      },
      { status: 202 }
    );

    // 6. Trigger sync asynchronously (fire and forget)
    const syncService = new SmartSyncService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fire and forget - don't await
    syncService
      .syncOnLogin(studentId)
      .then((results) => {
        console.log(`[Sync Trigger] Completed sync for student ${studentId}:`, results);
      })
      .catch((error) => {
        console.error(`[Sync Trigger] Sync failed for student ${studentId}:`, error);
      });

    return response;
  } catch (error: any) {
    console.error('[Sync Trigger] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

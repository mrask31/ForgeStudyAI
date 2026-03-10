/**
 * POST /api/internal/sync/trigger
 * Requirements: 3.1, 3.3, 4.1, 4.3
 * 
 * Internal endpoint for triggering sync on student login.
 * Returns 202 Accepted immediately while sync runs asynchronously.
 */

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
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

    // 3. Check if user is a student
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('id', user.id)
      .single();

    if (student) {
      // Student-initiated sync
      studentId = user.id;
      
      // Students can only sync their own profile
      if (requestBody?.studentId && requestBody.studentId !== user.id) {
        return NextResponse.json(
          { error: 'Cannot trigger sync for another student' },
          { status: 403 }
        );
      }
    } else {
      // 4. Check if user is a parent
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!parent) {
        return NextResponse.json(
          { error: 'Only students and parents can trigger sync' },
          { status: 403 }
        );
      }

      // Parent-initiated sync - profileId is required
      if (!requestBody?.profileId) {
        return NextResponse.json(
          { error: 'profileId is required for parent-initiated sync' },
          { status: 400 }
        );
      }

      // Verify the profile belongs to this parent
      const { data: profile, error: profileError } = await supabase
        .from('student_profiles')
        .select('id, owner_id')
        .eq('id', requestBody.profileId)
        .eq('owner_id', user.id)
        .single();

      if (profileError || !profile) {
        return NextResponse.json(
          { error: 'Profile not found or you do not have permission' },
          { status: 403 }
        );
      }

      // Now find the student_id from lms_connections for this parent
      // The student_id in lms_connections is what we need for sync
      const { data: connection } = await supabase
        .from('lms_connections')
        .select('student_id')
        .eq('parent_id', user.id)
        .eq('status', 'active')
        .single();

      if (!connection) {
        return NextResponse.json(
          { error: 'No active LMS connection found for this profile' },
          { status: 404 }
        );
      }

      studentId = connection.student_id;
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

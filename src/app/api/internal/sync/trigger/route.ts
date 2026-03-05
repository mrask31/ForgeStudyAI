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
        { error: 'Only students can trigger sync' },
        { status: 403 }
      );
    }

    // 3. Parse request (optional - can use authenticated user ID)
    let studentId = user.id;
    try {
      const body: TriggerSyncRequest = await request.json();
      if (body.studentId && body.studentId !== user.id) {
        return NextResponse.json(
          { error: 'Cannot trigger sync for another student' },
          { status: 403 }
        );
      }
      studentId = body.studentId || user.id;
    } catch {
      // No body provided, use authenticated user ID
    }

    // 4. Return 202 Accepted immediately (async execution)
    // This prevents serverless timeout on long-running sync operations
    const response = NextResponse.json(
      {
        success: true,
        message: 'Sync triggered successfully',
      },
      { status: 202 }
    );

    // 5. Trigger sync asynchronously (fire and forget)
    // Use service role client for background operations
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

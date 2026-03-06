/**
 * GET /api/parent/lms/status/:studentId
 * Requirements: 2.8
 * 
 * Returns LMS connection status for a student.
 * Used by Parent Dashboard Integration Panel.
 */

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { LMSStatusResponse } from '@/lib/lms/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    // 1. Authenticate parent
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

    // 2. Verify user has access to this student profile
    const { data: studentProfile, error: studentError } = await supabase
      .from('student_profiles')
      .select('id, owner_id')
      .eq('id', params.studentId)
      .single();

    if (studentError || !studentProfile || studentProfile.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Student profile not found or access denied' },
        { status: 403 }
      );
    }

    // 3. Fetch connections for this student profile
    const { data: connections, error: connectionsError } = await supabase
      .from('lms_connections')
      .select('id, provider, status, last_sync_at, authorized_at')
      .eq('student_id', params.studentId);

    if (connectionsError) {
      console.error('[LMS Status] Error fetching connections:', connectionsError);
      return NextResponse.json(
        { error: 'Failed to fetch connection status' },
        { status: 500 }
      );
    }

    // 4. Format response
    const response: LMSStatusResponse = {
      connections: (connections || []).map((conn) => ({
        id: conn.id,
        provider: conn.provider,
        status: conn.status,
        lastSyncAt: conn.last_sync_at,
        authorizedAt: conn.authorized_at,
      })),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[LMS Status] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

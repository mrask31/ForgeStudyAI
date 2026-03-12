/**
 * DELETE /api/parent/lms/disconnect
 * Requirements: 2.9, 6.4
 * 
 * Allows parents to disconnect LMS connections.
 * Updates status to 'disconnected' and creates audit log.
 */

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { DisconnectLMSRequest, DisconnectLMSResponse } from '@/lib/lms/types';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
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

    // 2. Verify user is a parent
    const { data: parent, error: parentError } = await supabase
      .from('parents')
      .select('id')
      .eq('id', user.id)
      .single();

    if (parentError || !parent) {
      return NextResponse.json(
        { error: 'Only parents can disconnect LMS connections' },
        { status: 403 }
      );
    }

    // 3. Parse request
    const body: DisconnectLMSRequest = await request.json();

    if (!body.connectionId) {
      return NextResponse.json(
        { error: 'Missing required field: connectionId' },
        { status: 400 }
      );
    }

    // 4. Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('lms_connections')
      .select('id, student_id, provider')
      .eq('id', body.connectionId)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // 5. Verify parent owns this profile (security check via student_profiles)
    const { data: profile, error: profileError } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('id', connection.student_id)
      .eq('owner_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Access denied. You do not own this connection.' },
        { status: 403 }
      );
    }

    // 6. Delete the connection record
    const { error: deleteError } = await supabase
      .from('lms_connections')
      .delete()
      .eq('id', body.connectionId)
      .eq('student_id', connection.student_id); // Security check

    if (deleteError) {
      console.error('[LMS Disconnect] Error deleting connection:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect LMS connection' },
        { status: 500 }
      );
    }

    // 7. Create parent notification
    await supabase.from('parent_notifications').insert({
      parent_id: user.id,
      student_id: connection.student_id,
      notification_type: 'connection_disconnected',
      title: 'LMS Connection Disconnected',
      message: `Successfully disconnected ${connection.provider} for your student.`,
      metadata: { connectionId: connection.id, provider: connection.provider },
    });

    // 8. Create audit log entry
    await supabase.from('sync_logs').insert({
      lms_connection_id: body.connectionId,
      sync_trigger: 'manual',
      sync_status: 'failed',
      assignments_found: 0,
      assignments_downloaded: 0,
      error_message: 'Connection disconnected by parent',
      synced_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully disconnected ${connection.provider} connection.`,
    } as DisconnectLMSResponse);
  } catch (error: any) {
    console.error('[LMS Disconnect] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

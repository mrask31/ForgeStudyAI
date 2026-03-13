/**
 * DELETE /api/parent/lms/disconnect
 * Requirements: 2.9, 6.4
 * 
 * Allows parents to disconnect LMS connections.
 * Updates status to 'disconnected' and creates audit log.
 */

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
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
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (parentError || !parent) {
      console.error('[LMS Disconnect] Profile check failed:', { userId: user.id, parentError });
      return NextResponse.json(
        { error: 'Only parents can disconnect LMS connections' },
        { status: 403 }
      );
    }
    console.log('[LMS Disconnect] Step 1 passed - user authenticated:', user.id);

    // 3. Parse request
    const body: DisconnectLMSRequest = await request.json();

    if (!body.profileId || !body.provider) {
      return NextResponse.json(
        { error: 'Missing required fields: profileId, provider' },
        { status: 400 }
      );
    }

    // Normalize provider to DB enum value (DB stores 'canvas', 'google_classroom')
    const providerMap: Record<string, string> = {
      'canvas': 'canvas',
      'google classroom': 'google_classroom',
      'google_classroom': 'google_classroom',
    };
    const normalizedProvider = providerMap[body.provider.toLowerCase()];

    if (!normalizedProvider) {
      console.error('[LMS Disconnect] Unknown provider:', body.provider);
      return NextResponse.json(
        { error: `Unknown provider: ${body.provider}` },
        { status: 400 }
      );
    }

    // 4. Verify ownership via student_profiles
    const { data: profile, error: profileError } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('id', body.profileId)
      .eq('owner_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[LMS Disconnect] Ownership check failed:', { profileId: body.profileId, userId: user.id, profileError });
      return NextResponse.json(
        { error: 'Profile not found or access denied' },
        { status: 403 }
      );
    }
    console.log('[LMS Disconnect] Step 2 passed - ownership verified:', body.profileId);

    // 5. Delete the connection record by student_id + provider
    // Use service role client to bypass RLS — ownership already verified above
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: deleteResult, error: deleteError } = await supabaseAdmin
      .from('lms_connections')
      .delete()
      .eq('student_id', body.profileId)
      .eq('provider', normalizedProvider)
      .select();

    console.log('[LMS Disconnect] Step 3 delete result:', JSON.stringify({ deleteResult, deleteError, normalizedProvider }));

    if (deleteError) {
      console.error('[LMS Disconnect] Error deleting connection:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect LMS connection' },
        { status: 500 }
      );
    }

    // 6. Create parent notification (best-effort — never blocks disconnect response)
    try {
      await supabase.from('parent_notifications').insert({
        parent_id: user.id,
        student_id: body.profileId,
        notification_type: 'connection_disconnected',
        title: 'LMS Connection Disconnected',
        message: `Successfully disconnected ${normalizedProvider} for your student.`,
        metadata: { profileId: body.profileId, provider: normalizedProvider },
      });
    } catch (notifyError) {
      console.error('[LMS Disconnect] Failed to create disconnect notification:', notifyError);
      // Don't throw — notification failure is non-critical
    }

    return NextResponse.json({
      success: true,
      message: `Successfully disconnected ${normalizedProvider} connection.`,
    } as DisconnectLMSResponse);
  } catch (error: any) {
    console.error('[LMS Disconnect] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

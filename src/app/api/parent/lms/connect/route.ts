/**
 * POST /api/parent/lms/connect
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 6.2, 9.1
 * 
 * Handles parent authorization of LMS connections.
 * Validates credentials, encrypts tokens, and triggers initial sync.
 */

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CanvasAdapter } from '@/lib/lms/adapters/CanvasAdapter';
import { GoogleClassroomAdapter } from '@/lib/lms/adapters/GoogleClassroomAdapter';
import { TokenEncryption } from '@/lib/lms/services/TokenEncryption';
import { SmartSyncService } from '@/lib/lms/services/SmartSyncService';
import type { ConnectLMSRequest, ConnectLMSResponse } from '@/lib/lms/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
        { error: 'Only parents can authorize LMS connections' },
        { status: 403 }
      );
    }

    // 3. Parse and validate request
    const body: ConnectLMSRequest = await request.json();

    if (!body.studentId || !body.provider) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, provider' },
        { status: 400 }
      );
    }

    // 4. Verify parent has access to this student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, parent_id')
      .eq('id', body.studentId)
      .single();

    if (studentError || !student || student.parent_id !== user.id) {
      return NextResponse.json(
        { error: 'Student not found or access denied' },
        { status: 403 }
      );
    }

    // 5. Validate credentials based on provider
    let validationResult: { valid: boolean; errorMessage?: string };
    let tokenToEncrypt: string;
    let tokenExpiresAt: string | null = null;
    let metadata: Record<string, any> = {};

    if (body.provider === 'canvas') {
      if (!body.canvasInstanceUrl || !body.canvasPAT) {
        return NextResponse.json(
          { error: 'Missing Canvas credentials: canvasInstanceUrl, canvasPAT' },
          { status: 400 }
        );
      }

      // Test Canvas connection
      const adapter = new CanvasAdapter(body.canvasInstanceUrl, body.canvasPAT);
      validationResult = await adapter.validateToken();

      if (!validationResult.valid) {
        return NextResponse.json(
          {
            success: false,
            connectionId: '',
            status: 'expired',
            message: validationResult.errorMessage || 'Invalid Canvas credentials',
          } as ConnectLMSResponse,
          { status: 400 }
        );
      }

      tokenToEncrypt = body.canvasPAT;
      metadata = { instanceUrl: body.canvasInstanceUrl };
    } else if (body.provider === 'google_classroom') {
      if (!body.googleRefreshToken) {
        return NextResponse.json(
          { error: 'Missing Google Classroom credentials: googleRefreshToken' },
          { status: 400 }
        );
      }

      // For Google Classroom, we assume OAuth flow already validated the token
      // Store refresh token for future use
      tokenToEncrypt = body.googleRefreshToken;
      metadata = {
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
      };

      // Set token expiration (Google refresh tokens don't expire unless revoked)
      tokenExpiresAt = null;
    } else {
      return NextResponse.json(
        { error: 'Invalid provider. Must be canvas or google_classroom' },
        { status: 400 }
      );
    }

    // 6. Check for existing connection
    const { data: existingConnection } = await supabase
      .from('lms_connections')
      .select('id')
      .eq('student_id', body.studentId)
      .eq('provider', body.provider)
      .single();

    if (existingConnection) {
      return NextResponse.json(
        {
          success: false,
          connectionId: existingConnection.id,
          status: 'active',
          message: `${body.provider} connection already exists for this student`,
        } as ConnectLMSResponse,
        { status: 409 }
      );
    }

    // 7. Encrypt token
    const encryptedToken = TokenEncryption.encrypt(tokenToEncrypt);

    // 8. Create connection record
    const { data: connection, error: insertError } = await supabase
      .from('lms_connections')
      .insert({
        student_id: body.studentId,
        parent_id: user.id,
        provider: body.provider,
        status: 'active',
        encrypted_token: encryptedToken,
        token_expires_at: tokenExpiresAt,
        metadata,
        authorized_at: new Date().toISOString(),
        authorized_by: user.id,
      })
      .select()
      .single();

    if (insertError || !connection) {
      console.error('[LMS Connect] Error creating connection:', insertError);
      return NextResponse.json(
        { 
          error: 'Failed to create LMS connection',
          details: insertError ? (insertError.message || JSON.stringify(insertError)) : 'No connection returned'
        },
        { status: 500 }
      );
    }

    // 9. Create parent notification
    await supabase.from('parent_notifications').insert({
      parent_id: user.id,
      student_id: body.studentId,
      notification_type: 'connection_authorized',
      title: 'LMS Connection Authorized',
      message: `Successfully connected ${body.provider} for your student.`,
      metadata: { connectionId: connection.id, provider: body.provider },
    });

    // 10. Trigger initial sync (async, don't wait)
    // Use service role client for background sync
    const syncService = new SmartSyncService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fire and forget - sync runs in background
    syncService.syncOnLogin(body.studentId).catch((error) => {
      console.error('[LMS Connect] Initial sync failed:', error);
    });

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      status: connection.status,
      message: `Successfully connected ${body.provider}. Initial sync started.`,
    } as ConnectLMSResponse);
  } catch (error: any) {
    console.error('[LMS Connect] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/parent/lms/connect
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 6.2, 9.1
 *
 * Handles parent authorization of LMS connections.
 * Validates credentials, encrypts tokens, and triggers initial sync.
 */

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { CanvasAdapter } from '@/lib/lms/adapters/CanvasAdapter';
import { TokenEncryption } from '@/lib/lms/services/TokenEncryption';
import { SmartSyncService } from '@/lib/lms/services/SmartSyncService';
import type { ConnectLMSRequest, ConnectLMSResponse } from '@/lib/lms/types';

export const dynamic = 'force-dynamic';

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, connectionId: '', status: 'expired', message } as ConnectLMSResponse,
    { status }
  );
}

export async function POST(request: Request) {
  try {
    // 0. Pre-flight: verify encryption is configured
    if (!TokenEncryption.isConfigured()) {
      console.error('[LMS Connect] No encryption key found. Set one of: LMS_ENCRYPTION_KEY, ENCRYPTION_KEY, TOKEN_ENCRYPTION_KEY');
      return errorResponse(
        'Server configuration error: encryption key not found. Set LMS_ENCRYPTION_KEY, ENCRYPTION_KEY, or TOKEN_ENCRYPTION_KEY in environment.',
        500
      );
    }

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
      console.error('[LMS Connect] Auth failed:', authError?.message);
      return errorResponse('Unauthorized', 401);
    }

    console.log('[LMS Connect] Step 1: Authenticated user:', user.id);

    // 2. Parse and validate request
    const body: ConnectLMSRequest = await request.json();

    if (!body.studentId || !body.provider) {
      return errorResponse('Missing required fields: studentId, provider', 400);
    }

    // 3. Verify user has access to this student profile
    const { data: studentProfile, error: studentError } = await supabase
      .from('student_profiles')
      .select('id, owner_id')
      .eq('id', body.studentId)
      .single();

    if (studentError || !studentProfile || studentProfile.owner_id !== user.id) {
      console.error('[LMS Connect] Step 3: Student profile access denied:', {
        studentId: body.studentId,
        userId: user.id,
        error: studentError?.message,
      });
      return errorResponse('Student profile not found or access denied', 403);
    }

    console.log('[LMS Connect] Step 3: Student profile verified:', body.studentId);

    // 4. Validate credentials based on provider
    let validationResult: { valid: boolean; errorMessage?: string };
    let tokenToEncrypt: string;
    let tokenExpiresAt: string | null = null;
    let metadata: Record<string, any> = {};

    if (body.provider === 'canvas') {
      if (!body.canvasInstanceUrl || !body.canvasPAT) {
        return errorResponse('Missing Canvas credentials: canvasInstanceUrl, canvasPAT', 400);
      }

      // Normalize Canvas URL — strip trailing slashes and whitespace
      const canvasUrl = body.canvasInstanceUrl.trim().replace(/\/+$/, '');

      // Basic URL format validation
      try {
        const parsed = new URL(canvasUrl);
        if (parsed.protocol !== 'https:') {
          return errorResponse('Canvas URL must use HTTPS', 400);
        }
      } catch {
        return errorResponse(
          'Invalid Canvas URL format. Expected something like https://yourschool.instructure.com',
          400
        );
      }

      console.log('[LMS Connect] Step 4: Validating Canvas token against:', canvasUrl);

      // Test Canvas connection
      const adapter = new CanvasAdapter(canvasUrl, body.canvasPAT);
      validationResult = await adapter.validateToken();

      if (!validationResult.valid) {
        console.error('[LMS Connect] Step 4: Canvas token validation failed:', validationResult.errorMessage);
        return errorResponse(
          validationResult.errorMessage || 'Invalid Canvas credentials',
          400
        );
      }

      console.log('[LMS Connect] Step 4: Canvas token validated successfully');

      tokenToEncrypt = body.canvasPAT;
      metadata = { instanceUrl: canvasUrl };
    } else if (body.provider === 'google_classroom') {
      if (!body.googleRefreshToken) {
        return errorResponse('Missing Google Classroom credentials: googleRefreshToken', 400);
      }

      tokenToEncrypt = body.googleRefreshToken;
      metadata = {
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
      };

      tokenExpiresAt = null;
    } else {
      return errorResponse('Invalid provider. Must be canvas or google_classroom', 400);
    }

    // 5. Check for existing connection (any status)
    // Use service role to bypass RLS for reliable lookup
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existingConnection, error: existingError } = await supabaseAdmin
      .from('lms_connections')
      .select('id, status')
      .eq('student_id', body.studentId)
      .eq('provider', body.provider)
      .single();

    if (existingConnection) {
      if (existingConnection.status === 'active') {
        return errorResponse(
          `${body.provider} connection already exists for this student`,
          409
        );
      }

      // Remove old disconnected/blocked/expired connection so we can create a fresh one
      console.log('[LMS Connect] Step 5: Removing old connection:', {
        id: existingConnection.id,
        status: existingConnection.status,
      });

      const { error: deleteError } = await supabaseAdmin
        .from('lms_connections')
        .delete()
        .eq('id', existingConnection.id);

      if (deleteError) {
        console.error('[LMS Connect] Step 5: Failed to remove old connection:', deleteError);
        return errorResponse(
          'Failed to replace existing connection. Please try again.',
          500
        );
      }
    }

    // 6. Encrypt token
    console.log('[LMS Connect] Step 6: Encrypting token');
    let encryptedToken: string;
    try {
      encryptedToken = TokenEncryption.encrypt(tokenToEncrypt);
    } catch (encryptError: any) {
      console.error('[LMS Connect] Step 6: Token encryption failed:', encryptError.message);
      return errorResponse(
        'Failed to securely store credentials. Please contact support.',
        500
      );
    }

    // 7. Create connection record (use service role to avoid RLS issues)
    // parent_id & authorized_by = auth.uid() → profiles.id
    // student_id = student_profiles.id
    console.log('[LMS Connect] Step 7: Creating connection record', {
      student_id: body.studentId,
      parent_id: user.id,
      authorized_by: user.id,
      provider: body.provider,
    });
    const { data: connection, error: insertError } = await supabaseAdmin
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
      console.error('[LMS Connect] Step 7: Insert failed:', {
        code: insertError?.code,
        message: insertError?.message,
        details: insertError?.details,
        hint: insertError?.hint,
      });

      // Surface specific constraint errors for debugging
      const dbMsg = insertError?.message || '';
      let userMessage = 'Failed to create LMS connection. Please try again.';
      if (dbMsg.includes('violates foreign key constraint')) {
        userMessage = `Database constraint error: ${dbMsg}. The student or parent record may not exist in the expected table.`;
        console.error('[LMS Connect] FK CONSTRAINT VIOLATION — student_id:', body.studentId, 'parent_id:', user.id);
      } else if (dbMsg.includes('violates unique constraint')) {
        userMessage = 'A connection already exists for this student and provider. Please disconnect first.';
      }

      return errorResponse(userMessage, 500);
    }

    console.log('[LMS Connect] Step 7: Connection created:', connection.id);

    // 8. Create parent notification
    await supabaseAdmin.from('parent_notifications').insert({
      parent_id: user.id,
      student_id: body.studentId,
      notification_type: 'connection_authorized',
      title: 'LMS Connection Authorized',
      message: `Successfully connected ${body.provider} for your student.`,
      metadata: { connectionId: connection.id, provider: body.provider },
    });

    // 9. Trigger initial sync (async, don't wait)
    const syncService = new SmartSyncService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
    console.error('[LMS Connect] Unexpected error:', {
      message: error?.message,
      stack: error?.stack,
    });
    return errorResponse(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    );
  }
}

/**
 * GET /api/auth/google-classroom/callback
 *
 * OAuth callback from Google. Exchanges code for tokens,
 * encrypts the refresh token, creates the lms_connection,
 * and redirects to parent dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { TokenEncryption } from '@/lib/lms/services/TokenEncryption';

export const dynamic = 'force-dynamic';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;

  try {
    const code = req.nextUrl.searchParams.get('code');
    const stateParam = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');

    if (error) {
      console.error('[Google Callback] OAuth error:', error);
      return NextResponse.redirect(`${baseUrl}/parent?google_error=${encodeURIComponent(error)}`);
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(`${baseUrl}/parent?google_error=missing_params`);
    }

    // Decode state
    let state: { studentId: string; userId: string };
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64').toString());
    } catch {
      return NextResponse.redirect(`${baseUrl}/parent?google_error=invalid_state`);
    }

    const clientId = process.env['GOOGLE_CLIENT_ID'] || process.env['GOOGLE_OAUTH_CLIENT_ID'];
    const clientSecret = process.env['GOOGLE_CLIENT_SECRET'] || process.env['GOOGLE_OAUTH_CLIENT_SECRET'];
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${baseUrl}/parent?google_error=not_configured`);
    }

    const redirectUri = process.env['GOOGLE_REDIRECT_URI']
      || `${baseUrl}/api/auth/google-classroom/callback`;

    // Exchange authorization code for tokens
    console.log('[Google Callback] Exchanging code for tokens...');
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.refresh_token) {
      console.error('[Google Callback] Token exchange failed:', {
        status: tokenRes.status,
        error: tokenData.error,
        error_description: tokenData.error_description,
      });
      return NextResponse.redirect(`${baseUrl}/parent?google_error=token_exchange_failed`);
    }

    console.log('[Google Callback] Token exchange successful');

    // Authenticate the parent via cookies
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }); },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== state.userId) {
      console.error('[Google Callback] Auth mismatch:', { authError: authError?.message, userId: user?.id, stateUserId: state.userId });
      return NextResponse.redirect(`${baseUrl}/parent?google_error=auth_mismatch`);
    }

    // Verify student profile ownership
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('id, owner_id')
      .eq('id', state.studentId)
      .single();

    if (!profile || profile.owner_id !== user.id) {
      return NextResponse.redirect(`${baseUrl}/parent?google_error=profile_access_denied`);
    }

    // Encrypt the refresh token
    if (!TokenEncryption.isConfigured()) {
      console.error('[Google Callback] Encryption not configured');
      return NextResponse.redirect(`${baseUrl}/parent?google_error=encryption_not_configured`);
    }

    const encryptedToken = TokenEncryption.encrypt(tokenData.refresh_token);

    // Use service role to bypass RLS for lms_connections
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Remove any existing google_classroom connection for this student
    await supabaseAdmin
      .from('lms_connections')
      .delete()
      .eq('student_id', state.studentId)
      .eq('provider', 'google_classroom');

    // Create new connection
    const { data: connection, error: insertError } = await supabaseAdmin
      .from('lms_connections')
      .insert({
        student_id: state.studentId,
        parent_id: user.id,
        provider: 'google_classroom',
        status: 'active',
        encrypted_token: encryptedToken,
        token_expires_at: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
        metadata: {
          clientId,
          clientSecret,
          tokenUri: GOOGLE_TOKEN_URL,
          accessToken: tokenData.access_token,
        },
        authorized_at: new Date().toISOString(),
        authorized_by: user.id,
      })
      .select()
      .single();

    if (insertError || !connection) {
      console.error('[Google Callback] Failed to create connection:', insertError);
      return NextResponse.redirect(`${baseUrl}/parent?google_error=connection_failed`);
    }

    console.log('[Google Callback] Connection created:', connection.id);

    // Create notification
    await supabaseAdmin.from('parent_notifications').insert({
      parent_id: user.id,
      student_id: state.studentId,
      notification_type: 'connection_authorized',
      title: 'Google Classroom Connected',
      message: 'Successfully connected Google Classroom for your student.',
      metadata: { connectionId: connection.id, provider: 'google_classroom' },
    });

    return NextResponse.redirect(`${baseUrl}/parent?google_connected=true`);
  } catch (error: any) {
    console.error('[Google Callback] Unexpected error:', error.message);
    return NextResponse.redirect(`${baseUrl}/parent?google_error=unexpected`);
  }
}

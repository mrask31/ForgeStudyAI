/**
 * GET /api/parent/lms/google-callback
 *
 * OAuth callback from Google. Exchanges code for tokens,
 * then calls the existing /api/parent/lms/connect endpoint
 * with the refresh token to complete the connection.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const stateParam = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;

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
      console.error('[Google Callback] Token exchange failed:', tokenData);
      return NextResponse.redirect(`${baseUrl}/parent?google_error=token_exchange_failed`);
    }

    // Forward to the connect endpoint by calling it internally
    // We pass cookies through so the connect route can authenticate
    const connectRes = await fetch(`${baseUrl}/api/parent/lms/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        studentId: state.studentId,
        provider: 'google_classroom',
        googleRefreshToken: tokenData.refresh_token,
      }),
    });

    const connectData = await connectRes.json();

    if (!connectRes.ok || !connectData.success) {
      const errMsg = connectData.message || connectData.error || 'connect_failed';
      return NextResponse.redirect(`${baseUrl}/parent?google_error=${encodeURIComponent(errMsg)}`);
    }

    // Success — redirect back to parent dashboard
    return NextResponse.redirect(`${baseUrl}/parent?google_connected=true`);
  } catch (error: any) {
    console.error('[Google Callback] Error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
    return NextResponse.redirect(`${baseUrl}/parent?google_error=unexpected`);
  }
}

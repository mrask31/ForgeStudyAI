/**
 * GET /api/parent/lms/google-auth
 *
 * Initiates Google Classroom OAuth flow.
 * Returns the Google OAuth consent URL for the parent to authorize.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = req.nextUrl.searchParams.get('studentId');
    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const clientId = process.env['GOOGLE_CLIENT_ID'] || process.env['GOOGLE_OAUTH_CLIENT_ID'];
    if (!clientId) {
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
    }

    // Build base URL for callback
    const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://www.forgestudyai.com';
    const redirectUri = process.env['GOOGLE_REDIRECT_URI']
      || `${baseUrl}/api/auth/google-classroom/callback`;

    // Encode state with studentId for the callback
    const state = Buffer.from(JSON.stringify({ studentId, userId: user.id })).toString('base64');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

    return NextResponse.json({ url: authUrl });
  } catch (error: any) {
    console.error('[Google Auth] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

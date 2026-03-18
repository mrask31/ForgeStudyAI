/**
 * GET /api/lms/test-connect
 *
 * TEMPORARY diagnostic endpoint for debugging Canvas connect failures.
 * Returns detailed diagnostic info without exposing secrets.
 *
 * IMPORTANT: Uses bracket notation process.env['VAR'] to avoid
 * Next.js webpack build-time replacement of process.env.VAR.
 *
 * DELETE THIS FILE after debugging is complete.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TokenEncryption } from '@/lib/lms/services/TokenEncryption';

export const dynamic = 'force-dynamic';

/**
 * Read env var using bracket notation to bypass Next.js webpack DefinePlugin.
 * process.env.FOO gets replaced at build time; process.env['FOO'] reads at runtime.
 */
function env(name: string): string | undefined {
  return process.env[name];
}

export async function GET() {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // 0. List all env var NAMES (no values) to debug naming mismatches
  // Filter out anything that could contain a secret in its name
  const sensitivePatterns = ['SECRET', 'KEY', 'TOKEN', 'PASSWORD', 'CREDENTIAL', 'PRIVATE'];
  diagnostics.checks.allEnvKeys = Object.keys(process.env)
    .filter(k => !sensitivePatterns.some(p => k.toUpperCase().includes(p)))
    .sort()
    .join(', ');

  // Also show env var names that DO contain KEY/TOKEN/SECRET — just the names, not values
  diagnostics.checks.sensitiveEnvKeyNames = Object.keys(process.env)
    .filter(k => sensitivePatterns.some(p => k.toUpperCase().includes(p)))
    .sort()
    .join(', ');

  // 1. Environment variables — use bracket notation for runtime reads
  const encryptionKeyFound = env('LMS_ENCRYPTION_KEY')
    || env('ENCRYPTION_KEY')
    || env('TOKEN_ENCRYPTION_KEY');
  const encryptionKeySource = env('LMS_ENCRYPTION_KEY') ? 'LMS_ENCRYPTION_KEY'
    : env('ENCRYPTION_KEY') ? 'ENCRYPTION_KEY'
    : env('TOKEN_ENCRYPTION_KEY') ? 'TOKEN_ENCRYPTION_KEY'
    : 'NONE';

  diagnostics.checks.envVars = {
    NEXT_PUBLIC_SUPABASE_URL: !!env('NEXT_PUBLIC_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: !!env('SUPABASE_SERVICE_ROLE_KEY'),
    LMS_ENCRYPTION_KEY: !!env('LMS_ENCRYPTION_KEY'),
    ENCRYPTION_KEY: !!env('ENCRYPTION_KEY'),
    TOKEN_ENCRYPTION_KEY: !!env('TOKEN_ENCRYPTION_KEY'),
    encryptionKeySource,
    encryptionKeyLength: encryptionKeyFound?.length ?? 0,
    ANTHROPIC_API_KEY: !!env('ANTHROPIC_API_KEY'),
    GOOGLE_OAUTH_CLIENT_ID: !!env('GOOGLE_OAUTH_CLIENT_ID'),
    GOOGLE_OAUTH_CLIENT_SECRET: !!env('GOOGLE_OAUTH_CLIENT_SECRET'),
    REDIS_URL: !!env('REDIS_URL'),
  };

  const missingRequired: string[] = [];
  if (!env('NEXT_PUBLIC_SUPABASE_URL')) missingRequired.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!env('NEXT_PUBLIC_SUPABASE_ANON_KEY')) missingRequired.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!env('SUPABASE_SERVICE_ROLE_KEY')) missingRequired.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!encryptionKeyFound) missingRequired.push('LMS_ENCRYPTION_KEY (or ENCRYPTION_KEY or TOKEN_ENCRYPTION_KEY)');
  diagnostics.checks.missingRequired = missingRequired;

  // 2. Encryption roundtrip test (TokenEncryption already uses bracket notation internally)
  try {
    diagnostics.checks.encryptionConfigured = TokenEncryption.isConfigured();
    diagnostics.checks.encryptionRoundtrip = TokenEncryption.test();
  } catch (e: any) {
    diagnostics.checks.encryptionConfigured = false;
    diagnostics.checks.encryptionRoundtrip = false;
    diagnostics.checks.encryptionError = e.message;
  }

  // 3. Canvas API reachability (dummy token — we just want to see if we get a response)
  try {
    const canvasUrl = 'https://canvas.instructure.com/api/v1/users/self';
    const response = await fetch(canvasUrl, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer dummy-token-for-connectivity-test',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    diagnostics.checks.canvasReachability = {
      reachable: true,
      status: response.status,
      statusText: response.statusText,
      note: response.status === 401
        ? 'GOOD: Canvas returned 401 (expected for dummy token — server is reachable)'
        : `Unexpected status ${response.status}`,
    };
  } catch (e: any) {
    diagnostics.checks.canvasReachability = {
      reachable: false,
      error: e.message,
      errorName: e.name,
      note: 'Canvas API is NOT reachable from this server. Check network/firewall.',
    };
  }

  // 4. Supabase connectivity + table checks
  const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = env('SUPABASE_SERVICE_ROLE_KEY');

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Check lms_connections table
      const { data: connections, error: connError } = await supabase
        .from('lms_connections')
        .select('id, student_id, parent_id, provider, status')
        .limit(5);

      diagnostics.checks.supabase = {
        connected: true,
        lmsConnectionsTable: {
          accessible: !connError,
          error: connError ? { code: connError.code, message: connError.message, hint: connError.hint } : null,
          rowCount: connections?.length ?? 0,
          rows: connections?.map(c => ({
            id: c.id,
            student_id: c.student_id,
            parent_id: c.parent_id,
            provider: c.provider,
            status: c.status,
          })) ?? [],
        },
      };

      // Check student_profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('student_profiles')
        .select('id, owner_id')
        .limit(5);

      diagnostics.checks.studentProfilesTable = {
        accessible: !profilesError,
        error: profilesError ? { code: profilesError.code, message: profilesError.message, hint: profilesError.hint } : null,
        rowCount: profiles?.length ?? 0,
        sampleRows: profiles?.map(p => ({ id: p.id, owner_id: p.owner_id })) ?? [],
      };

      // Check profiles table (parent_id FK target)
      const { data: profilesMain, error: profilesMainError } = await supabase
        .from('profiles')
        .select('id')
        .limit(5);

      diagnostics.checks.profilesTable = {
        accessible: !profilesMainError,
        error: profilesMainError ? { code: profilesMainError.code, message: profilesMainError.message } : null,
        rowCount: profilesMain?.length ?? 0,
        sampleIds: profilesMain?.map(p => p.id) ?? [],
      };

      // FK constraint test using correct tables (profiles + student_profiles)
      if (profiles && profiles.length > 0 && profilesMain && profilesMain.length > 0) {
        const testStudentId = profiles[0].id;
        const testParentId = profiles[0].owner_id;

        // Check: does owner_id exist in profiles table?
        const { data: parentMatch } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', testParentId)
          .single();

        diagnostics.checks.fkConstraintTest = {
          studentProfileId: testStudentId,
          parentId: testParentId,
          parentExistsInProfilesTable: !!parentMatch,
          parentNote: parentMatch
            ? 'OK: parent auth.uid() found in profiles table'
            : 'WARNING: parent auth.uid() NOT found in profiles table',
        };
      }

    } catch (e: any) {
      diagnostics.checks.supabase = {
        connected: false,
        error: e.message,
      };
    }
  }

  // 5. Summary verdict
  const issues: string[] = [];
  if (missingRequired.length > 0) {
    issues.push(`Missing env vars: ${missingRequired.join(', ')}`);
  }
  if (!diagnostics.checks.encryptionRoundtrip) {
    issues.push('Encryption roundtrip FAILED');
  }
  if (diagnostics.checks.canvasReachability && !diagnostics.checks.canvasReachability.reachable) {
    issues.push('Canvas API is NOT reachable from server');
  }

  diagnostics.verdict = issues.length === 0
    ? 'ALL CHECKS PASSED'
    : `ISSUES FOUND: ${issues.join(' | ')}`;
  diagnostics.issues = issues;

  return NextResponse.json(diagnostics, { status: 200 });
}

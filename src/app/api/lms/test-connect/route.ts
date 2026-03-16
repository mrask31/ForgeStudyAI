/**
 * GET /api/lms/test-connect
 *
 * TEMPORARY diagnostic endpoint for debugging Canvas connect failures.
 * Returns detailed diagnostic info without exposing secrets.
 *
 * DELETE THIS FILE after debugging is complete.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TokenEncryption } from '@/lib/lms/services/TokenEncryption';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // 1. Environment variables
  diagnostics.checks.envVars = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    LMS_ENCRYPTION_KEY: !!process.env.LMS_ENCRYPTION_KEY,
    LMS_ENCRYPTION_KEY_LENGTH: process.env.LMS_ENCRYPTION_KEY?.length ?? 0,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    GOOGLE_OAUTH_CLIENT_ID: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    REDIS_URL: !!process.env.REDIS_URL,
  };

  const missingRequired: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingRequired.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingRequired.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingRequired.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!process.env.LMS_ENCRYPTION_KEY) missingRequired.push('LMS_ENCRYPTION_KEY');
  diagnostics.checks.missingRequired = missingRequired;

  // 2. Encryption roundtrip test
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
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

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

      // Check if students table exists and what IDs are in it
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .limit(5);

      diagnostics.checks.studentsTable = {
        accessible: !studentsError,
        error: studentsError ? { code: studentsError.code, message: studentsError.message, hint: studentsError.hint } : null,
        rowCount: students?.length ?? 0,
        sampleIds: students?.map(s => s.id) ?? [],
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

      // Check parents table
      const { data: parents, error: parentsError } = await supabase
        .from('parents')
        .select('id')
        .limit(5);

      diagnostics.checks.parentsTable = {
        accessible: !parentsError,
        error: parentsError ? { code: parentsError.code, message: parentsError.message, hint: parentsError.hint } : null,
        rowCount: parents?.length ?? 0,
        sampleIds: parents?.map(p => p.id) ?? [],
      };

      // Check profiles table (used by disconnect route)
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

      // FK CONSTRAINT TEST: Try to insert and immediately rollback
      // This tests if the FK from lms_connections.student_id -> students(id) would pass
      // Use a known student profile ID
      if (profiles && profiles.length > 0) {
        const testStudentId = profiles[0].id;
        const testParentId = profiles[0].owner_id;

        // Check: does this student_profiles.id exist in the students table?
        const { data: studentMatch, error: studentMatchError } = await supabase
          .from('students')
          .select('id')
          .eq('id', testStudentId)
          .single();

        diagnostics.checks.fkConstraintTest = {
          studentProfileId: testStudentId,
          parentId: testParentId,
          existsInStudentsTable: !!studentMatch && !studentMatchError,
          existsInParentsTable: false, // will check below
          note: !studentMatch
            ? 'CRITICAL: student_profiles.id does NOT exist in students table — FK constraint will FAIL on insert!'
            : 'OK: student_profiles.id found in students table',
        };

        // Check: does the parent (owner_id) exist in the parents table?
        const { data: parentMatch, error: parentMatchError } = await supabase
          .from('parents')
          .select('id')
          .eq('id', testParentId)
          .single();

        diagnostics.checks.fkConstraintTest.existsInParentsTable = !!parentMatch && !parentMatchError;
        diagnostics.checks.fkConstraintTest.parentNote = !parentMatch
          ? 'CRITICAL: parent auth.uid() does NOT exist in parents table — FK constraint will FAIL on insert!'
          : 'OK: parent auth.uid() found in parents table';
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
  if (diagnostics.checks.fkConstraintTest && !diagnostics.checks.fkConstraintTest.existsInStudentsTable) {
    issues.push('FK MISMATCH: student_profiles.id not found in students table');
  }
  if (diagnostics.checks.fkConstraintTest && !diagnostics.checks.fkConstraintTest.existsInParentsTable) {
    issues.push('FK MISMATCH: parent auth.uid() not found in parents table');
  }

  diagnostics.verdict = issues.length === 0
    ? 'ALL CHECKS PASSED'
    : `ISSUES FOUND: ${issues.join(' | ')}`;
  diagnostics.issues = issues;

  return NextResponse.json(diagnostics, { status: 200 });
}

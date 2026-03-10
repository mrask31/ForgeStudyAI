/**
 * Diagnostic script to check sync status
 * Run with: node scripts/diagnostic-sync-check.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iylxyqftdnuymthzoerb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runDiagnostic() {
  console.log('='.repeat(80));
  console.log('SYNC DIAGNOSTIC REPORT');
  console.log('='.repeat(80));
  console.log('');

  // 1. Check synced_assignments
  console.log('1. SYNCED_ASSIGNMENTS TABLE:');
  console.log('-'.repeat(80));
  const { data: assignments, error: assignmentsError } = await supabase
    .from('synced_assignments')
    .select('id, title, sync_status, merge_status, created_at')
    .order('created_at', { ascending: false });

  if (assignmentsError) {
    console.error('ERROR:', assignmentsError.message);
  } else if (!assignments || assignments.length === 0) {
    console.log('No rows found in synced_assignments table');
  } else {
    console.log(`Found ${assignments.length} rows:`);
    assignments.forEach((a, i) => {
      console.log(`\n  [${i + 1}]`);
      console.log(`    ID: ${a.id}`);
      console.log(`    Title: ${a.title}`);
      console.log(`    Sync Status: ${a.sync_status}`);
      console.log(`    Merge Status: ${a.merge_status || 'NULL'}`);
      console.log(`    Created At: ${a.created_at}`);
    });
  }
  console.log('');

  // 2. Check study_topics
  console.log('2. STUDY_TOPICS TABLE:');
  console.log('-'.repeat(80));
  const { data: topics, error: topicsError } = await supabase
    .from('study_topics')
    .select('*')
    .order('created_at', { ascending: false });

  if (topicsError) {
    console.error('ERROR:', topicsError.message);
  } else if (!topics || topics.length === 0) {
    console.log('No rows found in study_topics table');
  } else {
    console.log(`Found ${topics.length} rows:`);
    topics.forEach((t, i) => {
      console.log(`\n  [${i + 1}]`);
      console.log(`    ID: ${t.id}`);
      console.log(`    Profile ID: ${t.profile_id}`);
      console.log(`    Title: ${t.title}`);
      console.log(`    Source: ${t.source}`);
      console.log(`    Orbit State: ${t.orbit_state}`);
      console.log(`    Synced Assignment ID: ${t.synced_assignment_id || 'NULL'}`);
      console.log(`    Created At: ${t.created_at}`);
    });
  }
  console.log('');

  // 3. Check sync_logs
  console.log('3. SYNC_LOGS TABLE (Most Recent 3):');
  console.log('-'.repeat(80));
  const { data: logs, error: logsError } = await supabase
    .from('sync_logs')
    .select('sync_trigger, sync_status, error_message, metadata, created_at, assignments_found, assignments_downloaded')
    .order('created_at', { ascending: false })
    .limit(3);

  if (logsError) {
    console.error('ERROR:', logsError.message);
  } else if (!logs || logs.length === 0) {
    console.log('No rows found in sync_logs table');
  } else {
    console.log(`Found ${logs.length} recent logs:`);
    logs.forEach((log, i) => {
      console.log(`\n  [${i + 1}]`);
      console.log(`    Trigger: ${log.sync_trigger}`);
      console.log(`    Status: ${log.sync_status}`);
      console.log(`    Assignments Found: ${log.assignments_found || 0}`);
      console.log(`    Assignments Downloaded: ${log.assignments_downloaded || 0}`);
      console.log(`    Error Message: ${log.error_message || 'None'}`);
      console.log(`    Metadata: ${JSON.stringify(log.metadata || {})}`);
      console.log(`    Created At: ${log.created_at}`);
    });
  }
  console.log('');

  // 4. Check lms_connections
  console.log('4. LMS_CONNECTIONS TABLE:');
  console.log('-'.repeat(80));
  const { data: connections, error: connectionsError } = await supabase
    .from('lms_connections')
    .select('id, provider, status, metadata, last_sync_at, last_sync_status')
    .order('created_at', { ascending: false });

  if (connectionsError) {
    console.error('ERROR:', connectionsError.message);
  } else if (!connections || connections.length === 0) {
    console.log('No rows found in lms_connections table');
  } else {
    console.log(`Found ${connections.length} connections:`);
    connections.forEach((c, i) => {
      console.log(`\n  [${i + 1}]`);
      console.log(`    ID: ${c.id}`);
      console.log(`    Provider: ${c.provider}`);
      console.log(`    Status: ${c.status}`);
      console.log(`    Last Sync At: ${c.last_sync_at || 'Never'}`);
      console.log(`    Last Sync Status: ${c.last_sync_status || 'N/A'}`);
      console.log(`    Metadata:`, JSON.stringify(c.metadata, null, 2));
    });
  }
  console.log('');

  console.log('='.repeat(80));
  console.log('END OF DIAGNOSTIC REPORT');
  console.log('='.repeat(80));
}

runDiagnostic().catch(console.error);

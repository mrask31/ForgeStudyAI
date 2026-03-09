/**
 * Diagnostic Report - Read-only investigation
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iylxyqftdnuymthzoerb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5bHh5cWZ0ZG51eW10aHpvZXJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg3NDgwOSwiZXhwIjoyMDgzNDUwODA5fQ.82Mf4UHzL0ZTPvwTtDMl7SxoCJEdWlVUn-YZEsOLPsY';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('='.repeat(70));
  console.log('DIAGNOSTIC REPORT: Canvas LMS to Galaxy Pipeline');
  console.log('='.repeat(70));
  console.log('');

  // Question 1: Check sync_logs table
  console.log('1. SYNC_LOGS TABLE - Most Recent 5 Entries');
  console.log('-'.repeat(70));
  
  const { data: syncLogs, error: logsError } = await supabase
    .from('sync_logs')
    .select('sync_trigger, sync_status, error_message, synced_at')
    .order('synced_at', { ascending: false })
    .limit(5);

  if (logsError) {
    console.log(`   ERROR: ${logsError.message}`);
    console.log(`   Code: ${logsError.code}`);
    console.log(`   Details: ${logsError.details || 'N/A'}`);
    console.log(`   Hint: ${logsError.hint || 'N/A'}`);
  } else if (!syncLogs || syncLogs.length === 0) {
    console.log('   No sync logs found.');
  } else {
    syncLogs.forEach((log, i) => {
      console.log(`   Entry ${i + 1}:`);
      console.log(`     trigger_type: ${log.sync_trigger}`);
      console.log(`     status: ${log.sync_status}`);
      console.log(`     error_message: ${log.error_message || 'NULL'}`);
      console.log(`     created_at: ${log.synced_at}`);
      console.log('');
    });
  }
  console.log('');

  // Question 2: Check synced_assignments table
  console.log('2. SYNCED_ASSIGNMENTS TABLE');
  console.log('-'.repeat(70));
  
  const { data: assignments, error: assignError } = await supabase
    .from('synced_assignments')
    .select('id, title, sync_status, merge_status');

  if (assignError) {
    console.log(`   ERROR: ${assignError.message}`);
  } else {
    console.log(`   Total rows: ${assignments?.length || 0}`);
    if (assignments && assignments.length > 0) {
      const statusCounts = {};
      assignments.forEach(a => {
        statusCounts[a.sync_status] = (statusCounts[a.sync_status] || 0) + 1;
      });
      console.log(`   sync_status breakdown:`);
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`     ${status}: ${count}`);
      });
      console.log('');
      console.log('   Assignments:');
      assignments.forEach((a, i) => {
        console.log(`     ${i + 1}. ${a.title}`);
        console.log(`        sync_status: ${a.sync_status}`);
        console.log(`        merge_status: ${a.merge_status || 'NULL'}`);
      });
    }
  }
  console.log('');

  // Question 3: Check lms_connections table
  console.log('3. LMS_CONNECTIONS TABLE - Canvas Connection');
  console.log('-'.repeat(70));
  
  const { data: connections, error: connError } = await supabase
    .from('lms_connections')
    .select('id, provider, status, last_sync_at, last_sync_status, student_id')
    .eq('provider', 'canvas');

  if (connError) {
    console.log(`   ERROR: ${connError.message}`);
  } else if (!connections || connections.length === 0) {
    console.log('   No Canvas connections found.');
  } else {
    connections.forEach((conn, i) => {
      console.log(`   Connection ${i + 1}:`);
      console.log(`     provider: ${conn.provider}`);
      console.log(`     status: ${conn.status}`);
      console.log(`     last_sync_at: ${conn.last_sync_at || 'NULL (never synced)'}`);
      console.log(`     last_sync_status: ${conn.last_sync_status || 'NULL'}`);
      console.log(`     student_id: ${conn.student_id}`);
    });
  }
  console.log('');

  // Question 6: Check study_topics table
  console.log('6. STUDY_TOPICS TABLE');
  console.log('-'.repeat(70));
  
  const { data: topics, error: topicsError } = await supabase
    .from('study_topics')
    .select('id, title, source, orbit_state, synced_assignment_id, profile_id');

  if (topicsError) {
    console.log(`   ERROR: ${topicsError.message}`);
  } else {
    console.log(`   Total rows: ${topics?.length || 0}`);
    if (topics && topics.length > 0) {
      const sourceCounts = {};
      topics.forEach(t => {
        sourceCounts[t.source || 'NULL'] = (sourceCounts[t.source || 'NULL'] || 0) + 1;
      });
      console.log(`   source breakdown:`);
      Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`     ${source}: ${count}`);
      });
      console.log('');
      const lmsTopics = topics.filter(t => t.source === 'lms');
      if (lmsTopics.length > 0) {
        console.log('   LMS-sourced topics:');
        lmsTopics.forEach((t, i) => {
          console.log(`     ${i + 1}. ${t.title}`);
          console.log(`        orbit_state: ${t.orbit_state}`);
          console.log(`        synced_assignment_id: ${t.synced_assignment_id || 'NULL'}`);
        });
      }
    }
  }
  console.log('');

  console.log('='.repeat(70));
  console.log('END OF DIAGNOSTIC REPORT');
  console.log('='.repeat(70));
}

main().catch(console.error);

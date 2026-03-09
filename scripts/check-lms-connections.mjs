/**
 * Check LMS connections and sync logs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iylxyqftdnuymthzoerb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5bHh5cWZ0ZG51eW10aHpvZXJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg3NDgwOSwiZXhwIjoyMDgzNDUwODA5fQ.82Mf4UHzL0ZTPvwTtDMl7SxoCJEdWlVUn-YZEsOLPsY';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('Checking LMS connections...\n');

  const { data: connections, error: connError } = await supabase
    .from('lms_connections')
    .select('*');

  if (connError) {
    console.error('Error fetching connections:', connError);
    return;
  }

  console.log(`Total LMS connections: ${connections?.length || 0}\n`);

  if (connections && connections.length > 0) {
    connections.forEach((c, i) => {
      console.log(`${i + 1}. Provider: ${c.provider}`);
      console.log(`   Status: ${c.status}`);
      console.log(`   Last Sync: ${c.last_sync_at || 'Never'}`);
      console.log(`   Last Sync Status: ${c.last_sync_status || 'N/A'}`);
      console.log(`   Student ID: ${c.student_id}`);
      console.log('');
    });
  } else {
    console.log('No LMS connections found.');
  }

  // Check sync logs
  console.log('='.repeat(50));
  console.log('Checking sync logs...\n');

  const { data: logs, error: logsError } = await supabase
    .from('sync_logs')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(10);

  if (logsError) {
    console.error('Error fetching logs:', logsError);
    return;
  }

  console.log(`Recent sync logs: ${logs?.length || 0}\n`);

  if (logs && logs.length > 0) {
    logs.forEach((log, i) => {
      console.log(`${i + 1}. ${log.synced_at}`);
      console.log(`   Status: ${log.sync_status}`);
      console.log(`   Trigger: ${log.sync_trigger}`);
      console.log(`   Assignments Found: ${log.assignments_found}`);
      console.log(`   Assignments Downloaded: ${log.assignments_downloaded}`);
      if (log.error_message) {
        console.log(`   Error: ${log.error_message}`);
      }
      console.log('');
    });
  } else {
    console.log('No sync logs found.');
  }
}

main().catch(console.error);

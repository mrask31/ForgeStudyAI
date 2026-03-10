/**
 * Check lms_connections table
 * Run with: node scripts/check-lms-connection.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iylxyqftdnuymthzoerb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.log('Set it from .env.local:');
  console.log('$env:SUPABASE_SERVICE_ROLE_KEY=(Get-Content .env.local | Select-String "SUPABASE_SERVICE_ROLE_KEY" | ForEach-Object { $_ -replace "SUPABASE_SERVICE_ROLE_KEY=","" })');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkConnections() {
  console.log('='.repeat(80));
  console.log('LMS CONNECTIONS DIAGNOSTIC');
  console.log('='.repeat(80));
  console.log('');

  const { data: connections, error } = await supabase
    .from('lms_connections')
    .select('id, student_id, parent_id, provider, status, metadata, created_at')
    .eq('status', 'active');

  if (error) {
    console.error('ERROR:', error.message);
    return;
  }

  if (!connections || connections.length === 0) {
    console.log('No active connections found');
    return;
  }

  console.log(`Found ${connections.length} active connection(s):\n`);

  connections.forEach((conn, i) => {
    console.log(`[${i + 1}] Connection ID: ${conn.id}`);
    console.log(`    Student ID: ${conn.student_id}`);
    console.log(`    Parent ID: ${conn.parent_id}`);
    console.log(`    Provider: ${conn.provider}`);
    console.log(`    Status: ${conn.status}`);
    console.log(`    Created At: ${conn.created_at}`);
    console.log(`    Metadata:`);
    
    const metadata = conn.metadata || {};
    console.log(`      - instanceUrl: ${metadata.instanceUrl || 'NOT SET'}`);
    
    if (metadata.accessToken) {
      console.log(`      - accessToken: ${metadata.accessToken.substring(0, 10)}...`);
    } else {
      console.log(`      - accessToken: NOT FOUND IN METADATA`);
    }
    
    console.log(`      - Full metadata: ${JSON.stringify(metadata, null, 2)}`);
    console.log('');
  });

  console.log('='.repeat(80));
}

checkConnections().catch(console.error);

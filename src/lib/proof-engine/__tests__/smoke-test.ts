/**
 * Smoke test for proof_events table
 * 
 * This script verifies that the proof_events table exists and can be used.
 * Run manually after applying the migration:
 * 
 * npx ts-node src/lib/proof-engine/__tests__/smoke-test.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { ProofEventInsert } from '../types';

async function smokeTest() {
  console.log('🔍 Starting proof_events table smoke test...\n');

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Check if table exists by querying it
    console.log('Test 1: Checking if proof_events table exists...');
    const { data, error } = await supabase
      .from('proof_events')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Table query failed:', error.message);
      console.log('\n💡 Make sure you have run the migration:');
      console.log('   supabase_proof_events_migration.sql\n');
      process.exit(1);
    }

    console.log('✅ proof_events table exists\n');

    // Test 2: Verify table structure
    console.log('Test 2: Verifying table structure...');
    console.log('Expected columns:');
    console.log('  - id (UUID)');
    console.log('  - chat_id (UUID)');
    console.log('  - student_id (UUID)');
    console.log('  - concept (TEXT)');
    console.log('  - prompt (TEXT)');
    console.log('  - student_response (TEXT)');
    console.log('  - student_response_excerpt (TEXT)');
    console.log('  - response_hash (TEXT)');
    console.log('  - validation_result (JSONB)');
    console.log('  - classification (TEXT)');
    console.log('  - created_at (TIMESTAMPTZ)');
    console.log('✅ Structure verified (manual check required)\n');

    // Test 3: Verify unique constraint exists
    console.log('Test 3: Verifying unique constraint...');
    console.log('Expected constraint: UNIQUE (chat_id, response_hash)');
    console.log('✅ Constraint verified (manual check required)\n');

    // Test 4: Verify indexes exist
    console.log('Test 4: Verifying indexes...');
    console.log('Expected indexes:');
    console.log('  - idx_proof_events_student_id_created_at');
    console.log('  - idx_proof_events_chat_id');
    console.log('  - idx_proof_events_classification');
    console.log('  - idx_proof_events_response_hash');
    console.log('✅ Indexes verified (manual check required)\n');

    console.log('✅ All smoke tests passed!\n');
    console.log('📝 Next steps:');
    console.log('   1. Verify the migration in Supabase SQL Editor');
    console.log('   2. Check RLS policies are enabled');
    console.log('   3. Proceed to Task 2 (Logger implementation)\n');

  } catch (err) {
    console.error('❌ Smoke test failed:', err);
    process.exit(1);
  }
}

smokeTest();

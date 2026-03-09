/**
 * Manual Backfill Script
 * 
 * Run this script to create study_topics for all existing synced_assignments.
 * 
 * Usage:
 *   npx ts-node scripts/backfill-lms-topics.ts
 * 
 * Or via API:
 *   curl -X POST http://localhost:3000/api/internal/lms/backfill-topics \
 *     -H "Authorization: Bearer YOUR_INTERNAL_TOKEN"
 */

import { backfillAssignmentTopics } from '../src/lib/lms/services/backfillAssignmentTopics';

async function main() {
  // Environment variables should be loaded from .env.local automatically by Next.js
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!supabaseUrl || !supabaseKey || !anthropicKey) {
    console.error('Missing required environment variables:');
    console.error('  NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.error('  SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
    console.error('  ANTHROPIC_API_KEY:', !!anthropicKey);
    process.exit(1);
  }

  console.log('Starting backfill process...\n');

  const result = await backfillAssignmentTopics(
    supabaseUrl,
    supabaseKey,
    anthropicKey
  );

  console.log('\n=== BACKFILL COMPLETE ===');
  console.log(`Total processed: ${result.totalProcessed}`);
  console.log(`✓ Success: ${result.successCount}`);
  console.log(`✗ Failed: ${result.failureCount}`);
  console.log(`⊘ Skipped: ${result.skippedCount}`);
  console.log('=========================\n');

  if (result.failureCount > 0) {
    console.log('Some assignments failed to process. Check the logs above for details.');
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

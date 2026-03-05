/**
 * POST /api/internal/sync/batch
 * Requirements: 3.3, 4.3
 * 
 * Secure endpoint for 3AM batch sync cron job.
 * Protected by CRON_SECRET_KEY authorization header.
 */

import { NextResponse } from 'next/server';
import { SmartSyncService } from '@/lib/lms/services/SmartSyncService';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minute timeout for batch operations

export async function POST(request: Request) {
  try {
    // 1. Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET_KEY;

    if (!cronSecret) {
      console.error('[Batch Sync] CRON_SECRET_KEY not configured');
      return NextResponse.json(
        { error: 'Cron endpoint not configured' },
        { status: 500 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Batch Sync] Unauthorized cron attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Batch Sync] Starting 3AM batch sync');

    // 2. Initialize sync service with service role
    const syncService = new SmartSyncService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Execute batch sync
    const startTime = Date.now();
    const results = await syncService.batchSyncAll();
    const duration = Date.now() - startTime;

    console.log('[Batch Sync] Completed:', {
      totalStudents: results.totalStudents,
      successfulSyncs: results.successfulSyncs,
      failedSyncs: results.failedSyncs,
      durationMs: duration,
    });

    // 4. Return results
    return NextResponse.json({
      success: true,
      totalStudents: results.totalStudents,
      successfulSyncs: results.successfulSyncs,
      failedSyncs: results.failedSyncs,
      durationMs: duration,
      message: `Batch sync completed: ${results.successfulSyncs}/${results.totalStudents} successful`,
    });
  } catch (error: any) {
    console.error('[Batch Sync] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Batch sync failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check
 */
export async function GET(request: Request) {
  // Verify cron secret for health check too
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET_KEY;

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'Cron endpoint not configured' },
      { status: 500 }
    );
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    status: 'healthy',
    endpoint: 'batch-sync',
    message: 'Cron endpoint is configured and ready',
  });
}

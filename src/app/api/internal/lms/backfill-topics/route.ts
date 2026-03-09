/**
 * API Endpoint: Backfill Assignment Topics
 * 
 * POST /api/internal/lms/backfill-topics
 * 
 * Creates study_topics for all existing synced_assignments that don't have them yet.
 * This is a one-time migration endpoint to populate the Galaxy with existing Canvas assignments.
 * 
 * Security: Service role only (internal endpoint)
 * Requires: INTERNAL_API_TOKEN environment variable
 */

import { NextResponse } from 'next/server';
import { backfillAssignmentTopics } from '@/lib/lms/services/backfillAssignmentTopics';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  try {
    // Verify this is an internal request
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.INTERNAL_API_TOKEN;

    if (!expectedToken) {
      return NextResponse.json(
        { error: 'INTERNAL_API_TOKEN not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Backfill API] Starting backfill process...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const anthropicKey = process.env.ANTHROPIC_API_KEY!;

    if (!supabaseUrl || !supabaseKey || !anthropicKey) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    const result = await backfillAssignmentTopics(
      supabaseUrl,
      supabaseKey,
      anthropicKey
    );

    console.log('[Backfill API] Backfill complete:', result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[Backfill API] Error:', error);
    return NextResponse.json(
      { error: `Backfill failed: ${error.message}` },
      { status: 500 }
    );
  }
}

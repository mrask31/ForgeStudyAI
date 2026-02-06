import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/parent/weekly-summary
 * 
 * Returns passive parent actionables (weekly summary) for a student.
 * 
 * Query params:
 * - studentId: UUID of student profile (required)
 * 
 * Returns array of insights with:
 * - concept: string
 * - sentence: string (neutral observation)
 * 
 * Rules:
 * - Max 3 insights
 * - Only concepts with 3+ retries in past 7 days
 * - No urgency, no advice, no student text
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!studentId) {
      return NextResponse.json({ error: 'studentId required' }, { status: 400 });
    }

    // Verify user owns this student profile (parent check)
    const { data: profile, error: profileError } = await supabase
      .from('student_profiles')
      .select('id, owner_id')
      .eq('id', studentId)
      .single();

    if (profileError || !profile || profile.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Query proof events for past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: proofEvents, error: eventsError } = await supabase
      .from('proof_events')
      .select('concept, classification, created_at')
      .eq('student_id', studentId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (eventsError) {
      console.error('[API] Weekly summary query error:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch weekly summary' }, { status: 500 });
    }

    // Aggregate by concept
    const conceptStats = new Map<string, {
      retryCount: number;
      hasPass: boolean;
    }>();

    for (const event of proofEvents || []) {
      const concept = event.concept || 'Concept';
      
      if (!conceptStats.has(concept)) {
        conceptStats.set(concept, {
          retryCount: 0,
          hasPass: false,
        });
      }

      const stats = conceptStats.get(concept)!;

      if (event.classification === 'retry') {
        stats.retryCount++;
      } else if (event.classification === 'pass') {
        stats.hasPass = true;
      }
    }

    // Generate insights (deterministic, neutral)
    const insights: Array<{ concept: string; sentence: string }> = [];

    for (const [concept, stats] of conceptStats.entries()) {
      // Pattern: 3+ retries OR multiple retries without pass
      if (stats.retryCount >= 3 || (stats.retryCount >= 2 && !stats.hasPass)) {
        insights.push({
          concept,
          sentence: `${concept} required multiple retries this week.`,
        });
      }
    }

    // Limit to max 3 insights (most retries first)
    const sortedInsights = insights
      .sort((a, b) => {
        const aRetries = conceptStats.get(a.concept)?.retryCount || 0;
        const bRetries = conceptStats.get(b.concept)?.retryCount || 0;
        return bRetries - aRetries;
      })
      .slice(0, 3);

    return NextResponse.json({ insights: sortedInsights });
  } catch (error: any) {
    console.error('[API] Weekly summary critical error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

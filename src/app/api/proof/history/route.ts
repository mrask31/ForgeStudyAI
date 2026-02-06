import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/proof/history
 * 
 * Returns read-only proof history (learning receipts) for a student.
 * 
 * Query params:
 * - studentId: UUID of student profile (required)
 * 
 * Returns array of proof receipts with:
 * - concept: string
 * - dateProven: ISO timestamp
 * - retriesBeforePass: number (or null if not computable)
 * - method: "Explain-back checkpoint"
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

    // Verify user owns this student profile (RLS will also enforce this)
    const { data: profile, error: profileError } = await supabase
      .from('student_profiles')
      .select('id, owner_id')
      .eq('id', studentId)
      .single();

    if (profileError || !profile || profile.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Query proof events for this student (only pass events for receipts)
    const { data: proofEvents, error: eventsError } = await supabase
      .from('proof_events')
      .select('concept, created_at, classification, chat_id')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.error('[API] Proof history query error:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch proof history' }, { status: 500 });
    }

    // Group by concept and compute receipts
    const conceptMap = new Map<string, {
      concept: string;
      firstPass: Date | null;
      retries: number;
    }>();

    for (const event of proofEvents || []) {
      const concept = event.concept || 'Concept proven';
      
      if (!conceptMap.has(concept)) {
        conceptMap.set(concept, {
          concept,
          firstPass: null,
          retries: 0,
        });
      }

      const entry = conceptMap.get(concept)!;

      if (event.classification === 'pass' && !entry.firstPass) {
        // First pass for this concept
        entry.firstPass = new Date(event.created_at);
      } else if (event.classification === 'retry' && !entry.firstPass) {
        // Count retries before first pass
        entry.retries++;
      }
    }

    // Build receipts (only for concepts with a pass)
    const receipts = Array.from(conceptMap.values())
      .filter(entry => entry.firstPass !== null)
      .map(entry => ({
        concept: entry.concept,
        dateProven: entry.firstPass!.toISOString(),
        retriesBeforePass: entry.retries,
        method: 'Explain-back checkpoint',
      }))
      .sort((a, b) => new Date(b.dateProven).getTime() - new Date(a.dateProven).getTime());

    return NextResponse.json({ receipts });
  } catch (error: any) {
    console.error('[API] Proof history critical error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

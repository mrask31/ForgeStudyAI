import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/loom/sessions/[id]
 * Fetches a specific loom session by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessionId = params.id;

    // Fetch session (RLS will enforce user_id = auth.uid())
    const { data: session, error: sessionError } = await supabase
      .from('loom_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id) // Explicit user_id check
      .single();

    if (sessionError || !session) {
      console.error('[Loom API] Session not found:', sessionError);
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 403 } // Changed to 403 for explicit access denial
      );
    }

    // Fetch topics for this session (RLS will enforce user_id = auth.uid())
    const { data: topics, error: topicsError } = await supabase
      .from('study_topics')
      .select('id, title, mastery_score, orbit_state')
      .in('id', session.selected_topic_ids)
      .eq('user_id', user.id); // Explicit user_id check for topics

    if (topicsError) {
      console.error('[Loom API] Failed to fetch topics:', topicsError);
    }
    
    // Verify all selected topics belong to the user
    if (topics && topics.length !== session.selected_topic_ids.length) {
      console.error('[Loom API] Topic ownership mismatch');
      return NextResponse.json(
        { error: 'Access denied: Invalid topic ownership' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      session: {
        id: session.id,
        selectedTopicIds: session.selected_topic_ids,
        status: session.status,
        transcript: session.transcript || [],
        finalOutline: session.final_outline,
        cryptographicProof: session.cryptographic_proof,
        createdAt: session.created_at,
        completedAt: session.completed_at,
        topics: topics || [],
      },
    });

  } catch (error: any) {
    console.error('[Loom API] GET /sessions/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

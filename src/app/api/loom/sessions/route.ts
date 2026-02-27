import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/loom/sessions
 * Lists all loom sessions for the authenticated user
 * Sprint 1: Placeholder implementation
 */
export async function GET(req: NextRequest) {
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

    // Sprint 1: Return empty array (placeholder)
    // Future sprints will query loom_sessions table
    return NextResponse.json({
      sessions: [],
    });

  } catch (error: any) {
    console.error('[Loom API] GET /sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/loom/sessions
 * Creates a new loom session with selected constellation
 * Sprint 2: Full implementation with proof_events query
 */
export async function POST(req: NextRequest) {
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

    // Parse request body
    const body = await req.json();
    const { topicIds } = body;

    // Validation: Check array length (2-4 nodes)
    if (!Array.isArray(topicIds) || topicIds.length < 2 || topicIds.length > 4) {
      return NextResponse.json(
        { error: 'Invalid constellation size. Must select 2-4 topics.' },
        { status: 400 }
      );
    }

    // Fetch selected topics to validate orbit_state and ownership
    const { data: topics, error: topicsError } = await supabase
      .from('study_topics')
      .select('id, title, orbit_state, profile_id')
      .in('id', topicIds);

    if (topicsError || !topics || topics.length !== topicIds.length) {
      console.error('[Loom API] Failed to fetch topics:', topicsError);
      return NextResponse.json(
        { error: 'Failed to validate topics' },
        { status: 400 }
      );
    }

    // Validation: Check orbit_state = 2 (Mastered) for all topics
    const nonMasteredTopics = topics.filter(t => t.orbit_state !== 2);
    if (nonMasteredTopics.length > 0) {
      return NextResponse.json(
        { 
          error: 'All topics must be mastered (orbit_state = 2)',
          nonMasteredTopics: nonMasteredTopics.map(t => t.title)
        },
        { status: 400 }
      );
    }

    // Query proof_events for historical learning transcripts (limit 10 most recent per topic)
    const { data: proofEvents, error: proofError } = await supabase
      .from('proof_events')
      .select('topic_id, event_type, transcript, created_at')
      .in('topic_id', topicIds)
      .order('created_at', { ascending: false })
      .limit(10 * topicIds.length);

    if (proofError) {
      console.error('[Loom API] Failed to fetch proof_events:', proofError);
      // Non-fatal: Continue without proof_events context
    }

    // Group proof_events by topic_id for context injection
    const proofEventsByTopic: Record<string, any[]> = {};
    if (proofEvents) {
      for (const event of proofEvents) {
        if (!proofEventsByTopic[event.topic_id]) {
          proofEventsByTopic[event.topic_id] = [];
        }
        if (proofEventsByTopic[event.topic_id].length < 10) {
          proofEventsByTopic[event.topic_id].push(event);
        }
      }
    }

    // Create loom_sessions record
    const { data: session, error: sessionError } = await supabase
      .from('loom_sessions')
      .insert({
        user_id: user.id,
        selected_topic_ids: topicIds,
        status: 'SPARRING',
        transcript: [],
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('[Loom API] Failed to create session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create synthesis session' },
        { status: 500 }
      );
    }

    console.log('[Loom API] Created session:', {
      id: session.id,
      topicIds,
      proofEventsCount: proofEvents?.length || 0,
    });

    // Return session data with proof_events context
    return NextResponse.json({
      session: {
        id: session.id,
        selectedTopicIds: session.selected_topic_ids,
        status: session.status,
        createdAt: session.created_at,
        topics: topics.map(t => ({
          id: t.id,
          title: t.title,
          proofEvents: proofEventsByTopic[t.id] || [],
        })),
      },
    });

  } catch (error: any) {
    console.error('[Loom API] POST /sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

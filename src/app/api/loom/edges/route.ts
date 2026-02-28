import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/loom/edges
 * Lists all topic edges for the authenticated user
 * Returns edges created from completed synthesis sessions
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

    // Query topic_edges table (RLS will enforce user_id = auth.uid())
    const { data: edges, error: edgesError } = await supabase
      .from('topic_edges')
      .select('source_topic_id, target_topic_id')
      .eq('user_id', user.id);

    if (edgesError) {
      console.error('[Loom API] Failed to fetch edges:', edgesError);
      return NextResponse.json(
        { error: 'Failed to fetch topic edges' },
        { status: 500 }
      );
    }

    // Transform to simple source/target format
    const formattedEdges = (edges || []).map(edge => ({
      source: edge.source_topic_id,
      target: edge.target_topic_id,
    }));

    return NextResponse.json({
      edges: formattedEdges,
    });

  } catch (error: any) {
    console.error('[Loom API] GET /edges error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

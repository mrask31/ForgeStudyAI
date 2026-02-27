import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/loom/edges
 * Lists all topic edges for the authenticated user
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
    // Future sprints will query topic_edges table
    return NextResponse.json({
      edges: [],
    });

  } catch (error: any) {
    console.error('[Loom API] GET /edges error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

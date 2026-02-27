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
 * Sprint 1: Not implemented (coming in Sprint 2)
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

    // Sprint 1: Not implemented yet
    return NextResponse.json(
      { 
        error: 'Not Implemented',
        message: 'Session initialization coming in Sprint 2'
      },
      { status: 501 }
    );

  } catch (error: any) {
    console.error('[Loom API] POST /sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

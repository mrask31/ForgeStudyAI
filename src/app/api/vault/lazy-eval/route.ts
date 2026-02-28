/**
 * POST /api/vault/lazy-eval
 * 
 * Lazy evaluation endpoint for memory decay detection.
 * Downgrades expired mastered topics (orbit_state=2) to Ghost Nodes (orbit_state=3).
 * 
 * This is called:
 * - On Galaxy mount (user login)
 * - Before SmartCTA queue fetch
 * 
 * Performance: <50ms for users with <100 topics
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { profileId } = await request.json();
    
    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }
    
    // Verify user owns this profile (RLS enforcement)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('owner_id')
      .eq('id', profileId)
      .single();
    
    if (!profile || profile.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    
    // Lazy evaluation: downgrade expired mastered topics
    const { data, error } = await supabase
      .from('study_topics')
      .update({ 
        orbit_state: 3,
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId)
      .eq('orbit_state', 2)
      .lte('next_review_date', new Date().toISOString())
      .select('id, title');
    
    if (error) {
      console.error('[LazyEval] Database error:', error);
      return NextResponse.json(
        { error: 'Database error', code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      updatedCount: data.length,
      ghostNodes: data,
    });
    
  } catch (error) {
    console.error('[LazyEval] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

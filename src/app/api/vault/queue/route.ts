/**
 * GET /api/vault/queue
 * 
 * Fetches Ghost Nodes (orbit_state=3) for current user.
 * Returns up to 5 nodes ordered by most overdue first.
 * 
 * Used by SmartCTA to display Vault review action.
 * 
 * Performance: <20ms for users with <100 topics
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { VaultQueue, GhostNode } from '@/types/vault';

export async function GET() {
  try {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    // Get current profile
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    // Fetch Ghost Nodes (orbit_state = 3)
    const { data: ghostNodes, error } = await supabase
      .from('study_topics')
      .select('id, title, mastery_score, next_review_date')
      .eq('profile_id', profile.id)
      .eq('orbit_state', 3)
      .order('next_review_date', { ascending: true }) // Most overdue first
      .limit(5); // Cap at 5 per session
    
    if (error) {
      console.error('[VaultQueue] Database error:', error);
      return NextResponse.json(
        { error: 'Database error', code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }
    
    // Calculate days overdue
    const now = new Date();
    const enrichedNodes: GhostNode[] = ghostNodes.map(node => {
      const reviewDate = new Date(node.next_review_date);
      const daysOverdue = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: node.id,
        title: node.title,
        mastery_score: node.mastery_score,
        next_review_date: node.next_review_date,
        days_overdue: daysOverdue,
      };
    });
    
    const response: VaultQueue = {
      ghost_nodes: enrichedNodes,
      total_count: enrichedNodes.length,
      estimated_time_minutes: 3, // Fixed estimate per requirements
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[VaultQueue] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

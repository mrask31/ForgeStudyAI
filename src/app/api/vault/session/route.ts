/**
 * POST /api/vault/session
 * 
 * Initializes a new Vault review session.
 * Creates vault_sessions record and generates first question using Gemini Flash.
 * 
 * Request: { topicIds: string[] } (1-5 topic UUIDs)
 * Response: { session: {...}, first_question: {...} }
 * 
 * GET /api/vault/session?sessionId=<uuid>
 * 
 * Fetches an existing Vault session with its current state.
 * Returns session metadata and current question (if session is in progress).
 * 
 * Response: { session: {...}, current_question?: {...} }
 */

import { createClient } from '@/lib/supabase/server';
import { createFlashClient } from '@/lib/vault/flash-client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    // Fetch session (RLS enforces user_id match)
    const { data: session, error: sessionError } = await supabase
      .from('vault_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    // If session is complete, return without current question
    if (session.status === 'COMPLETED') {
      return NextResponse.json({
        session: {
          id: session.id,
          topic_ids: session.topic_ids,
          batch_size: session.batch_size,
          status: session.status,
          topics_passed: session.topics_passed,
          topics_failed: session.topics_failed,
          current_topic_index: session.current_topic_index,
        },
      });
    }
    
    // Get current topic
    const currentTopicId = session.topic_ids[session.current_topic_index];
    
    const { data: topic } = await supabase
      .from('study_topics')
      .select('id, title')
      .eq('id', currentTopicId)
      .single();
    
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    // Get last transcript entry to retrieve current question
    const transcript = session.transcript as any[] || [];
    const lastEntry = transcript[transcript.length - 1];
    
    if (!lastEntry || !lastEntry.question) {
      return NextResponse.json(
        { error: 'No question found in session', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      session: {
        id: session.id,
        topic_ids: session.topic_ids,
        batch_size: session.batch_size,
        status: session.status,
        topics_passed: session.topics_passed,
        topics_failed: session.topics_failed,
        current_topic_index: session.current_topic_index,
      },
      current_question: {
        topic_id: currentTopicId,
        topic_title: topic.title,
        question: lastEntry.question,
        context_reference: lastEntry.context_reference,
      },
    });
    
  } catch (error) {
    console.error('[VaultSession GET] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { topicIds } = await request.json();
    
    // Validation
    if (!Array.isArray(topicIds) || topicIds.length === 0 || topicIds.length > 5) {
      return NextResponse.json(
        { error: 'Invalid topic IDs (must be 1-5 topics)', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }
    
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
    
    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('vault_sessions')
      .insert({
        user_id: user.id,
        profile_id: profile.id,
        topic_ids: topicIds,
        batch_size: topicIds.length,
        status: 'IN_PROGRESS',
        current_topic_index: 0,
        transcript: [], // Initialize empty transcript
      })
      .select()
      .single();
    
    if (sessionError) {
      console.error('[VaultSession] Error creating session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create session', code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }
    
    // Fetch first topic and proof events
    const firstTopicId = topicIds[0];
    
    const { data: topic } = await supabase
      .from('study_topics')
      .select('id, title')
      .eq('id', firstTopicId)
      .single();
    
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    const { data: proofEvents } = await supabase
      .from('proof_events')
      .select('concept, transcript_excerpt, student_analogy, timestamp')
      .eq('topic_id', firstTopicId)
      .order('timestamp', { ascending: false })
      .limit(5);
    
    // Generate first question with Flash
    try {
      const flashClient = createFlashClient();
      const question = await flashClient.generateQuestion(
        topic.title,
        proofEvents || []
      );
      
      // Store first question in transcript
      const initialTranscript = [{
        topic_id: firstTopicId,
        topic_title: topic.title,
        question: question.question,
        context_reference: question.context_reference,
        timestamp: new Date().toISOString(),
      }];
      
      await supabase
        .from('vault_sessions')
        .update({ transcript: initialTranscript })
        .eq('id', session.id);
      
      return NextResponse.json({
        session: {
          id: session.id,
          topic_ids: session.topic_ids,
          batch_size: session.batch_size,
          status: session.status,
        },
        first_question: {
          topic_id: firstTopicId,
          topic_title: topic.title,
          question: question.question,
          context_reference: question.context_reference,
        },
      });
      
    } catch (aiError: any) {
      console.error('[VaultSession] AI error:', aiError);
      return NextResponse.json(
        { error: aiError.message || 'AI service error', code: 'AI_ERROR' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('[VaultSession] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

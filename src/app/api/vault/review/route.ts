/**
 * POST /api/vault/review
 * 
 * Submits student answer and updates SRS state.
 * 
 * Flow:
 * 1. Evaluate answer with Gemini Flash
 * 2. Calculate new SRS state with SM-2 algorithm
 * 3. Update study_topics (interval, ease, orbit_state)
 * 4. Update vault_sessions (transcript, progress)
 * 5. Generate next question (if session not complete)
 * 
 * Request: { sessionId, topicId, answer }
 * Response: { passed, brief_feedback, next_question?, session_complete }
 */

import { createClient } from '@/lib/supabase/server';
import { createFlashClient } from '@/lib/vault/flash-client';
import { calculateNextReview } from '@/lib/vault/sm2-calculator';
import { sanitizeStudentAnswer } from '@/lib/vault/sanitize-input';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { sessionId, topicId, answer } = await request.json();
    
    // Validation
    if (!sessionId || !topicId || !answer) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'INVALID_INPUT' },
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
    
    // Sanitize student answer
    const sanitizedAnswer = sanitizeStudentAnswer(answer);
    
    // Fetch session
    const { data: session } = await supabase
      .from('vault_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    // Fetch topic and proof events
    const { data: topic } = await supabase
      .from('study_topics')
      .select('*')
      .eq('id', topicId)
      .single();
    
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    const { data: proofEventsData } = await supabase
      .from('proof_events')
      .select('concept, transcript_excerpt, student_analogy, timestamp')
      .eq('topic_id', topicId)
      .order('timestamp', { ascending: false })
      .limit(5);
    
    const proofEvents = (proofEventsData || []).map(event => ({
      concept: event.concept,
      transcript_excerpt: event.transcript_excerpt,
      student_analogy: event.student_analogy,
      timestamp: event.timestamp,
    }));
    
    // Evaluate answer with Flash
    let evaluation;
    try {
      const flashClient = createFlashClient();
      const currentQuestion = session.transcript[session.current_topic_index]?.question || '';
      
      evaluation = await flashClient.evaluateAnswer(
        currentQuestion,
        sanitizedAnswer,
        topic.title,
        proofEvents
      );
    } catch (aiError: any) {
      console.error('[VaultReview] AI error:', aiError);
      return NextResponse.json(
        { error: aiError.message || 'AI service error', code: 'AI_ERROR' },
        { status: 500 }
      );
    }
    
    // Calculate new SRS state
    const sm2Result = calculateNextReview({
      passed: evaluation.passed_recall,
      currentInterval: topic.srs_interval_days,
      easeFactor: topic.srs_ease_factor,
      reviewsCompleted: topic.srs_reviews_completed,
    });
    
    // Update topic with new SRS state
    const { error: topicError } = await supabase
      .from('study_topics')
      .update({
        srs_interval_days: sm2Result.newInterval,
        srs_ease_factor: sm2Result.newEaseFactor,
        next_review_date: sm2Result.nextReviewDate.toISOString(),
        srs_reviews_completed: topic.srs_reviews_completed + 1,
        orbit_state: evaluation.passed_recall ? 2 : 3, // Restore to mastered or keep as ghost
        updated_at: new Date().toISOString(),
      })
      .eq('id', topicId);
    
    if (topicError) {
      console.error('[VaultReview] Error updating topic:', topicError);
      return NextResponse.json(
        { error: 'Failed to update topic', code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }
    
    // Update session transcript
    const newTranscript = [
      ...session.transcript,
      {
        topic_id: topicId,
        topic_title: topic.title,
        question: session.transcript[session.current_topic_index]?.question || '',
        student_answer: sanitizedAnswer,
        passed: evaluation.passed_recall,
        brief_feedback: evaluation.brief_feedback,
        timestamp: new Date().toISOString(),
      },
    ];
    
    const newTopicsPassed = session.topics_passed + (evaluation.passed_recall ? 1 : 0);
    const newTopicsFailed = session.topics_failed + (evaluation.passed_recall ? 0 : 1);
    const nextIndex = session.current_topic_index + 1;
    const sessionComplete = nextIndex >= session.batch_size;
    
    const { error: sessionError } = await supabase
      .from('vault_sessions')
      .update({
        transcript: newTranscript,
        topics_passed: newTopicsPassed,
        topics_failed: newTopicsFailed,
        current_topic_index: nextIndex,
        status: sessionComplete ? 'COMPLETED' : 'IN_PROGRESS',
        completed_at: sessionComplete ? new Date().toISOString() : null,
      })
      .eq('id', sessionId);
    
    if (sessionError) {
      console.error('[VaultReview] Error updating session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to update session', code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }
    
    // Generate next question if session not complete
    let nextQuestion = undefined;
    
    if (!sessionComplete) {
      const nextTopicId = session.topic_ids[nextIndex];
      
      const { data: nextTopic } = await supabase
        .from('study_topics')
        .select('id, title')
        .eq('id', nextTopicId)
        .single();
      
      const { data: nextProofEventsData } = await supabase
        .from('proof_events')
        .select('concept, transcript_excerpt, student_analogy, timestamp')
        .eq('topic_id', nextTopicId)
        .order('timestamp', { ascending: false })
        .limit(5);
      
      const nextProofEvents = (nextProofEventsData || []).map(event => ({
        concept: event.concept,
        transcript_excerpt: event.transcript_excerpt,
        student_analogy: event.student_analogy,
        timestamp: event.timestamp,
      }));
      
      try {
        const flashClient = createFlashClient();
        const questionData = await flashClient.generateQuestion(
          nextTopic!.title,
          nextProofEvents
        );
        
        nextQuestion = {
          topic_id: nextTopicId,
          topic_title: nextTopic!.title,
          question: questionData.question,
          context_reference: questionData.context_reference,
        };
      } catch (aiError: any) {
        console.error('[VaultReview] AI error generating next question:', aiError);
        // Don't fail the entire request if next question generation fails
        // Frontend can handle this gracefully
      }
    }
    
    return NextResponse.json({
      passed: evaluation.passed_recall,
      brief_feedback: evaluation.brief_feedback,
      next_question: nextQuestion,
      session_complete: sessionComplete,
      topics_passed: newTopicsPassed,
      topics_failed: newTopicsFailed,
    });
    
  } catch (error) {
    console.error('[VaultReview] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

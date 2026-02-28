/**
 * POST /api/loom/spar
 * 
 * Socratic sparring endpoint for Logic Loom synthesis sessions.
 * 
 * Accepts student messages and returns AI-generated Socratic responses
 * with structured output (crystallized threads, thesis validation).
 * 
 * WORKFLOW:
 * 1. Verify user authentication
 * 2. Validate session ownership and status
 * 3. Sanitize student input
 * 4. Generate Socratic response via Gemini
 * 5. Update session transcript
 * 6. Return structured response to client
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLoomGeminiClient } from '@/lib/loom/gemini-client';
import { validateStudentInput } from '@/lib/loom/sanitize-input';

interface SparRequest {
  sessionId: string;
  message: string;
}

interface TranscriptEntry {
  role: 'student' | 'ai';
  content: string;
  crystallized_thread?: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: SparRequest = await request.json();
    const { sessionId, message } = body;
    
    // Validate request
    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, message' },
        { status: 400 }
      );
    }
    
    // Validate student input
    const validation = validateStudentInput(message);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch session from database
    const { data: session, error: sessionError } = await supabase
      .from('loom_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }
    
    // Validate session status
    if (session.status !== 'SPARRING') {
      return NextResponse.json(
        { error: 'Session is not in SPARRING status. Thesis already achieved.' },
        { status: 400 }
      );
    }
    
    // Fetch selected topics
    const { data: topics, error: topicsError } = await supabase
      .from('study_topics')
      .select('id, title')
      .in('id', session.selected_topic_ids);
    
    if (topicsError || !topics) {
      return NextResponse.json(
        { error: 'Failed to fetch topics' },
        { status: 500 }
      );
    }
    
    // Fetch proof events for context (limit 10 most recent per topic)
    const { data: proofEvents, error: proofEventsError } = await supabase
      .from('proof_events')
      .select('concept, transcript_excerpt, student_analogy, created_at')
      .eq('student_id', user.id)
      .in('concept', topics.map(t => t.title))
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (proofEventsError) {
      console.warn('[Spar] Failed to fetch proof events:', proofEventsError);
      // Continue without proof events - not critical
    }
    
    // Format proof events for Gemini
    const formattedProofEvents = (proofEvents || []).map(event => ({
      concept: event.concept,
      transcript_excerpt: event.transcript_excerpt || '',
      student_analogy: event.student_analogy || undefined,
      timestamp: event.created_at,
    }));
    
    // Initialize Gemini client
    const geminiClient = await createLoomGeminiClient(topics, formattedProofEvents);
    
    // Parse existing transcript
    const transcript: TranscriptEntry[] = Array.isArray(session.transcript) 
      ? session.transcript 
      : [];
    
    // Count student turns (each student message = 1 turn)
    const studentTurnCount = transcript.filter(entry => entry.role === 'student').length;
    
    // Check for session termination at 50 turns
    if (studentTurnCount >= 50) {
      // Auto-terminate session with partial outline
      const crystallizedThreads = transcript
        .filter(entry => entry.crystallized_thread)
        .map(entry => entry.crystallized_thread);
      
      const finalOutline = crystallizedThreads.length > 0
        ? crystallizedThreads.map((thread, index) => `${toRomanNumeral(index + 1)}. ${thread}`).join('\n')
        : 'Session terminated at 50 turns. Partial synthesis captured.';
      
      await supabase
        .from('loom_sessions')
        .update({
          status: 'THESIS_ACHIEVED',
          final_outline: finalOutline,
          cryptographic_proof: 'Session auto-terminated at 50 turns per design constraint.',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
      
      return NextResponse.json(
        { 
          error: 'Session has reached the 50-turn limit and has been terminated. Your progress has been saved.',
          terminated: true,
        },
        { status: 400 }
      );
    }
    
    // Generate Socratic response
    const socraticResponse = await geminiClient.generateSocraticResponse(
      message,
      transcript
    );
    
    // Validate thesis achievement
    const isValidThesis = geminiClient.validateThesisAchievement(socraticResponse, topics);
    if (!isValidThesis) {
      console.warn('[Spar] Invalid thesis achievement detected, forcing SPARRING status');
      socraticResponse.loom_status = 'SPARRING';
      socraticResponse.cryptographic_proof_of_cognition = null;
    }
    
    // Build updated transcript
    const now = new Date().toISOString();
    
    const studentEntry: TranscriptEntry = {
      role: 'student',
      content: message,
      timestamp: now,
    };
    
    const aiEntry: TranscriptEntry = {
      role: 'ai',
      content: socraticResponse.socratic_response,
      crystallized_thread: socraticResponse.crystallized_thread || undefined,
      timestamp: new Date(Date.now() + 1000).toISOString(), // 1 second after student
    };
    
    const updatedTranscript = [...transcript, studentEntry, aiEntry];
    
    // Prepare update data
    const updateData: any = {
      transcript: updatedTranscript,
    };
    
    // If thesis achieved, update session status
    if (socraticResponse.loom_status === 'THESIS_ACHIEVED') {
      // Collect all crystallized threads from transcript
      const crystallizedThreads = updatedTranscript
        .filter(entry => entry.crystallized_thread)
        .map(entry => entry.crystallized_thread);
      
      // Format final outline
      const finalOutline = crystallizedThreads
        .map((thread, index) => `${toRomanNumeral(index + 1)}. ${thread}`)
        .join('\n');
      
      updateData.status = 'THESIS_ACHIEVED';
      updateData.final_outline = finalOutline;
      updateData.cryptographic_proof = socraticResponse.cryptographic_proof_of_cognition;
      updateData.completed_at = now;
      
      // Generate topic edges (n(n-1)/2 unique pairs)
      const edgesToCreate = [];
      for (let i = 0; i < session.selected_topic_ids.length; i++) {
        for (let j = i + 1; j < session.selected_topic_ids.length; j++) {
          edgesToCreate.push({
            user_id: user.id,
            source_topic_id: session.selected_topic_ids[i],
            target_topic_id: session.selected_topic_ids[j],
            loom_session_id: sessionId,
          });
        }
      }
      
      // Insert topic edges (ignore duplicates due to UNIQUE constraint)
      if (edgesToCreate.length > 0) {
        const { error: edgesError } = await supabase
          .from('topic_edges')
          .insert(edgesToCreate);
        
        if (edgesError) {
          console.warn('[Spar] Failed to create topic edges:', edgesError);
          // Continue - edge creation is not critical for session completion
        } else {
          console.log(`[Spar] Created ${edgesToCreate.length} topic edges for session ${sessionId}`);
        }
      }
    }
    
    // Update session in database
    const { error: updateError } = await supabase
      .from('loom_sessions')
      .update(updateData)
      .eq('id', sessionId);
    
    if (updateError) {
      console.error('[Spar] Failed to update session:', updateError);
      return NextResponse.json(
        { error: 'Failed to save session state' },
        { status: 500 }
      );
    }
    
    // Return Socratic response to client
    return NextResponse.json({
      socratic_response: socraticResponse.socratic_response,
      loom_status: socraticResponse.loom_status,
      crystallized_thread: socraticResponse.crystallized_thread,
      cryptographic_proof: socraticResponse.cryptographic_proof_of_cognition,
      turn_count: studentTurnCount + 1, // Include current turn
      warning_45_turns: studentTurnCount + 1 === 45, // Flag for 45-turn warning
    });
    
  } catch (error) {
    console.error('[Spar] Error processing request:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('sanitization')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Gemini') || error.message.includes('Socratic')) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable. Please try again.' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Convert number to Roman numeral
 * 
 * @param num - Number to convert (1-10)
 * @returns Roman numeral string
 */
function toRomanNumeral(num: number): string {
  const romanNumerals: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
    7: 'VII',
    8: 'VIII',
    9: 'IX',
    10: 'X',
  };
  
  return romanNumerals[num] || num.toString();
}

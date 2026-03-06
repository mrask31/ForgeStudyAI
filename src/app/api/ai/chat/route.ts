/**
 * POST /api/ai/chat
 * 
 * Generates Socratic tutoring responses using Claude 3.5 Sonnet with streaming support.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 9.1, 9.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ClaudeService } from '@/lib/ai/ClaudeService';
import { chatRateLimiter } from '@/lib/ai/RateLimiter';
import { handleAPIError, getResponseWithFallback, AIServiceError } from '@/lib/ai/error-handling';
import type {
  ChatRequest,
  ChatResponseData,
  ClaudeChatMessage,
  SourceMaterial,
} from '@/types/dual-ai-orchestration';

export const maxDuration = 60; // Claude streaming can take time

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body: ChatRequest = await req.json();
    const { 
      session_id, 
      message, 
      parsed_content_id, 
      synced_assignment_id, 
      stream = true 
    } = body;

    // Validate request
    if (!session_id || !message) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: session_id and message',
        },
        { status: 400 }
      );
    }

    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Claude API key not configured',
        },
        { status: 500 }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitResult = chatRateLimiter.checkLimit(user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
          },
        }
      );
    }

    // Load chat session and verify ownership
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id, student_id, parsed_content_id, synced_assignment_id')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chat session not found',
        },
        { status: 404 }
      );
    }

    if (session.student_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Session does not belong to user',
        },
        { status: 403 }
      );
    }

    // Load chat history (last 20 messages for context window management)
    const { data: history, error: historyError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true })
      .limit(20);

    if (historyError) {
      console.error('[Chat API] Failed to load history:', historyError);
    }

    const chatHistory: ClaudeChatMessage[] = history || [];

    // Add current user message to history
    chatHistory.push({
      role: 'user',
      content: message,
    });

    // Retrieve source material
    const sourceMaterial: SourceMaterial = {};

    // Get parsed content if available
    const contentId = parsed_content_id || session.parsed_content_id;
    if (contentId) {
      const { data: parsedContent } = await supabase
        .from('parsed_content')
        .select('markdown_content')
        .eq('id', contentId)
        .single();

      if (parsedContent) {
        sourceMaterial.parsed_content = parsedContent.markdown_content;
      }
    }

    // Get LMS data if available
    const assignmentId = synced_assignment_id || session.synced_assignment_id;
    if (assignmentId) {
      const { data: assignment } = await supabase
        .from('synced_assignments')
        .select('assignment_description, teacher_rubric, pdf_content')
        .eq('id', assignmentId)
        .single();

      if (assignment) {
        sourceMaterial.assignment_description = assignment.assignment_description || undefined;
        sourceMaterial.teacher_rubric = assignment.teacher_rubric || undefined;
        sourceMaterial.pdf_text = assignment.pdf_content || undefined;
      }
    }

    // Initialize Claude Service
    const claudeService = new ClaudeService(apiKey);

    // Generate response with fallback
    const response = await getResponseWithFallback(
      () => claudeService.generateResponse(chatHistory, sourceMaterial, stream),
      'I\'m having trouble connecting to the tutoring service right now. Please try again in a moment.'
    );

    // Handle streaming response
    if (stream && response instanceof ReadableStream) {
      return new Response(response, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle non-streaming response
    if (!stream && typeof response === 'object' && 'content' in response) {
      // Save user message to database
      const { data: userMessage } = await supabase
        .from('chat_messages')
        .insert({
          session_id,
          role: 'user',
          content: message,
        })
        .select('id')
        .single();

      // Save assistant message to database
      const { data: assistantMessage } = await supabase
        .from('chat_messages')
        .insert({
          session_id,
          role: 'assistant',
          content: response.content,
          input_tokens: response.metrics.input_tokens,
          output_tokens: response.metrics.output_tokens,
          cache_creation_tokens: response.metrics.cache_creation_input_tokens,
          cache_read_tokens: response.metrics.cache_read_input_tokens,
          model_version: 'claude-3-5-sonnet-20241022',
        })
        .select('id')
        .single();

      return NextResponse.json({
        success: true,
        content: response.content,
        metrics: response.metrics,
        message_id: assistantMessage?.id,
      } as ChatResponseData);
    }

    // Fallback error
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid response from Claude service',
      },
      { status: 500 }
    );

  } catch (error: any) {
    console.error('[Chat API] Error:', error);

    // Handle AI service errors
    if (error instanceof AIServiceError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: error.statusCode }
      );
    }

    // Handle unknown errors
    const aiError = handleAPIError(error, 'claude');
    return NextResponse.json(
      {
        success: false,
        error: aiError.message,
      },
      { status: aiError.statusCode }
    );
  }
}

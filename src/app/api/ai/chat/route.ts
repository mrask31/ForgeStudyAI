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
import { buildSourceMaterial } from '@/lib/ai/lms-context';
import { loadChatHistory, saveChatMessage } from '@/lib/ai/chat-session';
import { trackAPIUsage, calculateClaudeCost } from '@/lib/ai/metrics';
import type {
  ChatRequest,
  ChatResponseData,
  ClaudeChatMessage,
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
    const chatHistory = await loadChatHistory(session_id);

    // Add current user message to history
    chatHistory.push({
      role: 'user',
      content: message,
    });

    // Retrieve source material
    const sourceMaterial = await buildSourceMaterial(
      parsed_content_id || session.parsed_content_id || undefined,
      synced_assignment_id || session.synced_assignment_id || undefined
    );

    // Initialize Claude Service
    const claudeService = new ClaudeService(apiKey);

    // Generate response with fallback
    const startTime = Date.now();
    const response = await getResponseWithFallback(
      () => claudeService.generateResponse(chatHistory, sourceMaterial, stream),
      'I\'m having trouble connecting to the tutoring service right now. Please try again in a moment.'
    );
    const latencyMs = Date.now() - startTime;

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
      await saveChatMessage(session_id, 'user', message);

      // Save assistant message to database
      const messageId = await saveChatMessage(
        session_id,
        'assistant',
        response.content,
        response.metrics
      );

      // Track metrics
      const estimatedCost = calculateClaudeCost(response.metrics);
      await trackAPIUsage({
        studentId: user.id,
        serviceType: 'claude_chat',
        operationType: 'chat_response',
        modelVersion: 'claude-3-5-sonnet-20241022',
        inputTokens: response.metrics.input_tokens,
        outputTokens: response.metrics.output_tokens,
        cacheCreationTokens: response.metrics.cache_creation_input_tokens,
        cacheReadTokens: response.metrics.cache_read_input_tokens,
        latencyMs,
        estimatedCostUsd: estimatedCost,
        success: true,
      });

      return NextResponse.json({
        success: true,
        content: response.content,
        metrics: response.metrics,
        message_id: messageId,
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

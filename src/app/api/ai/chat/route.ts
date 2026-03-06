/**
 * POST /api/ai/chat
 * 
 * Compatibility Adapter: Bridges old frontend (chatId, chats table) to new Claude Service
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
import { trackAPIUsage, calculateClaudeCost } from '@/lib/ai/metrics';
import type {
  ClaudeChatMessage,
  CacheMetrics,
} from '@/types/dual-ai-orchestration';

export const maxDuration = 60; // Claude streaming can take time

export async function POST(req: NextRequest) {
  try {
    // Parse request body - COMPATIBILITY LAYER
    // Accept both old format (chatId, messages array) and new format (session_id, message)
    const body: any = await req.json();
    
    // Extract chatId from multiple possible sources (Vercel AI SDK compatibility)
    const chatId = body.chatId || body.session_id || body.id;
    const messages = body.messages || [];
    
    // Extract latest user message
    const userMessages = messages.filter((m: any) => m.role === 'user');
    const latestUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1]?.content : body.message;
    
    // Extract context IDs from body
    const parsed_content_id = body.parsed_content_id || body.attachedFileIds?.[0];
    const synced_assignment_id = body.synced_assignment_id;

    console.log('[AI Chat Adapter] Request:', {
      chatId,
      hasMessages: messages.length > 0,
      latestUserMessage: latestUserMessage?.substring(0, 50),
      parsed_content_id,
      synced_assignment_id,
    });

    // Validate request
    if (!chatId || !latestUserMessage) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: chatId and message',
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

    // COMPATIBILITY LAYER: Load from OLD schema (chats + messages tables)
    // Verify chat ownership
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id, user_id, metadata')
      .eq('id', chatId)
      .single();

    if (chatError || !chat) {
      console.log('[AI Chat Adapter] Chat not found, will be created on first message save');
    } else if (chat.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Chat does not belong to user',
        },
        { status: 403 }
      );
    }

    // Load chat history from OLD messages table
    const { data: historyMessages, error: historyError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('chat_id', chatId)
      .order('sequence_number', { ascending: true })
      .limit(20); // Last 20 messages for context

    if (historyError) {
      console.error('[AI Chat Adapter] Failed to load history:', historyError);
    }

    // Build chat history for Claude
    const chatHistory: ClaudeChatMessage[] = (historyMessages || []).map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Add current user message to history
    chatHistory.push({
      role: 'user',
      content: latestUserMessage,
    });

    console.log('[AI Chat Adapter] Chat history loaded:', {
      messageCount: chatHistory.length,
      chatId,
    });

    // Retrieve source material (LMS context, parsed content)
    const sourceMaterial = await buildSourceMaterial(
      parsed_content_id,
      synced_assignment_id
    );

    console.log('[AI Chat Adapter] Source material:', {
      hasParsedContent: !!sourceMaterial.parsed_content,
      hasAssignmentDescription: !!sourceMaterial.assignment_description,
      hasTeacherRubric: !!sourceMaterial.teacher_rubric,
      hasPdfText: !!sourceMaterial.pdf_text,
    });

    // Initialize Claude Service
    const claudeService = new ClaudeService(apiKey);

    // Generate streaming response
    const startTime = Date.now();
    const stream = await getResponseWithFallback(
      () => claudeService.generateResponse(chatHistory, sourceMaterial, true),
      'I\'m having trouble connecting to the tutoring service right now. Please try again in a moment.'
    );
    const latencyMs = Date.now() - startTime;

    console.log('[AI Chat Adapter] Claude response generated:', {
      isStream: stream instanceof ReadableStream,
      latencyMs,
    });

    // COMPATIBILITY LAYER: Return streaming response compatible with Vercel AI SDK useChat hook
    // The frontend useChat hook expects a text/plain stream with newline-delimited chunks
    if (stream instanceof ReadableStream) {
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
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

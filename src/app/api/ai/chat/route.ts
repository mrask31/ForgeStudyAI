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
    const attachedFileIds: string[] = Array.isArray(body.attachedFileIds) ? body.attachedFileIds.filter(Boolean) : [];
    const parsed_content_id = body.parsed_content_id || attachedFileIds[0];
    const synced_assignment_id = body.synced_assignment_id;
    const topicTitle = body.topicTitle as string | undefined;
    const activeProfileId = body.activeProfileId as string | undefined;

    console.log('[AI Chat Adapter] Request:', {
      chatId,
      hasMessages: messages.length > 0,
      latestUserMessage: latestUserMessage?.substring(0, 50),
      parsed_content_id,
      synced_assignment_id,
      attachedFileIds,
      activeProfileId,
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

    // Inject topic context as opening exchange when it's the first message and a topic is set
    if (topicTitle && chatHistory.length === 0) {
      chatHistory.push({
        role: 'user',
        content: `I want to study "${topicTitle}". Please help me understand it.`,
      });
      chatHistory.push({
        role: 'assistant',
        content: `Great! Let's explore "${topicTitle}" together. I'll guide you through it with questions to help you truly understand the material. What do you already know about ${topicTitle}?`,
      });
    }

    // Add current user message to history
    chatHistory.push({
      role: 'user',
      content: latestUserMessage,
    });

    console.log('[AI Chat Adapter] Chat history loaded:', {
      messageCount: chatHistory.length,
      chatId,
    });

    // Retrieve source material (LMS context, parsed content, binder docs)
    const sourceMaterial = await buildSourceMaterial(
      parsed_content_id,
      synced_assignment_id
    );

    // If no parsed content yet but we have attached file IDs, fetch binder content directly
    if (!sourceMaterial.parsed_content && attachedFileIds.length > 0) {
      const supabaseForDocs = await createClient();
      const { data: docs } = await supabaseForDocs
        .from('documents')
        .select('content, metadata')
        .in('id', attachedFileIds)
        .limit(5);

      if (docs && docs.length > 0) {
        const binderContent = docs
          .map(d => {
            const filename = (d.metadata as any)?.filename || 'document';
            return `[Source: ${filename}]\n${d.content}`;
          })
          .join('\n\n');
        sourceMaterial.parsed_content = binderContent;
      }
    }

    // Also try to fetch learning sources for this profile's topic
    if (!sourceMaterial.parsed_content && activeProfileId && topicTitle) {
      const supabaseForSources = await createClient();
      const { data: sourceItems } = await supabaseForSources
        .from('learning_source_items')
        .select('title, text_content, learning_sources!inner(profile_id)')
        .eq('learning_sources.profile_id', activeProfileId)
        .ilike('title', `%${topicTitle.split(' ')[0]}%`)
        .limit(3);

      if (sourceItems && sourceItems.length > 0) {
        const learningContent = sourceItems
          .map(s => `[Source: ${s.title}]\n${s.text_content}`)
          .join('\n\n');
        sourceMaterial.parsed_content = learningContent;
      }
    }

    console.log('[AI Chat Adapter] Source material:', {
      hasParsedContent: !!sourceMaterial.parsed_content,
      parsedContentLength: sourceMaterial.parsed_content?.length ?? 0,
      hasAssignmentDescription: !!sourceMaterial.assignment_description,
      hasTeacherRubric: !!sourceMaterial.teacher_rubric,
      hasPdfText: !!sourceMaterial.pdf_text,
      attachedFileIdsUsed: attachedFileIds.length,
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

    // Convert Anthropic stream to AI SDK data stream protocol expected by useChat from @ai-sdk/react
    // Anthropic toReadableStream() emits JSON lines like {"type":"content_block_delta",...}
    // AI SDK useChat expects lines like: 0:"text chunk"\n and d:{finishReason}\n
    if (stream instanceof ReadableStream) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const aiDataStream = new ReadableStream({
        async start(controller) {
          const reader = stream.getReader();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() ?? '';

              for (const line of lines) {
                if (!line.trim()) continue;
                // Handle both raw JSON objects and SSE "data: {...}" lines
                const jsonStr = line.startsWith('data: ') ? line.slice(6) : line;
                if (jsonStr === '[DONE]') continue;
                try {
                  const event = JSON.parse(jsonStr);
                  if (
                    event.type === 'content_block_delta' &&
                    event.delta?.type === 'text_delta' &&
                    typeof event.delta.text === 'string'
                  ) {
                    controller.enqueue(encoder.encode(`0:${JSON.stringify(event.delta.text)}\n`));
                  }
                } catch {
                  // Skip non-JSON lines
                }
              }
            }

            // Flush remaining buffer
            if (buffer.trim()) {
              const jsonStr = buffer.startsWith('data: ') ? buffer.slice(6) : buffer;
              try {
                const event = JSON.parse(jsonStr);
                if (
                  event.type === 'content_block_delta' &&
                  event.delta?.type === 'text_delta' &&
                  typeof event.delta.text === 'string'
                ) {
                  controller.enqueue(encoder.encode(`0:${JSON.stringify(event.delta.text)}\n`));
                }
              } catch {
                // ignore
              }
            }
          } catch (err) {
            controller.error(err);
            return;
          }

          // Send AI SDK finish event
          controller.enqueue(
            encoder.encode('d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n')
          );
          controller.close();
        },
      });

      return new Response(aiDataStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'x-vercel-ai-data-stream': 'v1',
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

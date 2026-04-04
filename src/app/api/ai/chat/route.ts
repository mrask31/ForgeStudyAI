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
import OpenAI from 'openai';
import type {
  ClaudeChatMessage,
  CacheMetrics,
} from '@/types/dual-ai-orchestration';

// Lazy-initialize OpenAI client for embeddings only
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

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
    const classId = body.classId as string | undefined;
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

    // Validate request — chatId can be missing for first message (session just created)
    if (!latestUserMessage) {
      console.error('[AI Chat Adapter] Missing user message in request');
      return NextResponse.json(
        { success: false, error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    if (!chatId) {
      console.warn('[AI Chat Adapter] No chatId in request — proceeding without chat history');
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

    // Load chat history if chatId is available
    let historyMessages: any[] = [];
    if (chatId) {
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('id, user_id, metadata')
        .eq('id', chatId)
        .single();

      if (chatError || !chat) {
        console.log('[AI Chat Adapter] Chat not found, will be created on first message save');
      } else if (chat.user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Chat does not belong to user' },
          { status: 403 }
        );
      }

      const { data: msgs, error: historyError } = await supabase
        .from('messages')
        .select('role, content')
        .eq('chat_id', chatId)
        .order('sequence_number', { ascending: true })
        .limit(20);

      if (historyError) {
        console.error('[AI Chat Adapter] Failed to load history:', historyError);
      }
      historyMessages = msgs || [];
    }

    // Build chat history for Claude
    const chatHistory: ClaudeChatMessage[] = (historyMessages || []).map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Look up class name from classId for richer context
    let resolvedClassName: string | undefined;
    if (classId) {
      const { data: classRow } = await supabase
        .from('student_classes')
        .select('name, code')
        .eq('id', classId)
        .single();
      if (classRow) {
        resolvedClassName = classRow.code ? `${classRow.code} — ${classRow.name}` : classRow.name;
      }
    }
    // Fall back to client-supplied class name if DB lookup yields nothing
    if (!resolvedClassName) {
      const clientClassName = body.className as string | undefined;
      const clientSelectedClassName = body.selectedClassName as string | undefined;
      resolvedClassName = clientSelectedClassName || clientClassName;
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

    // Build topic context prefix for system prompt
    let topicContext = '';
    if (topicTitle || resolvedClassName) {
      const classLabel = resolvedClassName
        ? `This is for their ${resolvedClassName} class${classId ? ` (classId: ${classId})` : ''}.`
        : classId ? `(classId: ${classId})` : '';
      const topicLine = topicTitle ? `The student is currently studying: ${topicTitle}.` : '';
      topicContext = `${[topicLine, classLabel].filter(Boolean).join(' ')} Use this context in all responses — do not ask the student what class or topic they are working on.\n\n`;
    }

    // Fetch student profile for interests injection
    let interestsLine = '';
    if (activeProfileId) {
      const { data: profileData } = await supabase
        .from('student_profiles')
        .select('interests')
        .eq('id', activeProfileId)
        .eq('owner_id', user.id)
        .single();
      if (profileData?.interests?.trim()) {
        interestsLine = `Student interests: ${profileData.interests.trim()}. When explaining concepts, naturally use analogies and examples related to these interests where it fits. Don't force it on every response — just when it makes the explanation clearer or more engaging.\n\n`;
      }
    }

    // Vault RAG: search student's uploaded study material for relevant context
    let vaultContext = '';
    try {
      const embeddingResponse = await getOpenAIClient().embeddings.create({
        model: 'text-embedding-3-small',
        input: latestUserMessage,
      });
      const queryEmbedding = embeddingResponse.data?.[0]?.embedding;
      if (queryEmbedding && Array.isArray(queryEmbedding)) {
        const { data: vaultChunks } = await supabase.rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_threshold: 0.7,
          match_count: 3,
          user_id_filter: user.id,
          filter_active: true,
        });
        if (vaultChunks && vaultChunks.length > 0) {
          vaultContext = `\n\nRelevant material from student's Study Vault:\n${(vaultChunks as Array<{ content?: string }>).map(c => c.content).filter(Boolean).join('\n\n')}\n\nUse this material to ground your Socratic questions and explanations. Reference it naturally — don't quote it directly.\n\n`;
        }
      }
    } catch (vaultErr) {
      console.warn('[AI Chat Adapter] Vault RAG search failed (non-fatal):', vaultErr);
    }

    const systemPromptPrefix = interestsLine + vaultContext + topicContext;

    // Initialize Claude Service
    const claudeService = new ClaudeService(apiKey);

    // Generate streaming response
    const startTime = Date.now();
    const stream = await getResponseWithFallback(
      () => claudeService.generateResponse(chatHistory, sourceMaterial, true, systemPromptPrefix),
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

      // Collect full response text for portfolio capture
      let fullResponseText = '';

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
                const jsonStr = line.startsWith('data: ') ? line.slice(6) : line;
                if (jsonStr === '[DONE]') continue;
                try {
                  const event = JSON.parse(jsonStr);
                  if (
                    event.type === 'content_block_delta' &&
                    event.delta?.type === 'text_delta' &&
                    typeof event.delta.text === 'string'
                  ) {
                    fullResponseText += event.delta.text;
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
                  fullResponseText += event.delta.text;
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

          // Fire-and-forget portfolio capture after stream completes
          if (activeProfileId && fullResponseText.length > 50) {
            const captureUrl = new URL('/api/portfolio/capture', req.url);
            fetch(captureUrl.toString(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                profileId: activeProfileId,
                classId: classId || null,
                sessionId: chatId || null,
                userMessage: latestUserMessage?.slice(0, 1000),
                assistantMessage: fullResponseText.slice(0, 1000),
              }),
            }).catch(() => {
              // Non-critical — don't fail tutor response
            });
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
    console.error('[AI Chat Adapter] FATAL ERROR:', {
      message: error?.message,
      name: error?.name,
      status: error?.status,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
    });

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

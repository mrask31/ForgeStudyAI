/**
 * Proof Engine Chat API Route (TEMPORARY TRANSITIONAL ROUTE)
 * 
 * ⚠️ IMPORTANT: This is a temporary parallel implementation for proof engine validation.
 * Once the proof engine is fully validated and stable, this route will REPLACE the
 * existing `/api/chat` route. Do NOT use both routes simultaneously in production.
 * 
 * Purpose:
 * - Safe testing ground for proof engine integration
 * - Allows validation without risking existing chat functionality
 * - Will be merged into main chat route after successful validation
 * 
 * Routes all messages through ProofEngineMiddleware for:
 * - Teaching exchange counting
 * - Adaptive checkpoint triggering
 * - Understanding validation
 * - Proof event logging
 * 
 * Uses non-streaming responses (required for middleware processing).
 */

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

// Proof Engine imports
import { ProofEngineMiddleware } from '@/lib/proof-engine/middleware';
import { UnderstandingValidator } from '@/lib/proof-engine/validator';
import { ProofEventLogger } from '@/lib/proof-engine/logger';
import { AdaptiveResponseGenerator } from '@/lib/proof-engine/adaptive-response';
import { generateExplainBackPrompt } from '@/lib/proof-engine/prompt-generator';
import { isTeachingExchange } from '@/lib/proof-engine/exchange-classifier';
import {
  shouldTriggerCheckpoint,
  updateCheckpointTarget,
} from '@/lib/proof-engine/checkpoint-frequency';
import type { ConversationState, Message } from '@/lib/proof-engine/types';
import { z } from 'zod';

// ============================================
// Minimal Persisted State Schema (Version 1)
// ============================================

/**
 * Minimal persisted state schema for proof engine
 * 
 * ONLY these fields are persisted to database metadata.
 * All other runtime fields are initialized deterministically in code.
 * 
 * Version 1 (current):
 * - Absolute minimum required for proof engine continuity
 * - No arrays, no prompts, no validation history
 * - Deterministic defaults for all fields
 */
const PersistedProofStateV1Schema = z.object({
  version: z.number().default(1),
  teachingExchangeCount: z.number().default(0),
  isInCheckpointMode: z.boolean().default(false),
  nextCheckpointTarget: z.number().default(3),
  conceptsProvenCount: z.number().default(0),
  lastCheckpointAtExchange: z.number().nullable().default(null), // Guard: prevents immediate re-triggering
});

type PersistedProofStateV1 = z.infer<typeof PersistedProofStateV1Schema>;

/**
 * Runtime conversation state (full shape required by middleware)
 * 
 * This is the complete state used during message processing.
 * Only the minimal persisted fields are saved to database.
 */
const RuntimeConversationStateSchema = z.object({
  // Persisted fields (from PersistedProofStateV1Schema)
  version: z.number().default(1),
  teachingExchangeCount: z.number().default(0),
  isInCheckpointMode: z.boolean().default(false),
  nextCheckpointTarget: z.number().default(3),
  conceptsProvenCount: z.number().default(0),
  lastCheckpointAtExchange: z.number().nullable().default(null), // Guard: prevents immediate re-triggering
  
  // Runtime-only fields (initialized deterministically, NOT persisted)
  mode: z.enum(['teaching', 'checkpoint']).default('teaching'),
  checkpointTarget: z.number().default(3),
  validationHistory: z.array(z.enum(['pass', 'partial', 'retry'])).default([]),
  currentConcept: z.string().nullable().default(null),
  conceptsProven: z.array(z.string()).default([]),
  lastCheckpointAt: z.date().nullable().default(null),
  currentCheckpointConcept: z.string().nullable().default(null),
  lastThreeValidationResults: z.array(z.enum(['pass', 'partial', 'retry'])).default([]),
  conceptsProvenThisSession: z.array(z.string()).default([]),
  gradeLevel: z.number().default(8),
  lastCheckpointPrompt: z.string().optional(),
});

type RuntimeConversationState = z.infer<typeof RuntimeConversationStateSchema>;

// Lazy-initialize OpenAI client to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export const maxDuration = 30;

type SupabaseServerClient = ReturnType<typeof createServerClient>;

/**
 * Call OpenAI for main tutoring responses (what students see during teaching mode)
 * 
 * This is the primary teaching AI - uses gpt-4o for high-quality instruction.
 * Separate from evaluation AI to maintain clear boundaries.
 * 
 * @param messages - Conversation messages
 * @param systemPrompt - System prompt for tutoring context
 * @returns Tutor response text
 */
async function callTutorAI(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<string> {
  const result = await generateText({
    model: openai('gpt-4o') as any,
    messages: messages as any,
    system: systemPrompt,
  });

  return result.text;
}

/**
 * Call OpenAI for evaluation/auxiliary operations (validator, classifier, prompt generation, adaptive responses)
 * 
 * This is the evaluation AI - uses gpt-4o-mini for efficiency.
 * Handles all proof engine auxiliary operations:
 * - Understanding validation
 * - Teaching exchange classification
 * - Explain-back prompt generation
 * - Adaptive response generation
 * 
 * DETERMINISTIC: temperature set to 0 for consistent, reproducible results.
 * Separate from tutoring AI to maintain clear prompt boundaries and intent.
 * 
 * @param prompt - Evaluation prompt
 * @returns AI response text
 */
async function callEvaluationAI(prompt: string): Promise<string> {
  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0, // DETERMINISTIC: No randomness in evaluation
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Load conversation state from chat metadata with validation and migration
 * 
 * - Reads minimal persisted state from metadata.proofEngineState
 * - Validates using PersistedProofStateV1Schema
 * - Merges into full runtime ConversationState with deterministic defaults
 * - Never throws on invalid data - always returns valid state
 * 
 * @param chatId - Chat session ID
 * @param userId - User ID
 * @param supabase - Supabase client
 * @param gradeLevel - Student grade level (default 8)
 * @returns Valid runtime conversation state
 */
async function loadConversationState(
  chatId: string,
  userId: string,
  supabase: SupabaseServerClient,
  gradeLevel?: number
): Promise<ConversationState> {
  let persistedState: PersistedProofStateV1 | null = null;

  try {
    const { data: chat } = await supabase
      .from('chats')
      .select('metadata')
      .eq('id', chatId)
      .eq('user_id', userId)
      .single();

    if (chat?.metadata && typeof chat.metadata === 'object' && 'proofEngineState' in chat.metadata) {
      const saved = (chat.metadata as any).proofEngineState;
      
      // Validate using minimal persisted schema
      const parseResult = PersistedProofStateV1Schema.safeParse(saved);
      
      if (parseResult.success) {
        persistedState = parseResult.data;
      } else {
        console.warn('[ProofChat] Invalid persisted state, using defaults:', parseResult.error);
      }
    }
  } catch (error) {
    console.error('[ProofChat] Error loading state:', error);
  }

  // Build full runtime state with deterministic defaults
  const runtimeState = RuntimeConversationStateSchema.parse({
    // Persisted fields (from database or defaults)
    version: persistedState?.version ?? 1,
    teachingExchangeCount: persistedState?.teachingExchangeCount ?? 0,
    isInCheckpointMode: persistedState?.isInCheckpointMode ?? false,
    nextCheckpointTarget: persistedState?.nextCheckpointTarget ?? 3,
    conceptsProvenCount: persistedState?.conceptsProvenCount ?? 0,
    lastCheckpointAtExchange: persistedState?.lastCheckpointAtExchange ?? null,
    
    // Runtime-only fields (deterministic initialization)
    mode: persistedState?.isInCheckpointMode ? 'checkpoint' : 'teaching',
    gradeLevel: gradeLevel ?? 8,
    // All other fields use schema defaults
  });

  return runtimeState as ConversationState;
}

/**
 * Save conversation state to chat metadata
 * 
 * - Extracts ONLY minimal persisted fields from runtime state
 * - Validates using PersistedProofStateV1Schema
 * - Persists only the minimal object (no arrays, prompts, or history)
 * - Graceful error handling (doesn't break chat on save failure)
 * 
 * @param chatId - Chat session ID
 * @param userId - User ID
 * @param state - Runtime conversation state
 * @param supabase - Supabase client
 */
async function saveConversationState(
  chatId: string,
  userId: string,
  state: ConversationState,
  supabase: SupabaseServerClient
): Promise<void> {
  try {
    // Extract ONLY minimal persisted fields
    const minimalState: PersistedProofStateV1 = {
      version: 1,
      teachingExchangeCount: state.teachingExchangeCount,
      isInCheckpointMode: state.isInCheckpointMode,
      nextCheckpointTarget: state.nextCheckpointTarget,
      conceptsProvenCount: state.conceptsProvenCount,
      lastCheckpointAtExchange: state.lastCheckpointAtExchange,
    };

    // Validate minimal state before persisting
    const validatedState = PersistedProofStateV1Schema.parse(minimalState);

    // Get existing metadata
    const { data: chat } = await supabase
      .from('chats')
      .select('metadata')
      .eq('id', chatId)
      .eq('user_id', userId)
      .single();

    const existingMetadata = (chat?.metadata as any) || {};

    // Update with minimal proof engine state only
    const updatedMetadata = {
      ...existingMetadata,
      proofEngineState: validatedState,
    };

    await supabase
      .from('chats')
      .update({ metadata: updatedMetadata })
      .eq('id', chatId)
      .eq('user_id', userId);
  } catch (error) {
    console.error('[ProofChat] Error saving state:', error);
    // Don't throw - state persistence failure shouldn't break the chat
  }
}

/**
 * Fetch recent messages for context
 */
async function fetchRecentMessages(
  chatId: string,
  supabase: SupabaseServerClient,
  limit: number = 20
): Promise<Message[]> {
  const { data: messages } = await supabase
    .from('messages')
    .select('role, content, metadata')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!messages) return [];

  // Reverse to get chronological order
  return messages.reverse().map((msg: any) => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
    metadata: msg.metadata || undefined,
  }));
}

/**
 * Save message to database with metadata
 * 
 * PRIVACY BOUNDARY: Full student responses are stored in messages table
 * but are NEVER exposed to parent-facing APIs. Only sanitized excerpts
 * (stored in proof_events table) are visible to parents.
 * 
 * @param chatId - Chat session ID
 * @param role - Message role
 * @param content - Message content (FULL TEXT - not parent-visible)
 * @param metadata - Message metadata (proof flags)
 * @param supabase - Supabase client
 */
async function saveMessage(
  chatId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata: Record<string, any>,
  supabase: SupabaseServerClient
): Promise<void> {
  // PRIVACY CHECK: Ensure metadata doesn't leak full student responses
  // Only proof_events table should contain excerpts (sanitized)
  const safeMetadata = { ...metadata };
  delete safeMetadata.studentResponse; // Never store full response in metadata
  delete safeMetadata.fullText; // Never store full text in metadata

  await supabase.from('messages').insert({
    chat_id: chatId,
    role,
    content,
    metadata: safeMetadata,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    messages,
    chatId,
    activeProfileId,
  } = body;

  console.log('[PROOF-CHAT] Incoming', {
    chatId,
    messageCount: messages?.length || 0,
  });

  // Authenticated Supabase client
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!chatId) {
    return new Response(JSON.stringify({ error: 'chatId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Extract latest user message
  const userMessages = (messages || []).filter((m: any) => m.role === 'user');
  const latestUserMessage = userMessages.length > 0 
    ? userMessages[userMessages.length - 1]?.content || ''
    : '';

  if (!latestUserMessage) {
    return new Response(JSON.stringify({ error: 'No user message provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get student profile for grade level
  let gradeLevel = 8; // Default
  if (activeProfileId) {
    const { data: profileData } = await supabase
      .from('student_profiles')
      .select('grade')
      .eq('id', activeProfileId)
      .eq('owner_id', user.id)
      .single();

    if (profileData?.grade) {
      // Extract numeric grade (e.g., "Grade 10" -> 10)
      const gradeMatch = profileData.grade.match(/\d+/);
      if (gradeMatch) {
        gradeLevel = parseInt(gradeMatch[0], 10);
      }
    }
  }

  // Load conversation state
  let state = await loadConversationState(chatId, user.id, supabase, gradeLevel);

  // Fetch recent messages for context
  const recentMessages = await fetchRecentMessages(chatId, supabase, 20);

  // Persist user message (avoid duplicates by checking if it's already the last message)
  const lastMessage = recentMessages.length > 0 ? recentMessages[recentMessages.length - 1] : null;
  const isUserMessageAlreadyPersisted = 
    lastMessage?.role === 'user' && lastMessage?.content === latestUserMessage;

  if (!isUserMessageAlreadyPersisted) {
    await saveMessage(
      chatId,
      'user',
      latestUserMessage,
      {}, // No metadata for user messages
      supabase
    );
    
    // Add to recent messages for middleware context
    recentMessages.push({
      role: 'user',
      content: latestUserMessage,
    });
  }

  // Initialize proof engine dependencies
  const validator = new UnderstandingValidator();
  const logger = new ProofEventLogger(supabase);
  const adaptiveResponses = new AdaptiveResponseGenerator(callEvaluationAI);

  const middleware = new ProofEngineMiddleware({
    callTutor: async ({ message, recentMessages: recentMsgs }) => {
      // Build system prompt (simplified for MVP)
      const systemPrompt = getSystemPrompt({
        gradeBand: gradeLevel <= 8 ? 'middle' : 'high',
        grade: `Grade ${gradeLevel}`,
        mode: 'tutor',
      });

      // Convert recent messages to core format
      const coreMessages = recentMsgs.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add current user message
      coreMessages.push({
        role: 'user',
        content: message,
      });

      // Call tutoring AI (separate from evaluation AI)
      return callTutorAI(coreMessages, systemPrompt);
    },
    validator,
    logger,
    promptGenerator: {
      generateExplainBackPrompt: (input, callAIFn) => 
        generateExplainBackPrompt(input, callAIFn || callEvaluationAI),
    },
    exchangeClassifier: {
      isTeachingExchange: (message, callAIFn) => 
        isTeachingExchange(message, callAIFn || callEvaluationAI),
    },
    checkpointFrequency: {
      shouldTriggerCheckpoint,
      updateCheckpointTarget,
    },
    adaptiveResponses,
  });

  // Process message through middleware
  const result = await middleware.processMessage(
    latestUserMessage,
    state,
    recentMessages,
    chatId,
    user.id
  );

  // Save updated state
  await saveConversationState(chatId, user.id, result.state, supabase);

  // Save assistant message with metadata
  await saveMessage(
    chatId,
    'assistant',
    result.assistantText,
    result.metadata || {},
    supabase
  );

  // Sanitize response metadata - whitelist only safe fields
  const safeMetadata: Record<string, any> = {};
  if (result.metadata) {
    // Only include safe, non-sensitive fields
    if ('isTeachingExchange' in result.metadata) {
      safeMetadata.isTeachingExchange = result.metadata.isTeachingExchange;
    }
    if ('isProofCheckpoint' in result.metadata) {
      safeMetadata.isProofCheckpoint = result.metadata.isProofCheckpoint;
    }
    if ('classification' in result.metadata) {
      safeMetadata.classification = result.metadata.classification;
    }
    // DO NOT include: excerpts, hashes, raw validator output, prompts, student text
  }

  // Return response with sanitized metadata
  return new Response(
    JSON.stringify({
      message: result.assistantText,
      metadata: safeMetadata,
      state: {
        isInCheckpointMode: result.state.isInCheckpointMode,
        conceptsProvenCount: result.state.conceptsProvenCount,
        teachingExchangeCount: result.state.teachingExchangeCount,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Chat Session Management
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 * 
 * Helper functions for managing chat sessions and history.
 */

import { createClient } from '@/lib/supabase/server';
import type { ClaudeChatMessage, CacheMetrics } from '@/types/dual-ai-orchestration';

const MAX_HISTORY_MESSAGES = 20; // Keep last 20 messages for context window

/**
 * Create a new chat session
 */
export async function createChatSession(
  studentId: string,
  parsedContentId?: string,
  syncedAssignmentId?: string,
  sessionTitle?: string
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      student_id: studentId,
      parsed_content_id: parsedContentId || null,
      synced_assignment_id: syncedAssignmentId || null,
      session_title: sessionTitle || null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Failed to create chat session');
  }

  return data.id;
}

/**
 * Load chat history for a session
 */
export async function loadChatHistory(sessionId: string): Promise<ClaudeChatMessage[]> {
  const supabase = await createClient();

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(MAX_HISTORY_MESSAGES);

  if (error) {
    console.error('[Chat Session] Failed to load history:', error);
    return [];
  }

  return (messages || []).map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));
}

/**
 * Save a chat message
 */
export async function saveChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  metrics?: CacheMetrics
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      input_tokens: metrics?.input_tokens || null,
      output_tokens: metrics?.output_tokens || null,
      cache_creation_tokens: metrics?.cache_creation_input_tokens || null,
      cache_read_tokens: metrics?.cache_read_input_tokens || null,
      model_version: role === 'assistant' ? 'claude-3-5-sonnet-20241022' : null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Failed to save chat message');
  }

  return data.id;
}

/**
 * Truncate history to fit context window
 * Keeps the most recent messages and preserves source material context
 */
export async function truncateHistory(
  messages: ClaudeChatMessage[],
  maxMessages: number = MAX_HISTORY_MESSAGES
): Promise<ClaudeChatMessage[]> {
  if (messages.length <= maxMessages) {
    return messages;
  }

  // Keep the most recent messages
  return messages.slice(-maxMessages);
}

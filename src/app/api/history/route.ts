import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper to validate UUID format
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('id');

  if (!chatId) {
    return NextResponse.json([]);
  }

  // Validate UUID format
  if (!isValidUUID(chatId)) {
    console.warn(`[API] Invalid chat ID format: ${chatId}. Expected UUID.`);
    return NextResponse.json([]);
  }

  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch chat info (status, summary)
    const { data: chatInfo } = await supabase
      .from('chats')
      .select('status, summary')
      .eq('id', chatId)
      .eq('user_id', user?.id)
      .single();

    // Fetch messages for this chat
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('sequence_number', { ascending: true });

    if (error) {
      console.error('[API] Error fetching history:', error);
      // If tables don't exist, return empty array (graceful degradation)
      if (error.code === 'PGRST205') {
        console.warn('[API] Tables not found. Please run the SQL schema in Supabase.');
      }
      return NextResponse.json([]);
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json([]);
    }

    // Convert Supabase messages to AI SDK format
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    console.log(`[DB] Successfully loaded ${formattedMessages.length} messages for chat ${chatId}`);
    return NextResponse.json({
      messages: formattedMessages,
      chatStatus: chatInfo?.status || 'active',
      chatSummary: chatInfo?.summary || null,
    });

  } catch (error) {
    console.error('[DB] Error loading history:', error);
    return NextResponse.json([]);
  }
}
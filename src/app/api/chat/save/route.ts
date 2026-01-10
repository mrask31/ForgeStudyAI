import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Helper to validate UUID format
const isValidUUID = (str: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export async function POST(req: Request) {
  try {
    const { chatId, role, content } = await req.json();

    if (!chatId || !role || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: chatId, role, content' },
        { status: 400 }
      );
    }

    if (!isValidUUID(chatId)) {
      console.warn(`[SAVE] Invalid chatId format: ${chatId}`);
      return NextResponse.json(
        { error: 'Invalid chat ID format. Expected UUID.' },
        { status: 400 }
      );
    }

    // Authenticated Supabase client (cookies)
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
      console.error('[SAVE] Unauthorized:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user.id is present and valid
    if (!user.id || typeof user.id !== 'string') {
      console.error('[SAVE] Invalid user.id:', user.id);
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 401 }
      );
    }

    const title = (String(content) || 'New Chat').slice(0, 50);

    // Get existing chat to preserve mode and selected_note_ids
    const { data: existingChat } = await supabase
      .from('chats')
      .select('mode, selected_note_ids')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single();

    // Construct payload explicitly with user_id for RLS
    // CRITICAL: user_id MUST be included and match authenticated user for RLS policies
    const chatPayload = {
      id: chatId,
      user_id: user.id, // REQUIRED: Must be explicitly set for RLS INSERT/UPDATE policies
      title,
      updated_at: new Date().toISOString(),
      mode: existingChat?.mode || 'tutor', // Preserve mode
      selected_note_ids: existingChat?.selected_note_ids || null, // Preserve selected notes
    };

    // Verify payload has user_id before upsert
    if (!chatPayload.user_id) {
      console.error('[SAVE] user_id missing from payload!');
      return NextResponse.json(
        { error: 'Internal error: user_id not set' },
        { status: 500 }
      );
    }

    // Use upsert to create or update chat (idempotent)
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .upsert(chatPayload, {
        onConflict: 'id' // If ID exists, update instead of error
      })
      .select('id')
      .single();

    if (chatError) {
      console.error('[SAVE] Error upserting chat:', chatError);
      if (chatError.code === '42501') {
        console.error('[SAVE] RLS policy violation. User ID:', user.id);
        return NextResponse.json(
          { error: 'Permission denied (RLS blocked chat upsert)' },
          { status: 403 }
        );
      } else if (chatError.code === 'PGRST205') {
        console.warn('[SAVE] Tables not found. Please run the SQL schema in Supabase.');
        return NextResponse.json(
          { error: 'Database tables not found. Please run the SQL schema.' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create/update chat' },
        { status: 500 }
      );
    }

    // Compute sequence_number
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId);

    if (countError) {
      console.error('[SAVE] Error counting messages:', countError);
      return NextResponse.json(
        { error: 'Failed to count messages' },
        { status: 500 }
      );
    }

    // Insert message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        role,
        content,
        sequence_number: (count || 0) + 1,
      })
      .select()
      .single();

    if (messageError) {
      console.error('[SAVE] Error saving message:', messageError);
      if (messageError.code === '42501') {
        return NextResponse.json(
          { error: 'Permission denied (RLS blocked message insert)' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error('[SAVE] Critical error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

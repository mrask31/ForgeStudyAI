import { openai } from '@ai-sdk/openai';
import { streamText, convertToCoreMessages } from 'ai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { retrieveLearningContext } from '@/app/actions/learning-sources';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openaiEmbeddings = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 30;

type SupabaseServerClient = ReturnType<typeof createServerClient>;

type MatchRow = {
  id?: number | string;
  content?: string;
  metadata?: any;
  similarity?: number;
  is_active?: boolean;
};

/**
 * Retrieve relevant document chunks from user's active binder documents
 * - Tries calling match_documents with filter_active (5-arg signature)
 * - If PostgREST cannot resolve overloaded RPCs (PGRST203), falls back to 4-arg call and filters active client-side.
 */
/**
 * Retrieve relevant document chunks from user's active binder documents
 * Returns context string and file status flags for better fallback messaging
 */
type BinderContextResult = {
  hasContext: boolean;
  context: string;
  contextLength: number;
  fileCount: number;
  fileSummaries?: Array<{ filename: string; document_type: string; class_id?: string }>;
};

type BinderPresenceResult = {
  hasAnyFilesForUser: boolean;
  hasAnyFilesForClass: boolean;
  activeChunkCount: number;
  fileSummaries: Array<{ filename: string; document_type: string; class_id?: string }>;
};

/**
 * Check binder presence by querying documents table directly (not RAG)
 * This mirrors the logic in /api/binder to determine if user has active files
 */
async function checkBinderPresence(
  userId: string,
  supabase: SupabaseServerClient,
  classId?: string | null
): Promise<BinderPresenceResult> {
  try {
    // Query documents table directly (same as /api/binder)
    const { data: chunkRows, error } = await supabase
      .from('documents')
      .select('id, file_key, metadata, document_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[BinderPresence] Error querying documents:', error);
      return {
        hasAnyFilesForUser: false,
        hasAnyFilesForClass: false,
        activeChunkCount: 0,
        fileSummaries: [],
      };
    }

    if (!chunkRows || chunkRows.length === 0) {
      return {
        hasAnyFilesForUser: false,
        hasAnyFilesForClass: false,
        activeChunkCount: 0,
        fileSummaries: [],
      };
    }

    // Filter by is_active (stored in metadata.is_active, defaults to true for backward compatibility)
    const activeChunks = chunkRows.filter((row: any) => {
      return row.metadata?.is_active !== false;
    });

    const activeChunkCount = activeChunks.length;
    const hasAnyFilesForUser = activeChunkCount > 0;

    // Build file summaries (group by file_key to get unique files)
    const filesByKey = new Map<string, { filename: string; document_type: string; class_id?: string }>();
    
    for (const chunk of activeChunks) {
      const key = chunk.file_key;
      if (!key) continue;
      
      const filename = chunk.metadata?.filename || chunk.metadata?.name || 'Unknown';
      const document_type = chunk.document_type || chunk.metadata?.document_type || 'unknown';
      const class_id = chunk.metadata?.class_id || chunk.metadata?.classId;
      
      // Only store once per file_key
      if (!filesByKey.has(key)) {
        filesByKey.set(key, { filename, document_type, class_id });
      }
    }

    const fileSummaries = Array.from(filesByKey.values());

    // Check if any files are linked to the specified class
    let hasAnyFilesForClass = false;
    if (classId && hasAnyFilesForUser) {
      hasAnyFilesForClass = fileSummaries.some(file => file.class_id === classId);
    }

    return {
      hasAnyFilesForUser,
      hasAnyFilesForClass,
      activeChunkCount,
      fileSummaries,
    };
  } catch (error: any) {
    console.error('[BinderPresence] Error:', error);
    return {
      hasAnyFilesForUser: false,
      hasAnyFilesForClass: false,
      activeChunkCount: 0,
      fileSummaries: [],
    };
  }
}

/**
 * Robust, fail-safe RAG retrieval helper
 * Searches all active user files regardless of class/topic scoping
 */
async function retrieveBinderContext(
  userId: string,
  ragQuery: string,
  supabase: SupabaseServerClient,
  attachedFileIds: string[] = []
): Promise<BinderContextResult> {
  try {
    // 1) Generate embedding from user's question
    const embeddingResponse = await openaiEmbeddings.embeddings.create({
      model: 'text-embedding-3-small',
      input: ragQuery,
    });

    const queryEmbedding = embeddingResponse.data?.[0]?.embedding;
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      console.error('[RAG] Missing embedding from OpenAI response');
      return { hasContext: false, context: '', contextLength: 0, fileCount: 0 };
    }

    // 2) Search all active user files (ignore class/topic scoping for MVP)
    const match_threshold = 0.1; // Forgiving threshold
    const match_count = 10; // Top 10 chunks

    const { data: matchedChunks, error: rpcError } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold,
      match_count,
      user_id_filter: userId,
      filter_active: true, // Only active files
    });

    if (rpcError) {
      console.error('[RAG] RPC error:', rpcError);
      return { hasContext: false, context: '', contextLength: 0, fileCount: 0 };
    }

    let documents: MatchRow[] = (matchedChunks as MatchRow[]) ?? [];

    // 3) Filter by attachedFileIds if provided (for specific file selection)
    if (attachedFileIds.length > 0) {
      console.log('[RAG] Filtering by attachedFileIds', {
        attachedFileIdsCount: attachedFileIds.length,
        attachedFileIds: attachedFileIds.slice(0, 5),
        documentsBeforeFilter: documents.length,
      });
      
      documents = documents.filter((doc: any) => {
        const docId = String(doc.id || doc.document_id || '');
        const fileKey = String(doc.file_key || doc.metadata?.file_key || '');
        // Match by ID, file_key, or chunkIds
        const matchesId = attachedFileIds.some(id => String(id) === docId);
        const matchesFileKey = fileKey && attachedFileIds.some(id => String(id) === fileKey);
        const matchesChunkId = doc.metadata?.chunkIds && 
          Array.isArray(doc.metadata.chunkIds) &&
          doc.metadata.chunkIds.some((chunkId: string) => attachedFileIds.includes(String(chunkId)));
        return matchesId || matchesFileKey || matchesChunkId;
      });
      
      console.log('[RAG] After filtering by attachedFileIds', {
        documentsAfterFilter: documents.length,
      });
    }

    // 4) Build context and extract file info
    const fileSummariesMap = new Map<string, { filename: string; document_type: string }>();
    let context = '';
    let contextLength = 0;

    if (documents && documents.length > 0) {
      const contextSections = documents
        .map((doc: any) => {
          const filename = doc?.metadata?.filename || doc?.metadata?.name || 'Unknown document';
          const content = doc?.content || '';
          
          // Track unique files
          if (!fileSummariesMap.has(filename)) {
            fileSummariesMap.set(filename, {
              filename,
              document_type: doc?.document_type || doc?.metadata?.document_type || 'unknown',
            });
          }
          
          contextLength += content.length;
          return `[Source: ${filename}]\n${content}`.trim();
        })
        .filter(Boolean)
        .join('\n\n');

      if (contextSections.trim()) {
        context = contextSections;
      }
    }

    const fileCount = fileSummariesMap.size;
    const fileSummaries = Array.from(fileSummariesMap.values());
    const hasContext = documents.length > 0 && context.trim().length > 0;

    return {
      hasContext,
      context,
      contextLength,
      fileCount,
      fileSummaries,
    };
  } catch (error: any) {
    console.error('[RAG] Error:', error);
    // Fail-safe: return empty but valid structure
    return { hasContext: false, context: '', contextLength: 0, fileCount: 0 };
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    messages,
    strictMode,
    filterMode = 'mixed',
    selectedDocIds = [],
    chatId,
    topicTitle,
    className,
    selectedClassName,
    attachedFileIds: rawAttachedFileIds,
    activeProfileId,
    learningMode,
    mode: interactionMode = 'tutor',
  } = body;
  
  // CRITICAL: Ensure attachedFileIds is always an array, never 'none' or undefined
  const attachedFileIds = Array.isArray(rawAttachedFileIds) 
    ? rawAttachedFileIds.filter(id => id) // Filter out falsy values
    : [];
  
  // Log incoming request details
  console.log('[CHAT] Incoming', {
    mode: filterMode,
    sessionId: chatId,
    chatId,
    attachedFileIds: attachedFileIds.length > 0 ? attachedFileIds : 'none (empty array)',
    attachedFileIdsCount: attachedFileIds.length,
    firstUserMessage: messages?.[messages.length - 1]?.content?.slice?.(0, 80),
    messageCount: messages?.length || 0,
  });

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
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Extract latest user message FIRST (before any usage)
  const userMessages = (messages || []).filter((m: any) => m.role === 'user');
  let latestUserMessage: string | null = userMessages.length > 0 && userMessages[userMessages.length - 1]?.content
    ? userMessages[userMessages.length - 1].content
    : null;

  // Get chat metadata (attachedFileIds, selected_note_ids, mode) from database if chatId provided
  let chatAttachedFileIds: string[] = []
  let chatMode: 'tutor' | 'notes' = 'tutor'
  let chatSelectedNoteIds: string[] = []
  let isFirstAssistantReply = false
  
  if (chatId) {
    const { data: chat } = await supabase
      .from('chats')
      .select('mode, selected_note_ids, metadata')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single()
    
    if (chat) {
      chatMode = (chat.mode as 'tutor' | 'notes') || 'tutor'
      chatSelectedNoteIds = (chat.selected_note_ids as string[]) || []
      // Extract attachedFileIds from metadata
      if (chat.metadata && typeof chat.metadata === 'object' && 'attachedFileIds' in chat.metadata) {
        chatAttachedFileIds = Array.isArray(chat.metadata.attachedFileIds) 
          ? chat.metadata.attachedFileIds 
          : []
      }
    }
    
    // Check if this is the first assistant reply (no prior assistant messages in history)
    const { data: priorMessages } = await supabase
      .from('messages')
      .select('role')
      .eq('chat_id', chatId)
      .eq('role', 'assistant')
    
    isFirstAssistantReply = !priorMessages || priorMessages.length === 0
  }
  
  // Ensure latestUserMessage is always a string (not null) for downstream usage
  const latestUserMessageStr = latestUserMessage || '';

  // Use chat mode if available, otherwise use filterMode from request
  const effectiveMode = chatMode === 'notes' ? 'notes' : (filterMode === 'notes' ? 'notes' : 'mixed')
  const effectiveSelectedIds = chatMode === 'notes' ? chatSelectedNoteIds : selectedDocIds
  const effectiveLearningMode = learningMode || (strictMode ? 'strict' : 'balanced')

  // Priority: Use attachedFileIds from chat metadata if available, otherwise use selectedDocIds from request
  const effectiveAttachedIds = chatAttachedFileIds.length > 0 ? chatAttachedFileIds : (selectedDocIds.length > 0 ? selectedDocIds : [])

  // Safety fallback: if mode=notes but no selectedDocIds, return error
  if (effectiveMode === 'notes' && (!effectiveSelectedIds || effectiveSelectedIds.length === 0)) {
    return new Response(JSON.stringify({ error: 'No notes selected. Please select notes to study.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Extract classId and topicTerm from chat metadata
  let chatClassId: string | null = null
  let chatTopicTerm: string | null = null
  let chatTopicId: string | null = null
  
  if (chatId) {
    const { data: chatMeta } = await supabase
      .from('chats')
      .select('metadata')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single()
    
    if (chatMeta?.metadata && typeof chatMeta.metadata === 'object') {
      chatClassId = (chatMeta.metadata as any).classId || null
      chatTopicId = (chatMeta.metadata as any).topicId || null
      chatTopicTerm = (chatMeta.metadata as any).topicTerm || (chatMeta.metadata as any).topicTitle || null
    }
  }

  // Retrieve binder context via RAG
  // Priority: Use attachedFileIds from request body FIRST, then chat metadata, then selectedDocIds
  const requestAttachedIds = Array.isArray(attachedFileIds) && attachedFileIds.length > 0 ? attachedFileIds : [];
  const contextFilterIds = requestAttachedIds.length > 0 
    ? requestAttachedIds 
    : (effectiveAttachedIds.length > 0 ? effectiveAttachedIds : effectiveSelectedIds);
  
  console.log('[CHAT] RAG context filter IDs', {
    requestAttachedIds: requestAttachedIds.length,
    chatMetadataAttachedIds: effectiveAttachedIds.length,
    selectedDocIds: effectiveSelectedIds.length,
    finalContextFilterIds: contextFilterIds.length,
  });
  
  // Call robust RAG helper
  let binderResult: BinderContextResult = { hasContext: false, context: '', contextLength: 0, fileCount: 0 };
  let learningContextResult: { hasContext: boolean; context: string; sourcesUsed: Array<{ title: string; sourceType: string; itemType: string }> } = {
    hasContext: false,
    context: '',
    sourcesUsed: [],
  };
  
  if (latestUserMessageStr) {
    binderResult = await retrieveBinderContext(
      user.id,
      latestUserMessageStr,
      supabase,
      contextFilterIds
    );
    
    // Debug log immediately after retrieval
    console.log('[BinderContext] Result summary:', {
      hasContext: binderResult.hasContext,
      fileCount: binderResult.fileCount,
      contextLength: binderResult.contextLength,
      query: latestUserMessageStr.substring(0, 50),
    });

    learningContextResult = await retrieveLearningContext({
      question: latestUserMessageStr,
      profileId: activeProfileId || null,
      mode: effectiveLearningMode,
    });
  }

  const binderContext = binderResult.context;
  const learningContext = learningContextResult.context;
  const fileSummaries = binderResult.fileSummaries || [];

  let activeProfile: {
    display_name: string | null;
    grade_band: 'elementary' | 'middle' | 'high';
    grade: string | null;
    interests: string | null;
  } | null = null;
  if (activeProfileId) {
    const { data: profileData, error: profileError } = await supabase
      .from('student_profiles')
      .select('display_name, grade_band, grade, interests')
      .eq('id', activeProfileId)
      .eq('owner_id', user.id)
      .single();
    if (profileError) {
      console.warn('[CHAT] Failed to load active profile:', profileError);
    } else if (profileData) {
      activeProfile = profileData as any;
    }
  }

  // Build system prompt for tutor mode
  let systemPrompt: string = '';
  const resolvedInteractionMode =
    interactionMode === 'essay_feedback' || interactionMode === 'planner' || interactionMode === 'tutor'
      ? interactionMode
      : 'tutor'

  systemPrompt = getSystemPrompt({
    gradeBand: activeProfile?.grade_band,
    grade: activeProfile?.grade || null,
    mode: resolvedInteractionMode,
  });

  if (activeProfile) {
    const profileName = activeProfile.display_name || 'Student';
    const interestsLine = activeProfile.interests ? activeProfile.interests : 'None provided';
    const gradeLine = activeProfile.grade ? `Grade: ${activeProfile.grade}` : 'Grade: Not specified';
    systemPrompt += `
### STUDENT PROFILE
Name: ${profileName}
Grade band: ${activeProfile.grade_band}
${gradeLine}
Interests & hobbies: ${interestsLine}

Guidance:
- If the student asks about their likes or hobbies, answer using this profile data.
- Use the interests to create analogies or examples when helpful.
- Do not invent interests that are not listed above.
- If interests are missing and would help, ask the student to share a few.
- If this is the first reply of the session, greet the student by name once.
- Use the student's name sparingly for occasional encouragement after that.
`;
  }

  systemPrompt += `
### STUDENT MATERIALS RULES
- You may receive a system message labeled "STUDENT MATERIALS CONTEXT".
- If present, prioritize it as the primary reference.
- If mode is STRICT: answer ONLY using the provided materials. If they are insufficient, say so and ask for more details.
- If mode is BALANCED: use student materials first, then add general knowledge if needed.
- If mode is PRACTICE: ask guiding questions, give hints, and avoid giving the full answer outright.
- When you use student materials, include a "Sources:" line listing the titles you used.
- "Sources:" format example: Sources: [Unit 2 Fractions — weekly], [ELA Scope & Sequence — syllabus]
Current learning mode: ${effectiveLearningMode.toUpperCase()}
`;

  // Build messages array with binder context handling
  const coreMessages = convertToCoreMessages(messages);
  const messagesWithBinder: any[] = [...coreMessages];

  // Add student materials context if available
  if (learningContextResult.hasContext && learningContext && learningContext.trim().length > 0) {
    messagesWithBinder.unshift({
      role: 'system',
      content: `You have been given STUDENT MATERIALS CONTEXT. Treat these materials as primary references and cite them in a "Sources:" line.`
    });
    messagesWithBinder.unshift({
      role: 'system',
      content: `STUDENT MATERIALS CONTEXT:\n\n${learningContext}`
    });
  }

  // Add binder context instructions ONLY if context exists
  if (binderResult.hasContext && binderContext && binderContext.trim().length > 0) {
    // Add instruction about binder context
    messagesWithBinder.unshift({
      role: 'system',
      content: `You have been given excerpts from the student's uploaded files ("binder context"). Use the following binder excerpts as your primary reference. Mention the filenames you are using. Treat them as primary for this conversation. Use them as the main source of truth, mention which file(s) you used by filename and type, and do not invent content that obviously isn't supported by the excerpts.`
    });
    
    // Add the actual binder context
    messagesWithBinder.unshift({
      role: 'system',
      content: `BINDER CONTEXT:\n\n${binderContext}`
    });
  } else if (!learningContextResult.hasContext) {
    // No binder context or student materials available
    messagesWithBinder.unshift({
      role: 'system',
      content: `You currently have no student materials for this question. Answer using your general knowledge, and be explicit that you are not using the student's uploaded materials.`
    });
  }

  // Notes Mode behavior (when in notes mode with selected documents)
  if (effectiveMode === 'notes' && effectiveSelectedIds.length > 0) {
    systemPrompt += `
### 🗒 NOTES MODE BEHAVIOR

You are in **Notes Mode**.

Context Rules:
- You may ONLY use the student's selected class notes.
- Do NOT introduce textbook facts unless the student explicitly asks to compare.

Tone Rules:
- Teach from the student's perspective.
- Use language like:
  "In your notes, you wrote…"
  "Based on what you covered in class…"
- If information is missing or unclear, say so.

Conflict Rule:
- If notes are incomplete or inaccurate:
  - Gently flag it:
    "Your notes mention X. Would you like to compare this with standard NCLEX guidance?"

DO NOT:
- Hallucinate missing details
- Override the notes silently
- Introduce external facts without permission
`;
  }

  // Topic Context: Always include topic context when a topic is selected
  const effectiveTopicTitle = topicTitle || chatTopicTerm
  const effectiveClassName = className || selectedClassName
  
  if (effectiveTopicTitle) {
    if (isFirstAssistantReply) {
      // First reply: Include warm start with Snapshot
      systemPrompt += `
### TOPIC WARM START MODE

You are responding to the FIRST question in a study session for the topic: "${effectiveTopicTitle}"${effectiveClassName ? ` from ${effectiveClassName}` : ''}.

**CRITICAL: Your response MUST begin with a structured "Snapshot" section before continuing with normal tutoring.**

Begin your reply with this exact structure:

### Snapshot

[Provide a 1-2 sentence simple definition of the topic "${effectiveTopicTitle}". Make it clear and accessible.]

**What we'll cover:**
- Key priorities for this topic
- Key assessment findings
- Relevant medications/interventions
- Safety considerations and NCLEX themes

Then I'll walk you through it step-by-step and quiz you with NCLEX-style questions.

---

After the Snapshot section, continue with your normal tutoring style (step-by-step explanations, NCLEX-style questions, etc.). The Snapshot is ONLY for the first reply.
`;
    } else {
      // Subsequent replies: Always reference the topic context
      systemPrompt += `
### TOPIC CONTEXT MODE

You are in a study session focused on the topic: "${effectiveTopicTitle}"${effectiveClassName ? ` from ${effectiveClassName}` : ''}.

**CRITICAL INSTRUCTIONS:**
- ALL your responses must be contextualized within this topic: "${effectiveTopicTitle}"
- When answering questions, relate them back to this topic when relevant
- If the student asks about something outside this topic, acknowledge it but guide them back: "That's a great question! While we're focusing on ${effectiveTopicTitle}, let me address that and then relate it back to our topic..."
- Use the topic as the primary lens through which you teach and explain concepts
- When providing examples, prioritize examples related to "${effectiveTopicTitle}"
- If the student's question is directly about this topic, emphasize that you're teaching them about "${effectiveTopicTitle}" specifically

Remember: The student selected this topic because they want to study it. Keep your responses focused and relevant to "${effectiveTopicTitle}".
`;
    }
  }

  // Strict mode (optional)
  if (strictMode === true) {
    const { getStrictModePrompt } = await import('@/lib/ai/prompts');
    systemPrompt += '\n\n' + getStrictModePrompt();
  }

  // Formatting rules - Structured response takes precedence
  systemPrompt += `
FORMATTING RULES:
- Follow the Mode Overlay response structure exactly.
- Keep responses scannable with headings and short bullets.
- End with 1 guided follow-up question when appropriate.
- If student materials were provided, include a "Sources:" line with filenames.
`;

  const result = await streamText({
    model: openai('gpt-4o') as any,
    messages: messagesWithBinder,
    system: systemPrompt,
  });

  // Return response with file summaries in metadata for UI display
  const response = result.toAIStreamResponse();
  
  // Add file summaries to response headers for UI to display "Using your files" pill
  if (fileSummaries.length > 0 && binderContext && binderContext.trim().length > 0) {
    const fileNames = fileSummaries.map(f => f.filename).join(', ');
    response.headers.set('X-Binder-Files', fileNames);
  }

  return response;
}

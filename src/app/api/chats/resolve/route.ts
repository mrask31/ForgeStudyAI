import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

// Helper to validate UUID format
function isValidUUID(str: string): boolean {
  if (!str || typeof str !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Helper to compare arrays (order-independent)
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((val, idx) => val === sortedB[idx])
}

// Helper to format date for chat titles
function formatDateForTitle(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Helper to seed initial message for a chat
async function seedInitialMessage(
  supabase: ReturnType<typeof createServerClient>,
  chatId: string,
  content: string,
  role: 'assistant' | 'system' = 'assistant'
): Promise<void> {
  // Get current message count to set correct sequence_number
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('chat_id', chatId)
  
  const sequenceNumber = count || 0
  
  const { error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      role,
      content,
      sequence_number: sequenceNumber,
    })

  if (error) {
    console.error('[Resolve API] Failed to seed initial message:', error)
    console.error('[Resolve API] Error details:', JSON.stringify(error, null, 2))
    // Don't throw - chat creation succeeded, message seeding is best-effort
  } else {
    console.log('[Resolve API] Successfully seeded initial message with sequence_number:', sequenceNumber)
    console.log('[Resolve API] Message content preview:', content.substring(0, 100))
  }
}

// Helper to generate welcome message for a class
async function generateClassWelcomeMessage(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  classId: string,
  className?: string
): Promise<string> {
  try {
    // 1. Get last chat for this class to see what they were studying
    let lastTopic = null
    try {
      const { data: lastChat } = await supabase
        .from('chats')
        .select('id, title, updated_at')
        .eq('user_id', userId)
        .eq('metadata->>classId', classId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastChat) {
        // Get first user message from last chat
        const { data: firstMessage } = await supabase
          .from('messages')
          .select('content')
          .eq('chat_id', lastChat.id)
          .eq('role', 'user')
          .order('sequence_number', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (firstMessage?.content) {
          // Extract topic (first 100 chars, clean up)
          lastTopic = firstMessage.content.substring(0, 100).trim()
          if (lastTopic.length === 100) {
            lastTopic += '...'
          }
        }
      }
    } catch (error) {
      console.error('[Resolve API] Error fetching last chat:', error)
      // Continue without last topic
    }

    // 2. Fetch class materials
    const { data: chunkRows } = await supabase
      .from('documents')
      .select('id, file_key, metadata, document_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!chunkRows || chunkRows.length === 0) {
      let welcome = `Welcome back to ${className || 'your class'}! 👋\n\n`
      if (lastTopic) {
        welcome += `You were last studying: **${lastTopic}**\n\n`
        welcome += `💡 Want to continue where you left off? Check your **History** tab to open your last chat.\n\n`
      }
      welcome += `I'm ready to help you study. What would you like to learn about today?`
      return welcome
    }

    // Filter by class_id and group by file
    const classChunks = chunkRows.filter((row: any) => {
      return row.metadata?.class_id === classId && row.metadata?.is_active !== false
    })

    if (classChunks.length === 0) {
      let welcome = `Welcome back to ${className || 'your class'}! 👋\n\n`
      if (lastTopic) {
        welcome += `You were last studying: **${lastTopic}**\n\n`
        welcome += `💡 Want to continue where you left off? Check your **History** tab to open your last chat.\n\n`
      }
      welcome += `I'm ready to help you study. What would you like to learn about today?`
      return welcome
    }

    // Group by file_key to get unique files
    const filesByKey = new Map<string, { filename: string; document_type: string | null }>()
    for (const chunk of classChunks) {
      const key = chunk.file_key
      if (!key) continue
      const filename = chunk.metadata?.filename || 'Unknown'
      const docType = chunk.document_type || 'textbook'
      if (!filesByKey.has(key)) {
        filesByKey.set(key, { filename, document_type: docType })
      }
    }

    const files = Array.from(filesByKey.values())
    const syllabi = files.filter(f => f.document_type === 'syllabus')
    const textbooks = files.filter(f => f.document_type === 'textbook' || f.document_type === 'reference')

    // Pick a random textbook/material for topic suggestion (exclude syllabi)
    let topicSuggestion = null
    if (textbooks.length > 0) {
      const randomMaterial = textbooks[Math.floor(Math.random() * textbooks.length)]
      const filename = randomMaterial.filename || 'your materials'
      // Extract a topic from filename (remove extension, clean up)
      topicSuggestion = filename.replace(/\.(pdf|docx?|txt)$/i, '').replace(/[_-]/g, ' ')
    }

    // Build welcome message
    let welcome = `Welcome back to ${className || 'your class'}! 👋\n\n`
    
    // Add last study topic if available
    if (lastTopic) {
      welcome += `You were last studying: **${lastTopic}**\n\n`
      welcome += `💡 Want to continue where you left off? Check your **History** tab to open your last chat.\n\n`
    }
    
    // Add materials list
    if (files.length > 0) {
      welcome += `I have access to your study materials:\n\n`
      
      if (syllabi.length > 0) {
        welcome += `📋 **Syllabi (${syllabi.length}):**\n`
        syllabi.forEach(s => {
          welcome += `  • ${s.filename}\n`
        })
        welcome += `\n`
      }
      
      if (textbooks.length > 0) {
        welcome += `📚 **Textbooks & Readings (${textbooks.length}):**\n`
        textbooks.slice(0, 5).forEach(t => { // Limit to 5 for readability
          welcome += `  • ${t.filename}\n`
        })
        if (textbooks.length > 5) {
          welcome += `  • ...and ${textbooks.length - 5} more\n`
        }
        welcome += `\n`
      }
    }
    
    // Add random topic suggestion
    if (topicSuggestion) {
      welcome += `📚 **Suggested topic to explore:**\n`
      welcome += `"${topicSuggestion}"\n\n`
    }
    
    // Add study options
    welcome += `I can help you:\n`
    welcome += `  • Understand concepts from your materials\n`
    welcome += `  • Practice NCLEX-style questions\n`
    welcome += `  • Review key topics step-by-step\n`
    welcome += `  • Clarify anything you're unsure about\n\n`
    welcome += `What would you like to study today?`

    return welcome
  } catch (error) {
    console.error('[Resolve API] Error generating welcome message:', error)
    return `Welcome to ${className || 'your class'}! 👋\n\nI'm ready to help you study. What would you like to learn about today?`
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}))
    const intent = body.intent as string
    const reflectionText = body.reflectionText as string | undefined
    const snapshotText = body.snapshotText as string | undefined
    const userMessage = body.userMessage as string | undefined
    // For 'new_notes' intent: accepts body.noteIds OR body.selectedNoteIds as string[] (array of UUID strings)
    // Support both field names for backward compatibility
    // Example: { intent: 'new_notes', noteIds: ['uuid1', 'uuid2'] } OR { intent: 'new_notes', selectedNoteIds: ['uuid1', 'uuid2'] }
    const selectedNoteIds = (body.noteIds || body.selectedNoteIds || []) as string[]
    // For attached files: accepts body.attachedFileIds as string[] (array of UUID strings)
    // Example: { intent: 'new_question', attachedFileIds: ['uuid1', 'uuid2'] }
    const attachedFileIds = (body.attachedFileIds || []) as string[]
    // For class/topic context
    const classId = body.classId as string | undefined
    const topicId = body.topicId as string | undefined

    console.log('[Resolve API] POST request:', { intent, hasReflection: !!reflectionText, hasSnapshot: !!snapshotText, noteIdsCount: selectedNoteIds.length })

    // 3. Handle different intents
    if (intent === 'resume_last') {
      // Find most recent non-archived chat (any session_type)
      const { data: lastChat } = await supabase
        .from('chats')
        .select('id, title, session_type, mode')
        .eq('user_id', user.id)
        .eq('is_archived', false) // Only non-archived chats
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastChat) {
        console.log('[Resolve API] Found last chat:', { id: lastChat.id, session_type: lastChat.session_type, title: lastChat.title })
        return NextResponse.json({
          chatId: lastChat.id,
          session_type: lastChat.session_type || 'general',
          title: lastChat.title,
          mode: lastChat.mode || 'tutor',
        })
      } else {
        console.log('[Resolve API] No chats found for resume_last')
        return NextResponse.json({
          chatId: null,
          session_type: null,
          title: null,
          mode: 'tutor',
          requiresEmptyState: true,
        })
      }
    }

    if (intent === 'new_reflection') {
      // Generate default title if no reflectionText provided
      const title = `Reflection — ${formatDateForTitle()}`
      
      // Default system prompt if no reflectionText provided
      const defaultPrompt = reflectionText || "Let's process your recent clinical experiences. What would you like to reflect on today?"
      
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          mode: 'tutor',
          session_type: 'reflection',
          title,
        })
        .select()
        .single()

      if (createError) {
        console.error('[Resolve API] Create reflection chat error:', createError)
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
      }

      // Seed initial assistant message (use provided text or default prompt)
      await seedInitialMessage(supabase, newChat.id, defaultPrompt, 'assistant')

      return NextResponse.json({
        chatId: newChat.id,
        session_type: 'reflection',
        title: newChat.title,
        mode: 'tutor',
      })
    }

    if (intent === 'new_snapshot') {
      // Generate default title
      let title = `Snapshot — ${formatDateForTitle()}`
      
      // If snapshotText provided, extract case title from it
      if (snapshotText) {
        const caseTitle = snapshotText.split('\n')[0].slice(0, 30) || 'Clinical Case'
        title = `Snapshot — ${caseTitle}`
      }

      // Default scenario prompt if no snapshotText provided
      const defaultPrompt = snapshotText || "Let's work through a clinical scenario step-by-step. I'll present a case, and we'll work through it together."

      // Store attachedFileIds in metadata if provided
      const metadata = attachedFileIds.length > 0 ? { attachedFileIds } : null

      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          mode: 'tutor',
          session_type: 'snapshot',
          title,
          metadata: metadata || {},
        })
        .select()
        .single()

      if (createError) {
        console.error('[Resolve API] Create snapshot chat error:', createError)
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
      }

      // Seed initial assistant message (use provided text or default prompt)
      await seedInitialMessage(supabase, newChat.id, defaultPrompt, 'assistant')

      return NextResponse.json({
        chatId: newChat.id,
        session_type: 'snapshot',
        title: newChat.title,
        mode: 'tutor',
      })
    }


    if (intent === 'new_question') {
      const title = `Clinical Question — ${formatDateForTitle()}`

      // Build metadata object with attachedFileIds, classId, and topicId
      const metadata: any = {}
      if (attachedFileIds.length > 0) {
        metadata.attachedFileIds = attachedFileIds
      }
      if (classId) {
        metadata.classId = classId
      }
      if (topicId) {
        metadata.topicId = topicId
        // Also store as topicTerm for backward compatibility
        metadata.topicTerm = topicId
      }

      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          mode: 'tutor',
          session_type: 'question',
          title,
          metadata: Object.keys(metadata).length > 0 ? metadata : {},
        })
        .select()
        .single()

      if (createError) {
        console.error('[Resolve API] Create question chat error:', createError)
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
      }

      // If classId is provided, generate and seed a welcome message
      if (classId) {
        try {
          // Fetch class name for welcome message
          let className: string | undefined
          try {
            const { data: classData, error: classError } = await supabase
              .from('student_classes')
              .select('code, name')
              .eq('id', classId)
              .eq('user_id', user.id)
              .single()
            
            if (classError) {
              console.warn('[Resolve API] Could not fetch class name:', classError.message)
            } else if (classData) {
              className = `${classData.code} — ${classData.name}`
            }
          } catch (classFetchError) {
            console.warn('[Resolve API] Error fetching class name (non-fatal):', classFetchError)
            // Continue without class name - welcome message will use fallback
          }

          // Generate welcome message with error handling
          let welcomeMessage: string
          try {
            welcomeMessage = await generateClassWelcomeMessage(
              supabase,
              user.id,
              classId,
              className
            )
          } catch (welcomeGenError) {
            console.error('[Resolve API] Error generating welcome message content:', welcomeGenError)
            // Fallback to simple welcome message
            welcomeMessage = `Welcome to ${className || 'your class'}! 👋\n\nI'm ready to help you study. What would you like to learn about today?`
          }
          
          // Seed the welcome message as the first assistant message
          try {
            console.log('[Resolve API] About to seed welcome message for chat:', newChat.id, 'classId:', classId)
            await seedInitialMessage(supabase, newChat.id, welcomeMessage, 'assistant')
            console.log('[Resolve API] Seeded welcome message for class:', classId)
            console.log('[Resolve API] Welcome message content (first 100 chars):', welcomeMessage.substring(0, 100))
            
            // Verify the message was saved and wait a moment for DB commit
            try {
              // Small delay to ensure DB commit
              await new Promise(resolve => setTimeout(resolve, 100))
              
              const { data: savedMessage } = await supabase
                .from('messages')
                .select('id, role, content, sequence_number')
                .eq('chat_id', newChat.id)
                .order('sequence_number', { ascending: true })
                .limit(1)
                .maybeSingle()
              
              if (savedMessage) {
                console.log('[Resolve API] Verified welcome message saved:', {
                  id: savedMessage.id,
                  role: savedMessage.role,
                  sequence_number: savedMessage.sequence_number,
                  contentLength: savedMessage.content?.length
                })
              } else {
                console.warn('[Resolve API] WARNING: Welcome message may not have been saved! Retrying...')
                // Retry once after a longer delay
                await new Promise(resolve => setTimeout(resolve, 200))
                const { data: retryMessage } = await supabase
                  .from('messages')
                  .select('id, role, content, sequence_number')
                  .eq('chat_id', newChat.id)
                  .order('sequence_number', { ascending: true })
                  .limit(1)
                  .maybeSingle()
                if (retryMessage) {
                  console.log('[Resolve API] Welcome message found on retry')
                } else {
                  console.error('[Resolve API] Welcome message not found after retry - may need to check DB')
                }
              }
            } catch (verifyError) {
              console.warn('[Resolve API] Could not verify welcome message (non-fatal):', verifyError)
              // Don't fail - message might still be saved
            }
          } catch (seedError) {
            console.error('[Resolve API] Error seeding welcome message (non-fatal):', seedError)
            // Don't fail the chat creation - user can still use the chat
          }
          
          // Small delay to ensure welcome message is committed to DB before returning
          // This helps prevent race conditions when the client loads history immediately
          await new Promise(resolve => setTimeout(resolve, 150))
        } catch (welcomeError) {
          console.error('[Resolve API] Unexpected error in welcome message flow (non-fatal):', welcomeError)
          // Don't fail the chat creation if welcome message fails - chat is still usable
        }
      }

      return NextResponse.json({
        chatId: newChat.id,
        session_type: 'question',
        title: newChat.title,
        mode: 'tutor',
      })
    }

    if (intent === 'new_notes') {
      console.log('[Resolve API] new_notes intent received:', { 
        selectedNoteIdsCount: selectedNoteIds.length,
        selectedNoteIds: selectedNoteIds,
        bodyKeys: Object.keys(body)
      })
      
      if (selectedNoteIds.length === 0) {
        console.error('[Resolve API] new_notes: No noteIds provided in request body')
        return NextResponse.json({ error: 'noteIds is required for new_notes' }, { status: 400 })
      }

      // Validate UUIDs
      const validNoteIds = selectedNoteIds.filter(id => isValidUUID(id))
      
      console.log('[Resolve API] new_notes: UUID validation:', {
        originalCount: selectedNoteIds.length,
        validCount: validNoteIds.length,
        invalidIds: selectedNoteIds.filter(id => !isValidUUID(id))
      })
      if (validNoteIds.length === 0) {
        return NextResponse.json({ error: 'Invalid note IDs provided' }, { status: 400 })
      }

      // Get filename for title
      let chatTitle = `Notes Study Session`
      if (validNoteIds.length > 0) {
        try {
          const { data: firstDoc } = await supabase
            .from('documents')
            .select('metadata')
            .eq('id', validNoteIds[0])
            .eq('user_id', user.id)
            .single()
          
          if (firstDoc?.metadata?.filename) {
            chatTitle = `Notes Session — ${firstDoc.metadata.filename}`
          } else if (validNoteIds.length > 1) {
            chatTitle = `Notes Session — ${validNoteIds.length} notes`
          }
        } catch (error) {
          // Fallback to default
        }
      }

      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          mode: 'notes',
          session_type: 'notes',
          selected_note_ids: validNoteIds,
          title: chatTitle,
        })
        .select()
        .single()

      if (createError) {
        console.error('[Resolve API] Create notes chat error:', createError)
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
      }

      return NextResponse.json({
        chatId: newChat.id,
        session_type: 'notes',
        title: newChat.title,
        mode: 'notes',
        selectedNoteIds: validNoteIds,
      })
    }

    return NextResponse.json({ error: 'Invalid intent' }, { status: 400 })
  } catch (error: any) {
    console.error('[Resolve] Critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse query params
    const { searchParams } = new URL(req.url)
    const chatIdParam = searchParams.get('id')
    const mode = searchParams.get('mode') || 'tutor'
    const noteIdsParam = searchParams.get('notes') || searchParams.get('note')
    const rawNoteIds = noteIdsParam ? noteIdsParam.split(',').filter(Boolean) : []
    
    // CRITICAL: Validate and filter to only valid UUIDs
    // Discard any invalid values (numeric IDs, indices, etc.)
    const selectedNoteIds = rawNoteIds.filter(id => {
      const isValid = isValidUUID(id)
      if (!isValid && id) {
        console.error('[Resolve API] Invalid note ID detected:', {
          id,
          type: typeof id,
          length: id.length,
          isNumeric: !isNaN(Number(id))
        })
      }
      return isValid
    })
    
    // If we had IDs but none were valid UUIDs, return error with details
    if (rawNoteIds.length > 0 && selectedNoteIds.length === 0) {
      console.error('[Resolve API] All note IDs were invalid:', {
        rawNoteIds,
        invalidCount: rawNoteIds.length,
        sampleInvalid: rawNoteIds.slice(0, 3)
      })
      return NextResponse.json({ 
        error: 'Invalid note IDs. Expected UUIDs but received invalid values (possibly numeric IDs or indices).',
        requiresPicker: true,
        invalidIds: rawNoteIds
      }, { status: 400 })
    }
    
    // If some IDs were invalid, log warning but proceed with valid ones
    if (rawNoteIds.length > selectedNoteIds.length) {
      const invalidIds = rawNoteIds.filter(id => !isValidUUID(id))
      console.warn('[Resolve API] Some note IDs were invalid, using only valid UUIDs:', {
        totalProvided: rawNoteIds.length,
        validCount: selectedNoteIds.length,
        invalidIds
      })
    }
    
    console.log('[Resolve API] Request params:', {
      mode,
      rawNoteIdsLength: rawNoteIds.length,
      validNoteIdsLength: selectedNoteIds.length,
      selectedNoteIds,
      invalidIds: rawNoteIds.filter(id => !isValidUUID(id)),
      chatIdParam,
      branch: mode === 'notes' && selectedNoteIds.length > 0 ? 'NOTES MODE BRANCH' : 'TUTOR MODE BRANCH'
    })
    
    // If explicit chatId provided, verify it matches the requested mode
    if (chatIdParam) {
      const { data: chat } = await supabase
        .from('chats')
        .select('id, mode, selected_note_ids')
        .eq('id', chatIdParam)
        .eq('user_id', user.id)
        .single()
      
      if (chat) {
        // If Notes Mode is requested, verify the chat is actually a notes chat
        if (mode === 'notes' && chat.mode !== 'notes') {
          // Chat exists but is not a notes chat - ignore it and proceed with Notes Mode resolution
          // This ensures Notes Mode always takes priority
          console.log('[Resolve API] Ignoring tutor chat, proceeding with Notes Mode resolution')
        } else {
          // Chat matches requested mode, return it
          console.log('[Resolve API] Returning existing chat:', { chatId: chat.id, mode: chat.mode })
          return NextResponse.json({
            chatId: chat.id,
            mode: chat.mode,
            selectedNoteIds: (chat.selected_note_ids || []) as string[],
          })
        }
      }
    }

    // 3. Handle Notes Mode
    // This endpoint supports URL-based bootstrap: /tutor?mode=notes&note=<id>
    // When notes are provided in URL params, create or resolve the session.
    // Only return requiresPicker if no notes are in URL params.
    if (mode === 'notes') {
      console.log('[Resolve API] NOTES MODE BRANCH - selectedNoteIds:', selectedNoteIds)
      
      // CRITICAL: If no valid UUIDs provided, return error (NEVER fall back to tutor chat)
      if (selectedNoteIds.length === 0) {
        if (rawNoteIds.length > 0) {
          // Had IDs but all were invalid
          console.error('[Resolve API] Notes Mode requested but all IDs were invalid:', rawNoteIds)
          return NextResponse.json({ 
            error: 'Invalid note IDs provided. Expected UUIDs but received invalid values.',
            requiresPicker: true 
          }, { status: 400 })
        } else {
          // No IDs provided at all
          return NextResponse.json({ error: 'No notes selected', requiresPicker: true }, { status: 400 })
        }
      }

      // Find existing chat with same note set
      const { data: existingChats } = await supabase
        .from('chats')
        .select('id, title, selected_note_ids, created_at')
        .eq('user_id', user.id)
        .eq('mode', 'notes')
        .order('updated_at', { ascending: false })
        .limit(10)

      console.log('[Resolve API] Found', existingChats?.length || 0, 'existing notes chats')

      // Find chat with matching note IDs (order-independent)
      const matchingChat = existingChats?.find(chat => {
        const chatNoteIds = (chat.selected_note_ids || []) as string[]
        const matches = arraysEqual(chatNoteIds, selectedNoteIds)
        if (matches) {
          console.log('[Resolve API] Found matching notes chat:', chat.id)
        }
        return matches
      })

      if (matchingChat) {
        console.log('[Resolve API] Returning existing notes chat:', matchingChat.id)
        return NextResponse.json({
          chatId: matchingChat.id,
          mode: 'notes',
          selectedNoteIds: matchingChat.selected_note_ids,
        })
      }

      // Get filename for title (use first note's filename if available)
      let chatTitle = `Notes Study Session`
      if (selectedNoteIds.length > 0) {
        try {
          const { data: firstDoc } = await supabase
            .from('documents')
            .select('metadata')
            .eq('id', selectedNoteIds[0])
            .eq('user_id', user.id)
            .single()
          
          if (firstDoc?.metadata?.filename) {
            chatTitle = `Notes: ${firstDoc.metadata.filename}`
          } else if (selectedNoteIds.length === 1) {
            chatTitle = `Notes Study Session`
          } else {
            chatTitle = `Notes Study Session (${selectedNoteIds.length} notes)`
          }
        } catch (error) {
          // Fallback to default title
          chatTitle = selectedNoteIds.length === 1 
            ? `Notes Study Session`
            : `Notes Study Session (${selectedNoteIds.length} notes)`
        }
      }
      
      console.log('[Resolve API] Creating new notes chat with title:', chatTitle)
      
      // Create new notes-scoped chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          mode: 'notes',
          selected_note_ids: selectedNoteIds,
          title: chatTitle,
        })
        .select()
        .single()

      if (createError) {
        console.error('[Resolve API] Create chat error:', createError)
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
      }

      console.log('[Resolve API] Created new notes chat:', newChat.id)
      return NextResponse.json({
        chatId: newChat.id,
        mode: 'notes',
        selectedNoteIds: newChat.selected_note_ids,
      })
    }

    // 4. Handle Tutor Mode (default)
    // Load most recent tutor chat
    console.log('[Resolve API] TUTOR MODE BRANCH - loading most recent tutor chat')
    const { data: lastTutorChat } = await supabase
      .from('chats')
      .select('id, title')
      .eq('user_id', user.id)
      .eq('mode', 'tutor')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log('[Resolve API] Returning tutor chat:', lastTutorChat?.id || null)
    return NextResponse.json({
      chatId: lastTutorChat?.id || null,
      mode: 'tutor',
      selectedNoteIds: null,
    })
  } catch (error: any) {
    console.error('[Resolve] Critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


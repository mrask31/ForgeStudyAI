import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

type SupabaseServerClient = ReturnType<typeof createServerClient>

// Helper to generate deterministic message_id
function generateMessageId(chatId: string | null, content: string): string {
  const crypto = require('crypto')
  const hash = crypto.createHash('sha256')
  hash.update((chatId || '') + content)
  return hash.digest('hex')
}

// Helper to retrieve binder context (respecting Notes Mode)
async function retrieveBinderContextForMap(
  messageContent: string,
  userId: string,
  supabase: SupabaseServerClient,
  mode: 'notes' | 'reference' | 'mixed' = 'mixed',
  selectedDocIds: string[] = []
): Promise<string> {
  try {
    // Use OpenAI embeddings API directly
    const openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Generate embedding
    const embeddingResponse = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: messageContent,
    })

    const queryEmbedding = embeddingResponse.data?.[0]?.embedding as number[]
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      return ''
    }

    const match_threshold = 0.1
    const match_count = 8
    const filterDocumentType = mode === 'notes' ? 'note' : mode === 'reference' ? 'reference' : null

    // Call match_documents RPC
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold,
      match_count,
      user_id_filter: userId,
      filter_active: true,
      filter_document_type: filterDocumentType,
    })

    if (error) {
      console.error('[ForgeMap] RAG error:', error)
      return ''
    }

    // Filter by selectedDocIds if in notes mode
    let documents = (data || []) as any[]
    if (mode === 'notes' && selectedDocIds.length > 0) {
      documents = documents.filter((doc: any) => {
        const docId = doc.id || doc.document_id
        return selectedDocIds.includes(docId)
      })
    }

    if (documents.length === 0) {
      return ''
    }

    // Format context
    const contextSections = documents
      .map((doc: any, index: number) => {
        const filename = doc?.metadata?.filename || doc?.metadata?.name || 'Unknown document'
        const content = doc?.content || ''
        return `[${index + 1}] From "${filename}":\n${content}`.trim()
      })
      .filter(Boolean)
      .join('\n\n')

    return contextSections ? `RELEVANT CONTEXT FROM USER FILES:\n\n${contextSections}` : ''
  } catch (error: any) {
    console.error('[ForgeMap] Context retrieval error:', error)
    return ''
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
    const body = await req.json()
    const {
      messageContent,
      chatId,
      mode = 'mixed',
      selectedDocIds = [],
      mapType = 'topic',
    } = body

    if (!messageContent) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // 3. Generate deterministic message_id
    const messageId = generateMessageId(chatId, messageContent)

    // 4. Check if map already exists
    const { data: existingMap, error: existingMapError } = await supabase
      .from('maps')
      .select('*')
      .eq('user_id', user.id)
      .eq('message_id', messageId)
      .maybeSingle()

    if (existingMapError && existingMapError.code !== 'PGRST205') {
      console.warn('[ForgeMap] Existing map lookup error:', existingMapError)
    }

    if (existingMap) {
      return NextResponse.json({ map: existingMap })
    }

    // 5. Retrieve binder context (respecting Notes Mode)
    let binderContext = ''
    if (mode === 'notes' && selectedDocIds.length > 0) {
      binderContext = await retrieveBinderContextForMap(messageContent, user.id, supabase, mode, selectedDocIds)
    } else if (mode !== 'notes') {
      binderContext = await retrieveBinderContextForMap(messageContent, user.id, supabase, mode, [])
    }

    // 6. Generate concept map using AI
    const baseContext = `${binderContext ? `\n${binderContext}\n` : ''}\nMessage Content:\n${messageContent}\n`

    let mapPrompt = `You are a learning coach. Generate a structured Concept Map from the following message content.

${baseContext}

Generate a concept map using ONLY these Markdown headers (use all that apply):
### 🔗 Cause → Effect
### ⚠️ Risks / Complications
### 🧭 Priorities (ABCs)
### ✅ Action Steps
### 📈 Monitoring
### ✅ Why This Matters

Rules:
- Be concise and student friendly
- Focus on relationships and reasoning
- Use bullet points under each header
- Do NOT include headers that don't apply
- Keep each section to 3-5 key points max`

    if (mapType === 'confusion') {
      mapPrompt = `You are a learning coach. The student is confused and needs a reset.

${baseContext}

Create a very small concept map with EXACTLY 3 nodes (no more), in this format:
### Map
- Node 1
- Node 2
- Node 3

Then include a single clarifying question on its own line in this format:
Clarifying question: <question>

Rules:
- Keep nodes short (3-6 words each)
- Make the clarifying question answerable in one sentence`
    }

    if (mapType === 'instant') {
      mapPrompt = `You are a study coach. Create an Instant Study Map that turns content into a plan.

${baseContext}

Use ONLY these headers (include all that apply):
### What this is about
### Key concepts
### Dependencies (learn these first)
### Start here (first 3 steps)
### Why it matters

Rules:
- Use bullet points under each header
- Keep each section to 3-5 bullets max
- Keep language simple and scannable`
    }

    // Type assertion needed due to dependency version mismatch:
    // The 'ai' package has its own nested @ai-sdk/provider dependency that TypeScript sees as
    // incompatible with the root @ai-sdk/provider used by @ai-sdk/openai, even though they're
    // functionally compatible at runtime. This is a known issue with nested dependencies.
    const { text: mapMarkdownRaw } = await generateText({
      // @ts-expect-error - Version mismatch between root @ai-sdk/provider and ai's nested @ai-sdk/provider
      model: openai('gpt-4o-mini'),
      prompt: mapPrompt,
      temperature: 0.3,
    })

    let mapMarkdown = mapMarkdownRaw
    let clarifyingQuestion: string | null = null
    if (mapType === 'confusion') {
      const questionMatch = mapMarkdownRaw.match(/Clarifying question:\s*(.+)$/im)
      if (questionMatch) {
        clarifyingQuestion = questionMatch[1].trim()
        mapMarkdown = mapMarkdownRaw.replace(questionMatch[0], '').trim()
      }
    }

    // 7. Save map to database
    const { data: map, error: insertError } = await supabase
      .from('maps')
      .insert({
        user_id: user.id,
        chat_id: chatId || null,
        message_id: messageId,
        map_markdown: mapMarkdown,
        mode,
        selected_doc_ids: Array.isArray(selectedDocIds) ? selectedDocIds : [],
      })
      .select()
      .single()

    if (insertError) {
      console.error('[ForgeMap] Save error:', insertError)
      return NextResponse.json({
        map: {
          map_markdown: mapMarkdown,
          clarifying_question: clarifyingQuestion,
        },
        warning: 'Map generated but could not be saved.',
      })
    }

    return NextResponse.json({ map, clarifyingQuestion })
  } catch (error: any) {
    console.error('[ForgeMap] Critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


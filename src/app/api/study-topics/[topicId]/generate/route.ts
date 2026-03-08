import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'
import { getStudyGuidePrompt } from '@/lib/ai/prompts'

export const runtime = 'nodejs'

// Lazy-initialize Anthropic client
let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return anthropicClient
}

export async function POST(req: Request, { params }: { params: { topicId: string } }) {
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
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: topic, error: topicError } = await supabase
      .from('study_topics')
      .select('id, title, profile_id, grade_band')
      .eq('id', params.topicId)
      .single()

    if (topicError || !topic) {
      return NextResponse.json({ error: 'Study topic not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('student_profiles')
      .select('id, owner_id, grade_band, grade')
      .eq('id', topic.profile_id)
      .eq('owner_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Study topic not found' }, { status: 404 })
    }

    const { data: items, error: itemsError } = await supabase
      .from('study_topic_items')
      .select('item_type, source_text, created_at')
      .eq('topic_id', params.topicId)
      .order('created_at', { ascending: true })

    if (itemsError) {
      console.error('[Study Topics API] Failed to load items:', itemsError)
      return NextResponse.json({ error: 'Failed to load study topic items' }, { status: 500 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Add items before generating a study guide.' }, { status: 400 })
    }

    const compiledItems = items
      .map((item: any, index: number) => {
        const label = item.item_type || 'item'
        return `Item ${index + 1} (${label}):\n${item.source_text}`.trim()
      })
      .join('\n\n')

    const prompt = getStudyGuidePrompt({
      title: topic.title,
      itemsText: compiledItems,
      gradeBand: profile.grade_band,
      grade: profile.grade || null,
    })

    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    })

    const guideMarkdown = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({
      guide: {
        topicId: topic.id,
        title: topic.title,
        markdown: guideMarkdown,
      },
    })
  } catch (error: any) {
    console.error('[Study Topics API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

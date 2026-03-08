import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'
import { getExamSheetPrompt } from '@/lib/ai/prompts'

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

    const body = await req.json()
    const { messageContent, topic, profileId, chatId, messageId } = body
    if (!messageContent) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 })
    }

    let gradeBand: 'middle' | 'high' | undefined
    let grade: string | null = null
    if (profileId) {
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('grade_band, grade')
        .eq('id', profileId)
        .eq('owner_id', user.id)
        .single()
      gradeBand = profile?.grade_band === 'elementary' ? 'middle' : profile?.grade_band || undefined
      grade = profile?.grade || null
    }

    const prompt = getExamSheetPrompt({
      content: messageContent,
      gradeBand,
      grade,
    })

    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    })

    const sheetMarkdown = response.content[0].type === 'text' ? response.content[0].text : ''

    const { data: examSheet, error: insertError } = await supabase
      .from('exam_sheets')
      .insert({
        user_id: user.id,
        profile_id: profileId || null,
        chat_id: chatId || null,
        message_id: messageId || null,
        topic: topic || null,
        sheet_markdown: sheetMarkdown,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save exam sheet' }, { status: 500 })
    }

    return NextResponse.json({ examSheet })
  } catch (error: any) {
    console.error('[Exam Sheet] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

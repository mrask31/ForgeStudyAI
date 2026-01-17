import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { getExamSheetPrompt } from '@/lib/ai/prompts'

export const runtime = 'nodejs'

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

    let gradeBand: 'elementary' | 'middle' | 'high' | undefined
    let grade: string | null = null
    if (profileId) {
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('grade_band, grade')
        .eq('id', profileId)
        .eq('owner_id', user.id)
        .single()
      gradeBand = profile?.grade_band || undefined
      grade = profile?.grade || null
    }

    const prompt = getExamSheetPrompt({
      content: messageContent,
      gradeBand,
      grade,
    })

    const { text: sheetMarkdown } = await generateText({
      // @ts-expect-error - ai SDK provider mismatch
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    })

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

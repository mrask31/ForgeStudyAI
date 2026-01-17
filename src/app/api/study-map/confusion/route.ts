import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { getConfusionMapPrompt } from '@/lib/ai/prompts'

export const runtime = 'nodejs'

const parseClarifyingQuestion = (markdown: string) => {
  const match = markdown.match(/Clarifying question:\s*(.+)$/im)
  if (!match) return { mapMarkdown: markdown.trim(), clarifyingQuestion: null }
  return {
    mapMarkdown: markdown.replace(match[0], '').trim(),
    clarifyingQuestion: match[1].trim(),
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
    const { messageContent, profileId, chatId, messageId } = body
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

    const prompt = getConfusionMapPrompt({
      content: messageContent,
      gradeBand,
      grade,
    })

    const { text: rawMarkdown } = await generateText({
      // @ts-expect-error - ai SDK provider mismatch
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    })

    const { mapMarkdown, clarifyingQuestion } = parseClarifyingQuestion(rawMarkdown)

    const { data: map, error: mapError } = await supabase
      .from('study_maps')
      .insert({
        user_id: user.id,
        profile_id: profileId || null,
        chat_id: chatId || null,
        message_id: messageId || null,
        map_type: 'confusion',
        map_markdown: mapMarkdown,
        clarifying_question: clarifyingQuestion,
      })
      .select()
      .single()

    if (mapError) {
      return NextResponse.json({ error: 'Failed to save confusion map' }, { status: 500 })
    }

    return NextResponse.json({ map, clarifyingQuestion })
  } catch (error: any) {
    console.error('[StudyMap Confusion] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

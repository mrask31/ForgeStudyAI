import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { getPracticeLadderPrompt } from '@/lib/ai/prompts'

export const runtime = 'nodejs'

const parseJson = (text: string) => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
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

    const prompt = getPracticeLadderPrompt({
      content: messageContent,
      gradeBand,
      grade,
    })

    const { text } = await generateText({
      // @ts-expect-error - ai SDK provider mismatch
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    })

    const parsed = parseJson(text)
    if (!parsed) {
      return NextResponse.json({ error: 'Failed to parse practice ladder' }, { status: 500 })
    }

    const { title, levels } = parsed
    const { data: practiceSet, error: insertError } = await supabase
      .from('practice_sets')
      .insert({
        user_id: user.id,
        profile_id: profileId || null,
        chat_id: chatId || null,
        message_id: messageId || null,
        title: title || 'Practice Ladder',
        level_count: Array.isArray(levels) ? levels.length : 0,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save practice set' }, { status: 500 })
    }

    const items = Array.isArray(levels) ? levels : []
    const insertItems: any[] = []
    for (const level of items) {
      const levelIndex = Number(level.level || 1)
      const prompts = Array.isArray(level.items) ? level.items : []
      for (const promptItem of prompts) {
        insertItems.push({
          set_id: practiceSet.id,
          level: levelIndex,
          prompt: String(promptItem),
          item_type: String(level.label || 'Practice'),
        })
      }
    }
    if (insertItems.length > 0) {
      await supabase.from('practice_items').insert(insertItems)
    }

    return NextResponse.json({ practiceSet, levels })
  } catch (error: any) {
    console.error('[Practice Ladder] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

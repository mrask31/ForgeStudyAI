import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { extractTextFromBuffer, fetchStorageFile } from '@/lib/server/extractText'
import { getHomeworkExtractPrompt } from '@/lib/ai/prompts'

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
    const { sourceItemIds = [], profileId } = body
    if (!Array.isArray(sourceItemIds) || sourceItemIds.length === 0) {
      return NextResponse.json({ error: 'No items selected' }, { status: 400 })
    }

    const { data: items, error } = await supabase
      .from('learning_source_items')
      .select('id, source_id, extracted_text, file_url, mime_type, original_filename, learning_sources!inner(user_id, title)')
      .in('id', sourceItemIds)
      .eq('learning_sources.user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to load items' }, { status: 500 })
    }

    let combinedText = ''
    for (const item of items || []) {
      if (!item.extracted_text && item.file_url) {
        const { buffer, mimeType } = await fetchStorageFile(supabase, item.file_url)
        const extracted = await extractTextFromBuffer(buffer, mimeType || item.mime_type)
        if (extracted) {
          await supabase
            .from('learning_source_items')
            .update({ extracted_text: extracted })
            .eq('id', item.id)
          item.extracted_text = extracted
        }
      }
      if (item.extracted_text) {
        combinedText += `\n\n${item.extracted_text}`
      }
    }

    if (!combinedText.trim()) {
      return NextResponse.json({ error: 'No text extracted' }, { status: 400 })
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

    const prompt = getHomeworkExtractPrompt({
      content: combinedText.slice(0, 8000),
      gradeBand,
      grade,
    })

    const { text } = await generateText({
      // @ts-expect-error - ai SDK provider mismatch
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.2,
    })

    const parsed = parseJson(text)
    if (!parsed) {
      return NextResponse.json({ error: 'Failed to parse homework tasks' }, { status: 500 })
    }

    const { title, tasks } = parsed
    const { data: plan, error: planError } = await supabase
      .from('homework_plans')
      .insert({
        user_id: user.id,
        profile_id: profileId || null,
        source_id: items?.[0]?.source_id || null,
        title: title || 'Homework Plan',
        extracted_text: combinedText.slice(0, 12000),
      })
      .select()
      .single()

    if (planError) {
      return NextResponse.json({ error: 'Failed to save homework plan' }, { status: 500 })
    }

    const insertTasks: any[] = []
    if (Array.isArray(tasks)) {
      for (const task of tasks) {
        insertTasks.push({
          plan_id: plan.id,
          title: String(task.title || 'Task'),
          due_date: task.due_date || null,
          estimated_minutes: task.estimated_minutes || null,
          priority: task.priority || 2,
        })
      }
    }

    if (insertTasks.length > 0) {
      await supabase.from('homework_tasks').insert(insertTasks)
    }

    return NextResponse.json({ plan, tasks: insertTasks })
  } catch (error: any) {
    console.error('[Homework Extract] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

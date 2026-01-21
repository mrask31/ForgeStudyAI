import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { extractTextFromBuffer, fetchStorageFile } from '@/lib/server/extractText'
import { getInstantStudyMapPrompt } from '@/lib/ai/prompts'

export const runtime = 'nodejs'

type SourceItem = {
  id: string
  source_id: string
  extracted_text: string | null
  file_url: string | null
  mime_type: string | null
  original_filename: string | null
}

const buildNodesFromMarkdown = (markdown: string) => {
  const nodes: Array<{ label: string; node_type: string; order_index: number }> = []
  const lines = markdown.split('\n')
  let currentHeader = 'Map'
  let index = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('### ')) {
      currentHeader = trimmed.replace('### ', '').trim()
      continue
    }
    if (trimmed.startsWith('-')) {
      const label = trimmed.replace(/^-+\s*/, '').trim()
      if (label) {
        nodes.push({ label, node_type: currentHeader, order_index: index })
        index += 1
      }
    }
  }
  return nodes
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
    const { sourceItemIds = [], text = '', title, profileId } = body

    let combinedText = String(text || '').trim()
    let sourceId: string | null = null

    if (sourceItemIds.length > 0) {
      const { data: items, error } = await supabase
        .from('learning_source_items')
        .select('id, source_id, extracted_text, file_url, mime_type, original_filename')
        .in('id', sourceItemIds)

      if (error) {
        return NextResponse.json({ error: 'Failed to load source items' }, { status: 500 })
      }

      const uniqueSourceIds = new Set(items?.map((item: SourceItem) => item.source_id))
      sourceId = uniqueSourceIds.size === 1 ? Array.from(uniqueSourceIds)[0] : null

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
    }

    if (!combinedText.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
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

    const prompt = getInstantStudyMapPrompt({
      content: combinedText.slice(0, 8000),
      gradeBand,
      grade,
    })

    const { text: mapMarkdown } = await generateText({
      // @ts-expect-error - ai SDK provider mismatch
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    })

    const { data: map, error: mapError } = await supabase
      .from('study_maps')
      .insert({
        user_id: user.id,
        profile_id: profileId || null,
        source_id: sourceId,
        map_type: 'instant',
        title: title || null,
        map_markdown: mapMarkdown,
      })
      .select()
      .single()

    if (mapError) {
      return NextResponse.json({ error: 'Failed to save study map' }, { status: 500 })
    }

    const nodes = buildNodesFromMarkdown(mapMarkdown)
    if (nodes.length > 0) {
      await supabase.from('study_map_nodes').insert(
        nodes.map((node) => ({
          map_id: map.id,
          label: node.label,
          node_type: node.node_type,
          order_index: node.order_index,
        }))
      )
    }

    return NextResponse.json({ map, nodes })
  } catch (error: any) {
    console.error('[StudyMap Instant] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

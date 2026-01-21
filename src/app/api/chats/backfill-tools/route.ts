import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TOOL_KEYWORDS: Array<{ key: 'tool' | 'entryMode'; value: string; terms: string[] }> = [
  { key: 'tool', value: 'study-map', terms: ['study map', 'instant study map'] },
  { key: 'tool', value: 'practice', terms: ['practice ladder', 'practice mode', 'practice questions'] },
  { key: 'tool', value: 'exam', terms: ['exam sheet', 'exam sheets', 'exam review'] },
  { key: 'tool', value: 'writing', terms: ['essay', 'thesis', 'outline', 'revision', 'writing lab'] },
  { key: 'entryMode', value: 'spelling', terms: ['spelling'] },
  { key: 'entryMode', value: 'reading', terms: ['reading passage', 'reading', 'comprehension'] },
  { key: 'entryMode', value: 'homework', terms: ['homework'] },
]

const inferToolFromText = (text: string) => {
  const normalized = text.toLowerCase()
  for (const rule of TOOL_KEYWORDS) {
    if (rule.terms.some((term) => normalized.includes(term))) {
      return { key: rule.key, value: rule.value }
    }
  }
  return null
}

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: chats, error } = await supabase
      .from('chats')
      .select('id, title, metadata')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[Backfill Tools] Error fetching chats:', error)
      return NextResponse.json({ error: 'Failed to load chats' }, { status: 500 })
    }

    let updated = 0
    let skipped = 0

    for (const chat of chats || []) {
      const metadata = (chat as any).metadata || {}
      if (metadata.tool || metadata.entryMode) {
        skipped += 1
        continue
      }

      const { data: firstAssistant } = await supabase
        .from('messages')
        .select('content')
        .eq('chat_id', chat.id)
        .eq('role', 'assistant')
        .order('sequence_number', { ascending: true })
        .limit(1)
        .maybeSingle()

      const combinedText = `${chat.title || ''}\n${firstAssistant?.content || ''}`.trim()
      if (!combinedText) {
        skipped += 1
        continue
      }

      const inferred = inferToolFromText(combinedText)
      if (!inferred) {
        skipped += 1
        continue
      }

      const nextMetadata = { ...metadata, [inferred.key]: inferred.value }
      const { error: updateError } = await supabase
        .from('chats')
        .update({ metadata: nextMetadata })
        .eq('id', chat.id)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[Backfill Tools] Failed to update chat metadata:', updateError)
        continue
      }

      updated += 1
    }

    return NextResponse.json({ updated, skipped })
  } catch (error) {
    console.error('[Backfill Tools] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

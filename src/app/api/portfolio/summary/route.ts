import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

/**
 * POST /api/portfolio/summary
 * Generates an AI academic strengths summary from mastery scores and portfolio entries.
 * Body: { profileId }
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { profileId } = await req.json()
    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
    }

    // Fetch mastery scores
    const { data: scores } = await supabase
      .from('mastery_scores')
      .select('score, sessions_count, student_classes!inner(name, type)')
      .eq('profile_id', profileId)

    // Fetch portfolio entries
    const { data: entries } = await supabase
      .from('portfolio_entries')
      .select('type, title, content')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch student profile
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('display_name, grade_band, grade')
      .eq('id', profileId)
      .single()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })

    const context = `
Student: ${profile?.display_name || 'Unknown'}, Grade ${profile?.grade || profile?.grade_band || 'unknown'}

Mastery Scores:
${(scores || []).map((s: any) => `- ${s.student_classes?.name}: ${s.score}/100 (${s.sessions_count} sessions)`).join('\n') || 'No scores yet'}

Portfolio Highlights:
${(entries || []).map((e: any) => `- [${e.type}] ${e.title}: ${e.content}`).join('\n') || 'No entries yet'}
`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Write a 2-3 paragraph academic strengths summary for this student. This is for a college prep portfolio — highlight their strongest subjects, learning patterns, and unique intellectual qualities demonstrated by their portfolio entries. Be specific and encouraging but honest. Write in third person.\n\n${context}`
      }],
      system: 'You are an academic counselor writing a college-prep strengths summary. Be specific, data-driven, and encouraging.'
    })

    const summary = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error('[Portfolio Summary] Error:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}

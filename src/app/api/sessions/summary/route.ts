import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

/**
 * POST /api/sessions/summary
 * Fire-and-forget: generates a parent-facing session summary via Haiku.
 * Body: { sessionId, profileId, classId, className }
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, profileId, classId, className } = await req.json()
    if (!sessionId || !profileId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Get student name
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('display_name')
      .eq('id', profileId)
      .single()

    const studentName = profile?.display_name || 'Student'

    // Get last 20 messages from the session
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('chat_id', sessionId)
      .order('sequence_number', { ascending: true })
      .limit(20)

    if (!messages || messages.length < 2) {
      return NextResponse.json({ skipped: true, reason: 'Too few messages' })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ skipped: true, reason: 'No API key' })
    }

    const transcript = messages.map((m: any) => `${m.role}: ${m.content}`).join('\n').slice(0, 3000)

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Summarize this tutoring session in 2-3 sentences for a parent. Be specific about what was studied and how the student did. Keep it warm and factual. Never mention grades or failures harshly.\n\nFormat: "${studentName} studied [topic] in ${className || 'their class'}. [What they worked on]. [How they did / what they're working toward]."\n\nSession transcript:\n${transcript}`
      }],
      system: 'You are summarizing a tutoring session for a parent. Be warm, specific, and brief.'
    })

    const summary = response.content[0]?.type === 'text' ? response.content[0].text : ''

    // Store summary
    const { error: insertError } = await supabase.from('session_summaries').insert({
      profile_id: profileId,
      class_id: classId || null,
      user_id: user.id,
      session_id: sessionId,
      summary,
      duration_minutes: Math.ceil(messages.length * 1.5),
      session_date: new Date().toISOString().split('T')[0],
    })
    if (insertError) {
      console.warn('[Session Summary] Insert error (table may not exist):', insertError.message)
    }

    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error('[Session Summary] Error:', error.message)
    return NextResponse.json({ skipped: true, reason: error.message })
  }
}

/**
 * GET /api/sessions/summary?date=YYYY-MM-DD
 * Returns today's session summaries for the authenticated user's children.
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    const { data: summaries, error } = await supabase
      .from('session_summaries')
      .select('*, student_profiles(display_name), student_classes(name)')
      .eq('user_id', user.id)
      .eq('session_date', date)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[Session Summary] Query error:', error.message)
      return NextResponse.json({ summaries: [] })
    }

    return NextResponse.json({
      summaries: (summaries || []).map((s: any) => ({
        id: s.id,
        studentName: s.student_profiles?.display_name || 'Student',
        className: s.student_classes?.name || 'Class',
        summary: s.summary,
        durationMinutes: s.duration_minutes,
        masteryBefore: s.mastery_before,
        masteryAfter: s.mastery_after,
        createdAt: s.created_at,
      }))
    })
  } catch (error: any) {
    console.error('[Session Summary] Error:', error.message)
    return NextResponse.json({ summaries: [] })
  }
}

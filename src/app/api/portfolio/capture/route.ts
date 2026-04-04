import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

/**
 * POST /api/portfolio/capture
 * Fire-and-forget endpoint called after each tutor response.
 * Detects portfolio-worthy moments from the last exchange.
 * Body: { profileId, classId?, sessionId, userMessage, assistantMessage }
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { profileId, classId, sessionId, userMessage, assistantMessage } = await req.json()
    if (!profileId || !userMessage || !assistantMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ captured: false })
    }

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Analyze this student-tutor exchange. Did the student demonstrate a notable insight, make an interesting cross-subject connection, explain something unusually well, or express an idea that could become a college essay topic?

Student: ${userMessage.slice(0, 1000)}
Tutor: ${assistantMessage.slice(0, 1000)}

Only capture if confidence is HIGH — don't over-collect. Most exchanges are routine and should NOT be captured.

Respond with ONLY valid JSON:
If yes: {"capture": true, "type": "insight"|"essay_idea"|"strength", "title": "short title", "content": "1-2 sentence description of what was notable"}
If no: {"capture": false}`
      }],
      system: 'You are an academic portfolio curator for high school students. Only flag truly notable learning moments. Return only valid JSON.'
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    let result: any
    try {
      result = JSON.parse(text)
    } catch {
      return NextResponse.json({ captured: false })
    }

    if (!result.capture) {
      return NextResponse.json({ captured: false })
    }

    // Insert portfolio entry
    await supabase.from('portfolio_entries').insert({
      profile_id: profileId,
      type: result.type,
      title: result.title,
      content: result.content,
      course_id: classId || null,
      session_id: sessionId || null,
    })

    console.log(`[Portfolio Capture] Captured ${result.type}: "${result.title}" for profile ${profileId}`)
    return NextResponse.json({ captured: true, type: result.type, title: result.title })
  } catch (error: any) {
    // Fire-and-forget — don't fail the tutor flow
    console.error('[Portfolio Capture] Error:', error.message)
    return NextResponse.json({ captured: false })
  }
}

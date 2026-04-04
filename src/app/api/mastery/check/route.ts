import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

/**
 * POST /api/mastery/check
 * Phase 1 (no answers): generates 3 questions from session context
 * Phase 2 (with answers): evaluates answers, updates mastery score
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { sessionId, classId, profileId, answers } = body

    if (!sessionId || !classId || !profileId) {
      return NextResponse.json({ error: 'Missing sessionId, classId, or profileId' }, { status: 400 })
    }

    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('chat_id', sessionId)
      .order('sequence_number', { ascending: true })
      .limit(30)

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No session messages found' }, { status: 404 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })
    const sessionSummary = messages
      .map((m: any) => `${m.role}: ${m.content}`)
      .join('\n')
      .slice(0, 4000)

    // Phase 1: Generate questions
    if (!answers) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Based on this tutoring session, generate exactly 3 short mastery check questions to test if the student understood the key concepts. Questions should be conversational and answerable in 1-2 sentences.

Session transcript:
${sessionSummary}

Respond with ONLY valid JSON, no markdown:
{"questions": ["question1", "question2", "question3"]}`
        }],
        system: 'You are an educational assessment assistant. Generate brief, focused questions that test understanding of the concepts discussed. Return only valid JSON.'
      })

      const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
      try {
        const parsed = JSON.parse(text)
        return NextResponse.json({ questions: parsed.questions, sessionId, classId, profileId })
      } catch {
        console.error('[Mastery Check] Failed to parse questions:', text)
        return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 })
      }
    }

    // Phase 2: Evaluate answers
    const answersText = answers
      .map((a: any, i: number) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`)
      .join('\n\n')

    const evalResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Evaluate these student answers from a mastery check. For each, assign a score_delta between -5 (wrong) and +15 (excellent understanding).

Session context:
${sessionSummary.slice(0, 2000)}

Student answers:
${answersText}

Respond with ONLY valid JSON:
{"evaluations": [{"questionIndex": 0, "correct": true, "feedback": "brief feedback", "score_delta": 10}], "totalDelta": 25}`
      }],
      system: 'You are an educational evaluator. Be encouraging but honest. Award higher deltas for deep understanding. Return only valid JSON.'
    })

    const evalText = evalResponse.content[0]?.type === 'text' ? evalResponse.content[0].text : ''
    let evaluation: any
    try {
      evaluation = JSON.parse(evalText)
    } catch {
      console.error('[Mastery Check] Failed to parse evaluation:', evalText)
      return NextResponse.json({ error: 'Failed to evaluate answers' }, { status: 500 })
    }

    const totalDelta = evaluation.totalDelta || 0

    // Upsert mastery score
    const { data: existing } = await supabase
      .from('mastery_scores')
      .select('score, sessions_count')
      .eq('profile_id', profileId)
      .eq('class_id', classId)
      .single()

    const currentScore = existing?.score ?? 0
    const sessionsCount = existing?.sessions_count ?? 0
    const newScore = Math.max(0, Math.min(100, currentScore + totalDelta))

    await supabase
      .from('mastery_scores')
      .upsert({
        profile_id: profileId,
        class_id: classId,
        score: newScore,
        sessions_count: sessionsCount + 1,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'profile_id,class_id' })

    await supabase
      .from('mastery_checks')
      .insert({
        profile_id: profileId,
        class_id: classId,
        session_id: sessionId,
        questions: { answers, evaluations: evaluation.evaluations },
        score_delta: totalDelta,
      })

    return NextResponse.json({
      evaluations: evaluation.evaluations,
      totalDelta,
      previousScore: currentScore,
      newScore,
    })
  } catch (error: any) {
    console.error('[Mastery Check] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

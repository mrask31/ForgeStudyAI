import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/exams
 * List exams for a user and class
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const classId = searchParams.get('classId')

    if (!userId || !classId) {
      return NextResponse.json({ error: 'Missing userId or classId' }, { status: 400 })
    }

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Implement actual database query
    // For now, return empty array
    return NextResponse.json({ exams: [] })
  } catch (error) {
    console.error('[API] Error listing exams:', error)
    return NextResponse.json({ error: 'Failed to list exams' }, { status: 500 })
  }
}

/**
 * POST /api/exams
 * Create a new exam plan
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const body = await req.json()
    const { userId, classId, name, date, topicIds } = body

    if (!userId || !classId || !name || !Array.isArray(topicIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    // date is optional

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Implement actual database insert
    // For now, return a stub exam
    const stubExam = {
      id: crypto.randomUUID(),
      userId,
      classId,
      name,
      date: date || undefined, // Optional date
      topicIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({ exam: stubExam }, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating exam:', error)
    return NextResponse.json({ error: 'Failed to create exam' }, { status: 500 })
  }
}


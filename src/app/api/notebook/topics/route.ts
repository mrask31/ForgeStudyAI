import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NotebookTopic } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || user.id
    const classId = searchParams.get('classId')

    // Verify userId matches authenticated user
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Query notebook_topics table
    let query = supabase
      .from('notebook_topics')
      .select('*')
      .eq('user_id', user.id)

    // Filter by classId if provided
    if (classId) {
      query = query.eq('class_id', classId)
    }

    const { data: topics, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('[Notebook API] Error fetching topics:', { code: error.code, message: error.message })
      // Return empty array for any table/schema error (table may not exist in production)
      return NextResponse.json({ topics: [] })
    }

    // Map database columns to TypeScript interface
    const mappedTopics: NotebookTopic[] = (topics || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      classId: row.class_id || undefined,
      title: row.title,
      description: row.description || undefined,
      category: row.nclex_category || undefined,
      fileIds: row.file_ids || undefined,
      lastStudiedAt: row.last_studied_at || undefined,
      confidence: row.confidence !== null && row.confidence !== undefined ? row.confidence : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ topics: mappedTopics })
  } catch (error) {
    console.error('[Notebook API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { userId, classId, title, description, category, fileIds } = body

    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 })
    }

    // Insert into notebook_topics table
    const now = new Date().toISOString()
    const { data: newTopic, error } = await supabase
      .from('notebook_topics')
      .insert({
        user_id: user.id,
        class_id: classId || null,
        title: title.trim(),
        description: description || null,
        nclex_category: category || null,
        file_ids: fileIds || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) {
      console.error('[Notebook API] Error creating topic:', { code: error.code, message: error.message })
      return NextResponse.json({ error: 'Table not available' }, { status: 503 })
    }

    // Map database columns to TypeScript interface
    const mappedTopic: NotebookTopic = {
      id: newTopic.id,
      userId: newTopic.user_id,
      classId: newTopic.class_id || undefined,
      title: newTopic.title,
      description: newTopic.description || undefined,
      category: newTopic.nclex_category || undefined,
      fileIds: newTopic.file_ids || undefined,
      lastStudiedAt: newTopic.last_studied_at || undefined,
      confidence: newTopic.confidence !== null && newTopic.confidence !== undefined ? newTopic.confidence : undefined,
      createdAt: newTopic.created_at,
      updatedAt: newTopic.updated_at,
    }

    return NextResponse.json({ topic: mappedTopic }, { status: 201 })
  } catch (error) {
    console.error('[Notebook API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


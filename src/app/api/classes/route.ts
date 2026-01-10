import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StudentClass, ClassType } from '@/lib/types'

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

    // Verify userId matches authenticated user
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Query student_classes table
    const { data: classes, error } = await supabase
      .from('student_classes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Classes API] Error fetching classes:', error)
      // If table doesn't exist, return empty array (graceful degradation)
      if (error.code === 'PGRST116' || error.code === '42P01') {
        console.warn('[Classes API] student_classes table not found. Returning empty array.')
        return NextResponse.json({ classes: [] })
      }
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
    }

    // Map database columns to TypeScript interface
    const mappedClasses: StudentClass[] = (classes || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      code: row.code,
      name: row.name,
      type: row.type as ClassType,
      startDate: row.start_date || undefined,
      endDate: row.end_date || undefined,
      nextExamDate: row.next_exam_date || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ classes: mappedClasses })
  } catch (error) {
    console.error('[Classes API] Error:', error)
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
    const { userId, code, name, type, startDate, endDate, nextExamDate, notes } = body

    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!code || !name || !type) {
      return NextResponse.json({ error: 'Missing required fields: code, name, type' }, { status: 400 })
    }

    // Insert into student_classes table
    const now = new Date().toISOString()
    const { data: newClass, error } = await supabase
      .from('student_classes')
      .insert({
        user_id: user.id,
        code: code.trim(),
        name: name.trim(),
        type: type,
        start_date: startDate || null,
        end_date: endDate || null,
        next_exam_date: nextExamDate || null,
        notes: notes || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) {
      console.error('[Classes API] Error creating class:', error)
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return NextResponse.json(
          { error: 'Database table not found. Please run the SQL schema.' },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: 'Failed to create class' }, { status: 500 })
    }

    // Map database columns to TypeScript interface
    const mappedClass: StudentClass = {
      id: newClass.id,
      userId: newClass.user_id,
      code: newClass.code,
      name: newClass.name,
      type: newClass.type as ClassType,
      startDate: newClass.start_date || undefined,
      endDate: newClass.end_date || undefined,
      nextExamDate: newClass.next_exam_date || undefined,
      notes: newClass.notes || undefined,
      createdAt: newClass.created_at,
      updatedAt: newClass.updated_at,
    }

    return NextResponse.json({ class: mappedClass }, { status: 201 })
  } catch (error) {
    console.error('[Classes API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


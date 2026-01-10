import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StudentClass, ClassType } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { userId, ...updates } = body

    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build update payload, mapping TypeScript fields to database columns
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }

    if (updates.code !== undefined) updatePayload.code = updates.code.trim()
    if (updates.name !== undefined) updatePayload.name = updates.name.trim()
    if (updates.type !== undefined) updatePayload.type = updates.type
    if (updates.startDate !== undefined) updatePayload.start_date = updates.startDate || null
    if (updates.endDate !== undefined) updatePayload.end_date = updates.endDate || null
    if (updates.nextExamDate !== undefined) updatePayload.next_exam_date = updates.nextExamDate || null
    if (updates.notes !== undefined) updatePayload.notes = updates.notes || null

    // Update in student_classes table
    const { data: updatedClass, error } = await supabase
      .from('student_classes')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('user_id', user.id) // Ensure user owns this class
      .select()
      .single()

    if (error) {
      console.error('[Classes API] Error updating class:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Class not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to update class' }, { status: 500 })
    }

    if (!updatedClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Map database columns to TypeScript interface
    const mappedClass: StudentClass = {
      id: updatedClass.id,
      userId: updatedClass.user_id,
      code: updatedClass.code,
      name: updatedClass.name,
      type: updatedClass.type as ClassType,
      startDate: updatedClass.start_date || undefined,
      endDate: updatedClass.end_date || undefined,
      nextExamDate: updatedClass.next_exam_date || undefined,
      notes: updatedClass.notes || undefined,
      createdAt: updatedClass.created_at,
      updatedAt: updatedClass.updated_at,
    }

    return NextResponse.json({ class: mappedClass })
  } catch (error) {
    console.error('[Classes API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { userId } = body

    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete from student_classes table
    const { error } = await supabase
      .from('student_classes')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id) // Ensure user owns this class

    if (error) {
      console.error('[Classes API] Error deleting class:', error)
      return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Classes API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


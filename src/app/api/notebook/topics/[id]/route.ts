import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NotebookTopic } from '@/lib/types'

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

    if (updates.classId !== undefined) updatePayload.class_id = updates.classId || null
    if (updates.title !== undefined) updatePayload.title = updates.title.trim()
    if (updates.description !== undefined) updatePayload.description = updates.description || null
    if (updates.nclexCategory !== undefined) updatePayload.nclex_category = updates.nclexCategory || null
    if (updates.fileIds !== undefined) updatePayload.file_ids = updates.fileIds || null
    if (updates.lastStudiedAt !== undefined) updatePayload.last_studied_at = updates.lastStudiedAt || null
    if (updates.confidence !== undefined) updatePayload.confidence = updates.confidence !== null && updates.confidence !== undefined ? updates.confidence : null

    // Update in notebook_topics table
    const { data: updatedTopic, error } = await supabase
      .from('notebook_topics')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('user_id', user.id) // Ensure user owns this topic
      .select()
      .single()

    if (error) {
      console.error('[Notebook API] Error updating topic:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to update topic' }, { status: 500 })
    }

    if (!updatedTopic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    // Map database columns to TypeScript interface
    const mappedTopic: NotebookTopic = {
      id: updatedTopic.id,
      userId: updatedTopic.user_id,
      classId: updatedTopic.class_id || undefined,
      title: updatedTopic.title,
      description: updatedTopic.description || undefined,
      nclexCategory: updatedTopic.nclex_category || undefined,
      fileIds: updatedTopic.file_ids || undefined,
      lastStudiedAt: updatedTopic.last_studied_at || undefined,
      confidence: updatedTopic.confidence !== null && updatedTopic.confidence !== undefined ? updatedTopic.confidence : undefined,
      createdAt: updatedTopic.created_at,
      updatedAt: updatedTopic.updated_at,
    }

    return NextResponse.json({ topic: mappedTopic })
  } catch (error) {
    console.error('[Notebook API] Error:', error)
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

    // Delete from notebook_topics table
    const { error } = await supabase
      .from('notebook_topics')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id) // Ensure user owns this topic

    if (error) {
      console.error('[Notebook API] Error deleting topic:', error)
      return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Notebook API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


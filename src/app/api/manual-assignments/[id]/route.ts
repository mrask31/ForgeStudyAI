import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { title, course_name, due_date, notes, is_complete } = body;

  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title.trim();
  if (course_name !== undefined) update.course_name = course_name?.trim() || null;
  if (due_date !== undefined) update.due_date = due_date || null;
  if (notes !== undefined) update.notes = notes?.trim() || null;
  if (is_complete !== undefined) update.is_complete = is_complete;

  const { data, error } = await supabase
    .from('manual_assignments')
    .update(update)
    .eq('id', params.id)
    .select('id, title, course_name, due_date, notes, is_complete, created_at')
    .single();

  if (error) {
    console.error('[manual-assignments PUT]', error);
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }

  return NextResponse.json({ assignment: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('manual_assignments')
    .delete()
    .eq('id', params.id);

  if (error) {
    console.error('[manual-assignments DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

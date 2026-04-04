import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get('profileId');

  if (!profileId) {
    return NextResponse.json({ error: 'profileId required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('manual_assignments')
    .select('id, title, course_name, due_date, notes, is_complete, created_at')
    .eq('profile_id', profileId)
    .order('is_complete', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('[manual-assignments GET]', error);
    return NextResponse.json({ assignments: [] });
  }

  return NextResponse.json({ assignments: data || [] });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { profile_id, title, course_name, due_date, notes } = body;

  if (!profile_id || !title?.trim()) {
    return NextResponse.json({ error: 'profile_id and title are required' }, { status: 400 });
  }

  // Verify ownership
  const { data: profile } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('id', profile_id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('manual_assignments')
    .insert({
      profile_id,
      title: title.trim(),
      course_name: course_name?.trim() || null,
      due_date: due_date || null,
      notes: notes?.trim() || null,
    })
    .select('id, title, course_name, due_date, notes, is_complete, created_at')
    .single();

  if (error) {
    console.error('[manual-assignments POST]', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }

  return NextResponse.json({ assignment: data }, { status: 201 });
}

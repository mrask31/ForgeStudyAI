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

  // Fetch synced assignments (LMS)
  const { data: synced } = await supabase
    .from('synced_assignments')
    .select('id, title, course_name, due_date, study_topic_id')
    .eq('student_id', profileId)
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true })
    .limit(10);

  // Fetch manual assignments
  const { data: manual } = await supabase
    .from('manual_assignments')
    .select('id, title, course_name, due_date')
    .eq('profile_id', profileId)
    .eq('is_complete', false)
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true })
    .limit(10);

  // Merge and sort by due_date, return top 3
  const syncedItems = (synced || []).map((a) => ({ ...a, source: 'synced' as const }));
  const manualItems = (manual || []).map((a) => ({
    id: a.id,
    title: a.title,
    course_name: a.course_name,
    due_date: a.due_date,
    study_topic_id: null,
    source: 'manual' as const,
  }));

  const merged = [...syncedItems, ...manualItems]
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 3);

  return NextResponse.json({ assignments: merged });
}

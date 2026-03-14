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

  const { data: assignments, error } = await supabase
    .from('synced_assignments')
    .select('id, title, course_name, due_date, study_topic_id')
    .eq('student_id', profileId)
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true })
    .limit(3);

  if (error) {
    console.error('[due-soon] Error:', error);
    return NextResponse.json({ assignments: [] });
  }

  return NextResponse.json({ assignments: assignments || [] });
}

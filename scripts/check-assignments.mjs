/**
 * Check what assignments exist in the database
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iylxyqftdnuymthzoerb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5bHh5cWZ0ZG51eW10aHpvZXJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg3NDgwOSwiZXhwIjoyMDgzNDUwODA5fQ.82Mf4UHzL0ZTPvwTtDMl7SxoCJEdWlVUn-YZEsOLPsY';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('Checking synced_assignments table...\n');

  // Check all assignments
  const { data: allAssignments, error: allError } = await supabase
    .from('synced_assignments')
    .select('id, title, sync_status, merge_status, student_id, course_name');

  if (allError) {
    console.error('Error fetching assignments:', allError);
    return;
  }

  console.log(`Total assignments in database: ${allAssignments?.length || 0}\n`);

  if (allAssignments && allAssignments.length > 0) {
    console.log('Assignments:');
    allAssignments.forEach((a, i) => {
      console.log(`\n${i + 1}. ${a.title}`);
      console.log(`   Course: ${a.course_name}`);
      console.log(`   Sync Status: ${a.sync_status}`);
      console.log(`   Merge Status: ${a.merge_status || 'NULL'}`);
      console.log(`   Student ID: ${a.student_id}`);
    });
  } else {
    console.log('No assignments found in database.');
  }

  // Check study_topics
  console.log('\n' + '='.repeat(50));
  console.log('Checking study_topics table...\n');

  const { data: topics, error: topicsError } = await supabase
    .from('study_topics')
    .select('id, title, source, synced_assignment_id, orbit_state');

  if (topicsError) {
    console.error('Error fetching topics:', topicsError);
    return;
  }

  console.log(`Total study_topics: ${topics?.length || 0}`);
  
  const lmsTopics = topics?.filter(t => t.source === 'lms') || [];
  console.log(`LMS-sourced topics: ${lmsTopics.length}\n`);

  if (lmsTopics.length > 0) {
    console.log('LMS Topics:');
    lmsTopics.forEach((t, i) => {
      console.log(`\n${i + 1}. ${t.title}`);
      console.log(`   Source: ${t.source}`);
      console.log(`   Orbit State: ${t.orbit_state}`);
      console.log(`   Synced Assignment ID: ${t.synced_assignment_id || 'NULL'}`);
    });
  }
}

main().catch(console.error);

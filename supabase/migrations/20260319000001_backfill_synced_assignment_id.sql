-- Backfill synced_assignment_id for study_topics that were created from LMS assignments
-- before the column was being properly saved.
-- Matches by profile_id + title to link existing topics to their synced_assignment.
UPDATE study_topics st
SET synced_assignment_id = sa.id
FROM synced_assignments sa
WHERE st.profile_id = sa.student_id
  AND st.title = sa.title
  AND st.synced_assignment_id IS NULL;

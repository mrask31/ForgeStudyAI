This is the single prompt that kicks everything off:
```
You are working on ForgeStudy AI — a COPPA-compliant AI tutoring platform for grades 6–12. Read this entire codebase thoroughly before doing anything.

Start by reading:
1. TASKS.md — your complete task queue
2. src/app/api/chat/route.ts — the AI chat handler
3. All files in .kiro/specs/ — the feature specs
4. supabase/ folder — all migration files
5. src/lib/ai/prompts.ts — the system prompt file

Then execute TASK 1 through TASK 10 from TASKS.md in order. For each task:
- Create a new feature branch (never commit to main)
- Make all changes
- Run npm run build to verify no errors
- Commit with a clear message
- Move to the next task

Critical context:
- Model upgrade: change claude-3-5-sonnet-20241022 to claude-sonnet-4-6 everywhere
- Remove ALL references to NCLEX, nursing, med_surg, pharm, peds, ob, psych from student-facing code
- The Stripe 400 is caused by profile id 32609d0c with expired trial_ends_at (March 13) but active subscription status — fix the subscription status check to handle this gracefully
- proof_events table has RLS enabled but zero policies — add them
- 21 database functions have mutable search_path — fix all of them
- student_classes type enum has nursing types — replace with: math, science, english, history, foreign_language, arts, elective, other
- Grades 6–12 only, not K-12, not nursing, not elementary

Do not ask for permission between tasks. Build, commit, and move forward. Log what you completed at the end.
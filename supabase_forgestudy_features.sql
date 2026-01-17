-- ForgeStudy: core feature artifacts
-- Study maps, practice ladders, exam sheets, homework plans

create table if not exists public.study_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  profile_id uuid,
  source_id uuid,
  chat_id uuid,
  message_id uuid,
  map_type text not null default 'instant',
  title text,
  map_markdown text,
  clarifying_question text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.study_map_nodes (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.study_maps(id) on delete cascade,
  label text not null,
  node_type text,
  order_index integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.practice_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  profile_id uuid,
  chat_id uuid,
  message_id uuid,
  map_id uuid,
  title text,
  level_count integer not null default 4,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.practice_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.practice_sets(id) on delete cascade,
  level integer not null default 1,
  prompt text not null,
  answer text,
  explanation text,
  item_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  profile_id uuid,
  chat_id uuid,
  message_id uuid,
  topic text,
  sheet_markdown text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.homework_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  profile_id uuid,
  source_id uuid,
  title text,
  extracted_text text,
  plan_markdown text,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.homework_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.homework_plans(id) on delete cascade,
  title text not null,
  due_date date,
  estimated_minutes integer,
  priority integer not null default 2,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.map_progress (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.study_maps(id) on delete cascade,
  node_id uuid references public.study_map_nodes(id) on delete cascade,
  status text not null default 'unknown',
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.study_maps enable row level security;
alter table public.study_map_nodes enable row level security;
alter table public.practice_sets enable row level security;
alter table public.practice_items enable row level security;
alter table public.exam_sheets enable row level security;
alter table public.homework_plans enable row level security;
alter table public.homework_tasks enable row level security;
alter table public.map_progress enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_maps' and policyname = 'Study maps are owned by user') then
    create policy "Study maps are owned by user"
      on public.study_maps for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'study_map_nodes' and policyname = 'Study map nodes by user') then
    create policy "Study map nodes by user"
      on public.study_map_nodes for all
      using (exists (select 1 from public.study_maps where id = map_id and user_id = auth.uid()))
      with check (exists (select 1 from public.study_maps where id = map_id and user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'practice_sets' and policyname = 'Practice sets by user') then
    create policy "Practice sets by user"
      on public.practice_sets for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'practice_items' and policyname = 'Practice items by user') then
    create policy "Practice items by user"
      on public.practice_items for all
      using (exists (select 1 from public.practice_sets where id = set_id and user_id = auth.uid()))
      with check (exists (select 1 from public.practice_sets where id = set_id and user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'exam_sheets' and policyname = 'Exam sheets by user') then
    create policy "Exam sheets by user"
      on public.exam_sheets for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'homework_plans' and policyname = 'Homework plans by user') then
    create policy "Homework plans by user"
      on public.homework_plans for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'homework_tasks' and policyname = 'Homework tasks by user') then
    create policy "Homework tasks by user"
      on public.homework_tasks for all
      using (exists (select 1 from public.homework_plans where id = plan_id and user_id = auth.uid()))
      with check (exists (select 1 from public.homework_plans where id = plan_id and user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'map_progress' and policyname = 'Map progress by user') then
    create policy "Map progress by user"
      on public.map_progress for all
      using (exists (select 1 from public.study_maps where id = map_id and user_id = auth.uid()))
      with check (exists (select 1 from public.study_maps where id = map_id and user_id = auth.uid()));
  end if;
end $$;

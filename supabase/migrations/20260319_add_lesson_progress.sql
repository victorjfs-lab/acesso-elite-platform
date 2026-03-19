create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.academy_users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (student_id, lesson_id)
);

create index if not exists idx_lesson_progress_student_course
  on public.lesson_progress(student_id, course_id);

create index if not exists idx_lesson_progress_lesson
  on public.lesson_progress(lesson_id);

alter table public.lesson_progress enable row level security;

drop trigger if exists trg_lesson_progress_updated_at on public.lesson_progress;
create trigger trg_lesson_progress_updated_at
before update on public.lesson_progress
for each row execute function public.set_updated_at();

drop policy if exists "students can read own lesson progress" on public.lesson_progress;
create policy "students can read own lesson progress"
on public.lesson_progress for select
using (
  exists (
    select 1
    from public.academy_users
    where academy_users.id = lesson_progress.student_id
      and academy_users.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.academy_users
    where academy_users.auth_user_id = auth.uid()
      and academy_users.role = 'admin'
  )
);

drop policy if exists "students can manage own lesson progress" on public.lesson_progress;
create policy "students can manage own lesson progress"
on public.lesson_progress for all
using (
  exists (
    select 1
    from public.academy_users
    where academy_users.id = lesson_progress.student_id
      and academy_users.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.academy_users
    where academy_users.auth_user_id = auth.uid()
      and academy_users.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.academy_users
    where academy_users.id = lesson_progress.student_id
      and academy_users.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.academy_users
    where academy_users.auth_user_id = auth.uid()
      and academy_users.role = 'admin'
  )
);

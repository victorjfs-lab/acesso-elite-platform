create table if not exists public.resource_downloads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.academy_users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  resource_id uuid not null references public.course_resources(id) on delete cascade,
  downloaded_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_resource_downloads_student_course
  on public.resource_downloads(student_id, course_id);

create index if not exists idx_resource_downloads_resource
  on public.resource_downloads(resource_id);

alter table public.resource_downloads enable row level security;

drop policy if exists "students can read own resource downloads" on public.resource_downloads;
create policy "students can read own resource downloads"
on public.resource_downloads for select
using (
  exists (
    select 1
    from public.academy_users
    where academy_users.id = resource_downloads.student_id
      and academy_users.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.academy_users
    where academy_users.auth_user_id = auth.uid()
      and academy_users.role = 'admin'
  )
);

drop policy if exists "students can create own resource downloads" on public.resource_downloads;
create policy "students can create own resource downloads"
on public.resource_downloads for insert
with check (
  exists (
    select 1
    from public.academy_users
    where academy_users.id = resource_downloads.student_id
      and academy_users.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.academy_users
    where academy_users.auth_user_id = auth.uid()
      and academy_users.role = 'admin'
  )
);

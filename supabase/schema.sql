create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.set_enrollment_expiration()
returns trigger
language plpgsql
as $$
begin
  if new.granted_at is null then
    new.granted_at = timezone('utc', now());
  end if;

  if new.expires_at is null then
    new.expires_at = new.granted_at + interval '365 days';
  end if;

  if new.expires_at < timezone('utc', now()) then
    new.status = 'expired';
  elsif new.status is null then
    new.status = 'active';
  end if;

  return new;
end;
$$;

create table if not exists public.academy_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  full_name text not null,
  email text not null unique,
  role text not null default 'student' check (role in ('admin', 'student')),
  headline text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text not null,
  description text not null,
  hero_image text not null,
  instructor_name text not null,
  duration_label text not null,
  support_label text not null,
  access_duration_days integer not null default 365,
  price_label text not null,
  elite_sort_order integer not null default 100,
  elite_release_delay_days integer not null default 0,
  status text not null default 'draft' check (status in ('published', 'draft')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.courses
  add column if not exists elite_sort_order integer not null default 100;

alter table public.courses
  add column if not exists elite_release_delay_days integer not null default 0;

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null,
  module_order integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (course_id, module_order)
);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  summary text not null,
  duration_label text not null,
  lesson_order integer not null,
  vimeo_url text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (module_id, lesson_order)
);

alter table public.course_lessons
  alter column vimeo_url set default '';

create table if not exists public.course_resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.course_modules(id) on delete set null,
  lesson_id uuid references public.course_lessons(id) on delete set null,
  title text not null,
  description text not null,
  kind text not null check (kind in ('pdf', 'indicador', 'planilha', 'bonus')),
  file_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.course_resources
  add column if not exists module_id uuid references public.course_modules(id) on delete set null;

alter table public.course_resources
  add column if not exists lesson_id uuid references public.course_lessons(id) on delete set null;

create table if not exists public.enrollment_links (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.enrollment_links(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  full_name text not null,
  email text not null,
  whatsapp text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.academy_users(id) on delete cascade,
  granted_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  source_slug text,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.enrollments
  add column if not exists source_slug text;

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

create index if not exists idx_course_modules_course_id on public.course_modules(course_id);
create index if not exists idx_course_lessons_module_id on public.course_lessons(module_id);
create index if not exists idx_course_resources_course_id on public.course_resources(course_id);
create index if not exists idx_enrollment_links_course_id on public.enrollment_links(course_id);
create index if not exists idx_enrollment_requests_status on public.enrollment_requests(status, created_at desc);
create index if not exists idx_enrollments_student_id on public.enrollments(student_id, expires_at desc);
create index if not exists idx_enrollments_course_id on public.enrollments(course_id);
create index if not exists idx_lesson_progress_student_course on public.lesson_progress(student_id, course_id);
create index if not exists idx_lesson_progress_lesson on public.lesson_progress(lesson_id);

drop trigger if exists trg_academy_users_updated_at on public.academy_users;
create trigger trg_academy_users_updated_at
before update on public.academy_users
for each row execute function public.set_updated_at();

drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists trg_enrollments_updated_at on public.enrollments;
create trigger trg_enrollments_updated_at
before update on public.enrollments
for each row execute function public.set_updated_at();

drop trigger if exists trg_enrollments_expiration on public.enrollments;
create trigger trg_enrollments_expiration
before insert or update on public.enrollments
for each row execute function public.set_enrollment_expiration();

drop trigger if exists trg_lesson_progress_updated_at on public.lesson_progress;
create trigger trg_lesson_progress_updated_at
before update on public.lesson_progress
for each row execute function public.set_updated_at();

insert into public.academy_users (id, full_name, email, role, headline)
values
  ('11111111-1111-4111-8111-111111111111', 'Victor Ferreira', 'admin@academia.local', 'admin', 'Administrador da plataforma'),
  ('22222222-2222-4222-8222-222222222222', 'Marina Costa', 'marina@aluno.local', 'student', 'Aluna ativa')
on conflict (email) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  headline = excluded.headline,
  updated_at = timezone('utc', now());

insert into public.courses (
  id,
  slug,
  title,
  subtitle,
  description,
  hero_image,
  instructor_name,
  duration_label,
  support_label,
  access_duration_days,
  price_label,
  status
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'radar-premium',
    'Radar Premium',
    'Videoaulas, leitura pratica e rotina guiada de mercado.',
    'Curso principal com trilha estruturada, videoaulas no Vimeo, PDFs de apoio e indicadores comentados para o aluno aplicar no dia a dia.',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    'Victor Ferreira',
    '32 aulas + atualizacoes',
    'Acesso por 12 meses',
    365,
    'R$ 1.497',
    'published'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'indicadores-essenciais',
    'Sala de Indicadores',
    'Leitura clara dos numeros que realmente mexem no preco.',
    'Programa focado em indicadores macro, calendario economico, interpretacao de cenario e acompanhamento com materiais para consulta rapida.',
    'https://images.unsplash.com/photo-1543286386-713bdd548da4?auto=format&fit=crop&w=1200&q=80',
    'Victor Ferreira',
    '18 aulas + biblioteca de apoio',
    'Liberacao individual por turma',
    365,
    'R$ 997',
    'published'
  )
on conflict (slug) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  hero_image = excluded.hero_image,
  instructor_name = excluded.instructor_name,
  duration_label = excluded.duration_label,
  support_label = excluded.support_label,
  access_duration_days = excluded.access_duration_days,
  price_label = excluded.price_label,
  status = excluded.status,
  updated_at = timezone('utc', now());

insert into public.enrollment_links (course_id, slug, title, description, is_active)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'turma-radar-2026',
    'Cadastro Radar Premium 2026',
    'Formulario publico para captar novos alunos desta turma.',
    true
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'indicadores-marco-2026',
    'Cadastro Sala de Indicadores',
    'Link de matricula para interessados no programa de indicadores.',
    true
  )
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  is_active = excluded.is_active;

alter table public.academy_users enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_resources enable row level security;
alter table public.enrollment_links enable row level security;
alter table public.enrollment_requests enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;

drop policy if exists "public can read published courses" on public.courses;
create policy "public can read published courses"
on public.courses for select
using (status = 'published');

drop policy if exists "public can read active links" on public.enrollment_links;
create policy "public can read active links"
on public.enrollment_links for select
using (is_active = true);

drop policy if exists "public can create enrollment requests" on public.enrollment_requests;
create policy "public can create enrollment requests"
on public.enrollment_requests for insert
with check (true);

drop policy if exists "authenticated users can manage courses" on public.courses;
create policy "authenticated users can manage courses"
on public.courses for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users can manage course modules" on public.course_modules;
create policy "authenticated users can manage course modules"
on public.course_modules for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users can manage course lessons" on public.course_lessons;
create policy "authenticated users can manage course lessons"
on public.course_lessons for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users can manage course resources" on public.course_resources;
create policy "authenticated users can manage course resources"
on public.course_resources for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users can manage enrollment links" on public.enrollment_links;
create policy "authenticated users can manage enrollment links"
on public.enrollment_links for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read academy profile" on public.academy_users;
create policy "authenticated users can read academy profile"
on public.academy_users for select
using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read course modules" on public.course_modules;
create policy "authenticated users can read course modules"
on public.course_modules for select
using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read course lessons" on public.course_lessons;
create policy "authenticated users can read course lessons"
on public.course_lessons for select
using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read course resources" on public.course_resources;
create policy "authenticated users can read course resources"
on public.course_resources for select
using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read enrollments" on public.enrollments;
create policy "authenticated users can read enrollments"
on public.enrollments for select
using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can manage enrollment requests" on public.enrollment_requests;
create policy "authenticated users can manage enrollment requests"
on public.enrollment_requests for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users can manage academy users" on public.academy_users;
create policy "authenticated users can manage academy users"
on public.academy_users for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users can manage enrollments" on public.enrollments;
create policy "authenticated users can manage enrollments"
on public.enrollments for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public, file_size_limit)
values ('course-assets', 'course-assets', true, 52428800)
on conflict (id) do nothing;

drop policy if exists "authenticated users can upload course assets" on storage.objects;
create policy "authenticated users can upload course assets"
on storage.objects for insert
with check (
  bucket_id = 'course-assets'
  and auth.role() = 'authenticated'
);

drop policy if exists "authenticated users can update course assets" on storage.objects;
create policy "authenticated users can update course assets"
on storage.objects for update
using (
  bucket_id = 'course-assets'
  and auth.role() = 'authenticated'
)
with check (
  bucket_id = 'course-assets'
  and auth.role() = 'authenticated'
);

drop policy if exists "public can read course assets" on storage.objects;
create policy "public can read course assets"
on storage.objects for select
using (bucket_id = 'course-assets');

drop policy if exists "authenticated users can delete course assets" on storage.objects;
create policy "authenticated users can delete course assets"
on storage.objects for delete
using (
  bucket_id = 'course-assets'
  and auth.role() = 'authenticated'
);

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

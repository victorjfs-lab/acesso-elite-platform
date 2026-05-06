-- Garante que todo aluno com Acesso Elite ativo tenha matricula fisica
-- em todos os cursos publicados atuais.
--
-- A aplicacao tambem calcula esse acesso dinamicamente, mas este backfill
-- deixa o banco consistente para relatorios, auditorias e telas antigas.

with elite_anchor as (
  select distinct on (student_id)
    student_id,
    granted_at,
    expires_at
  from public.enrollments
  where source_slug in ('acesso-elite', 'acesso-elite-bundle')
    and status = 'active'
    and (expires_at is null or expires_at >= timezone('utc', now()))
  order by student_id, expires_at desc nulls last, granted_at desc
),
published_courses as (
  select id
  from public.courses
  where status = 'published'
    and slug <> 'acesso-elite-bundle'
)
insert into public.enrollments (
  course_id,
  student_id,
  granted_at,
  expires_at,
  source_slug,
  status
)
select
  published_courses.id,
  elite_anchor.student_id,
  elite_anchor.granted_at,
  elite_anchor.expires_at,
  'acesso-elite',
  'active'
from elite_anchor
cross join published_courses
where not exists (
  select 1
  from public.enrollments existing
  where existing.student_id = elite_anchor.student_id
    and existing.course_id = published_courses.id
    and existing.source_slug in ('acesso-elite', 'acesso-elite-bundle')
    and existing.status = 'active'
);

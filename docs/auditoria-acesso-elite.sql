-- Auditoria do Acesso Elite
--
-- Cole este SQL no Supabase > Editor SQL e clique em Run.
-- Ele NAO altera nem exclui ninguem. Apenas mostra divergencias:
-- - FORA_DA_LISTA: aluno com Elite ativo no banco que nao esta na lista oficial.
-- - FALTANDO_NA_PLATAFORMA: nome da lista oficial que nao apareceu no Elite ativo.
-- - RESUMO_ACESSO_ELITE: contagem geral.

create extension if not exists unaccent;

with allowed_students(included_on, full_name) as (
  values
    ('29/05', 'LUIS NOVAES'),
    ('13/06', 'RODRIGO CABRAL'),
    ('17/06', 'ANDERSON BARLETTA'),
    ('17/06', 'HERMIDES'),
    ('27/06', 'HILTON'),
    ('02/07', 'FRANCISCO MARQUES BENEVIDES'),
    ('06/08', 'NICHOLAS LIMA OLIVEIRA'),
    ('06/08', 'TIAGO VIEIRA MARIANO'),
    ('22/08', 'GUSTAVO ZEFERINO'),
    ('26/08', 'ADMILTON JOSE DE OLIVEIRA'),
    ('26/08', 'CAIO ANDREOLLI'),
    ('26/08', 'MARIANA KLEIN BATISTA'),
    ('01/09', 'RODRIGO LIMA'),
    ('02/09', 'DELCIDES F SOUZA JR'),
    ('08/09', 'ERICK XAVIER GODINHO'),
    ('29/09', 'ANDREWS ERLER ROCCON'),
    ('13/10', 'JOAO PEDRO DALL OGLIO'),
    ('23/10', 'RAFAEL BARA ALVES'),
    ('01/11', 'KELEN CORNEIRO'),
    ('17/11', 'ANDERSON LIRA DE SOUZA'),
    ('24/11', 'DANIEL JULIANI FERREIRA'),
    ('24/11', 'PEDRO VOLPATO'),
    ('27/11', 'FLAVIO MAGALHAES TAVARES'),
    ('28/11', 'PABLO PHILLIPE CANDIDO'),
    ('01/01', 'GUSTAVO PELLIZARI'),
    ('19/01', 'JOAO MARCIO GONCALVEZ PRADO'),
    ('17/03', 'GUILHERME')
),
allowed_normalized as (
  select
    included_on,
    full_name,
    regexp_replace(upper(unaccent(full_name)), '[^A-Z0-9]+', ' ', 'g') as normalized_name
  from allowed_students
),
elite_students as (
  select
    users.id,
    users.full_name,
    users.email,
    max(enrollments.granted_at) as granted_at,
    max(enrollments.expires_at) as expires_at
  from public.academy_users users
  join public.enrollments enrollments on enrollments.student_id = users.id
  where enrollments.source_slug in ('acesso-elite', 'acesso-elite-bundle')
    and enrollments.status = 'active'
    and (enrollments.expires_at is null or enrollments.expires_at >= timezone('utc', now()))
  group by users.id, users.full_name, users.email
),
elite_normalized as (
  select
    *,
    regexp_replace(upper(unaccent(full_name)), '[^A-Z0-9]+', ' ', 'g') as normalized_name
  from elite_students
),
outside_allowed as (
  select
    'FORA_DA_LISTA' as tipo,
    elite.full_name,
    elite.email,
    null::text as data_lista,
    elite.granted_at,
    elite.expires_at
  from elite_normalized elite
  where not exists (
    select 1
    from allowed_normalized allowed
    where elite.normalized_name = allowed.normalized_name
      or elite.normalized_name like '%' || allowed.normalized_name || '%'
      or allowed.normalized_name like '%' || elite.normalized_name || '%'
  )
),
missing_from_platform as (
  select
    'FALTANDO_NA_PLATAFORMA' as tipo,
    allowed.full_name,
    null::text as email,
    allowed.included_on as data_lista,
    null::timestamp with time zone as granted_at,
    null::timestamp with time zone as expires_at
  from allowed_normalized allowed
  where not exists (
    select 1
    from elite_normalized elite
    where elite.normalized_name = allowed.normalized_name
      or elite.normalized_name like '%' || allowed.normalized_name || '%'
      or allowed.normalized_name like '%' || elite.normalized_name || '%'
  )
),
summary as (
  select
    'RESUMO_ACESSO_ELITE' as tipo,
    ('Elite ativo no banco: ' || count(*)::text || ' | Lista oficial: 27') as full_name,
    null::text as email,
    null::text as data_lista,
    null::timestamp with time zone as granted_at,
    null::timestamp with time zone as expires_at
  from elite_students
)
select *
from outside_allowed
union all
select *
from missing_from_platform
union all
select *
from summary
order by tipo, full_name;

-- Pruebas pgTAP del catálogo de idiomas y niveles (migración 0003_languages_levels.sql).
-- Todo ocurre dentro de una transacción que se revierte al final: no deja datos.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

-- Usuarios de prueba (como postgres); el trigger de alta crea perfil + rol student.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student@test.local', '{"full_name":"Student"}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'suspended@test.local', '{"full_name":"Suspended"}', '{}', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin@test.local', '{"full_name":"Admin"}', '{}', now(), now());

insert into public.user_roles (user_id, role) values
  ('44444444-4444-4444-4444-444444444444', 'admin');
update public.profiles set status = 'suspended' where id = '22222222-2222-2222-2222-222222222222';

-- ---------------------------------------------------------------------------
-- Semilla (como postgres)
-- ---------------------------------------------------------------------------
select results_eq(
  $$ select (select count(*) from public.languages),
            (select count(*) from public.levels),
            (select count(*) from public.levels where language_code = 'es'),
            (select count(*) from public.levels where language_code = 'en') $$,
  $$ values (2::bigint, 12::bigint, 6::bigint, 6::bigint) $$,
  'seed has 2 languages and 12 levels with 6 levels per language'
);

-- ---------------------------------------------------------------------------
-- Lectura
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select results_eq(
  $$ select (select count(*) from public.languages), (select count(*) from public.levels) $$,
  $$ values (2::bigint, 12::bigint) $$,
  'any authenticated user can read languages and levels'
);

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select results_eq(
  $$ select (select count(*) from public.languages), (select count(*) from public.levels) $$,
  $$ values (0::bigint, 0::bigint) $$,
  'suspended user cannot read languages or levels'
);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select 1 from public.languages $$, '42501', null, 'anon cannot read languages or levels: languages');
select throws_ok($$ select 1 from public.levels $$, '42501', null, 'anon cannot read languages or levels: levels');

-- ---------------------------------------------------------------------------
-- Escritura: estudiante no puede
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok(
  $$ insert into public.levels (language_code, code, name_es, name_en, sort)
     values ('es', 'A1', 'Duplicado', 'Duplicate', 9) $$,
  '42501', null, 'student cannot insert a level'
);

update public.levels set name_es = 'Hackeado' where language_code = 'es' and code = 'A1';

reset role;
select is(
  (select name_es from public.levels where language_code = 'es' and code = 'A1'),
  'A1 Principiante',
  'student cannot insert a level: state unchanged after attempted update'
);

-- ---------------------------------------------------------------------------
-- Admin actualiza y queda auditado
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
update public.levels set name_es = 'A1 Inicial' where language_code = 'es' and code = 'A1';

reset role;
select results_eq(
  $$ select l.name_es,
            (select count(*) from public.audit_logs a
              where a.table_name = 'levels' and a.action = 'UPDATE'
                and a.row_id = l.id::text
                and a.actor = '44444444-4444-4444-4444-444444444444'
                and a.new_data ->> 'name_es' = 'A1 Inicial')
     from public.levels l where l.language_code = 'es' and l.code = 'A1' $$,
  $$ values ('A1 Inicial'::text, 1::bigint) $$,
  'admin can update a level name (and an audit row is written)'
);

-- ---------------------------------------------------------------------------
-- Restricción de código
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.levels (language_code, code, name_es, name_en, sort)
     values ('es', 'D1', 'Inválido', 'Invalid', 7) $$,
  '23514', null, 'level code outside A1-C2 is rejected'
);

select * from finish();
rollback;

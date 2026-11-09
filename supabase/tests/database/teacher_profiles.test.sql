-- Pruebas pgTAP de perfiles públicos de docentes (0012).
-- Todo ocurre dentro de una transacción que se revierte al final: no deja datos.
-- Personas (prefijo d2): A admin, T1 docente, S1 alumno, SU admin suspendida, anon.
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('d2000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd2-admin@test.local', '{}', '{}', now(), now()),
  ('d2000000-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd2-teacher@test.local', '{}', '{"initial_role":"teacher"}', now(), now()),
  ('d2000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd2-student@test.local', '{}', '{}', now(), now()),
  ('d2000000-0000-4000-8000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd2-suspended@test.local', '{}', '{}', now(), now());
insert into public.user_roles (user_id, role) values
  ('d2000000-0000-4000-8000-0000000000a1', 'admin'),
  ('d2000000-0000-4000-8000-0000000000e1', 'admin');
update public.profiles set status = 'suspended' where id = 'd2000000-0000-4000-8000-0000000000e1';

-- Un borrador de prueba (como postgres).
insert into public.teacher_profiles (
  id, slug, name, status, photo_alt_es, photo_alt_en, role_es, role_en, tagline_es, tagline_en,
  meta_description_es, meta_description_en, intro_es, intro_en, body_es, body_en
) values (
  'd2100000-0000-4000-8000-000000000001', 'd2-borrador', 'D2 Borrador', 'draft', 'alt', 'alt', 'rol', 'role',
  'lema', 'tagline', 'meta', 'meta', 'intro', 'intro', 'cuerpo', 'body'
);

-- ---------------------------------------------------------------------------
-- Datos reales de la migración
-- ---------------------------------------------------------------------------
select is(
  (select array_agg(slug order by sort_order) from public.teacher_profiles where slug in ('maribel-mayhua', 'pamela-rojas')),
  array['maribel-mayhua', 'pamela-rojas'],
  'seed has Maribel and then Pamela in order'
);
select is(
  (select count(*)::int from public.teacher_profiles where status = 'published' and slug in ('maribel-mayhua', 'pamela-rojas')),
  2, 'both seeded teachers are published'
);
select ok(
  (select published_at is not null from public.teacher_profiles where slug = 'pamela-rojas'),
  'publishing sets published_at'
);
select ok(
  (select sort_order from public.teacher_profiles where slug = 'd2-borrador') >
  (select sort_order from public.teacher_profiles where slug = 'pamela-rojas'),
  'a new profile gets the next sort_order'
);

-- ---------------------------------------------------------------------------
-- Checks de la tabla
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.teacher_profiles (slug, name, photo_alt_es, photo_alt_en, role_es, role_en, tagline_es, tagline_en,
       meta_description_es, meta_description_en, intro_es, intro_en, body_es, body_en)
     values ('Bad Slug', 'x', 'a', 'a', 'r', 'r', 't', 't', 'm', 'm', 'i', 'i', 'b', 'b') $$,
  '23514', null, 'slug must be lowercase kebab-case'
);
select throws_ok(
  $$ update public.teacher_profiles set photo_path = 'teachers/../x.png' where slug = 'd2-borrador' $$,
  '23514', null, 'photo_path must have the teachers/<uuid>.<ext> shape'
);
select lives_ok(
  $$ update public.teacher_profiles set photo_path = 'teachers/d2100000-0000-4000-8000-0000000000f1.webp' where slug = 'd2-borrador' $$,
  'a well-formed photo_path is accepted'
);
select throws_ok(
  $$ update public.teacher_profiles set facts_es = array['a', 'b'], facts_en = array['a'] where slug = 'd2-borrador' $$,
  '23514', null, 'facts must have the same count in both languages'
);
select throws_ok(
  $$ update public.teacher_profiles set specialty_es = 'solo es' where slug = 'd2-borrador' $$,
  '23514', null, 'specialty needs both languages or none'
);
select throws_ok(
  $$ update public.teacher_profiles set photo_position = 'abc' where slug = 'd2-borrador' $$,
  '23514', null, 'photo_position must look like "50% 30%"'
);

-- ---------------------------------------------------------------------------
-- anon: sin acceso a la tabla; lee por la RPC solo lo publicado y sin columnas internas
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok($$ select 1 from public.teacher_profiles $$, '42501', null, 'anon cannot select teacher_profiles directly');
select is(
  (select count(*)::int from public.list_published_teachers() where slug in ('maribel-mayhua', 'pamela-rojas')),
  2, 'anon lists the two published teachers'
);
select is(
  (select count(*)::int from public.list_published_teachers() where slug = 'd2-borrador'),
  0, 'anon does not see drafts through the RPC'
);
select ok(
  (select pg_get_function_result(p.oid) !~ '(profile_id|created_by|status)'
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'list_published_teachers'),
  'the public RPC exposes no internal columns'
);
select throws_ok($$ select public.move_teacher_profile('d2100000-0000-4000-8000-000000000001', 'up') $$, '42501', null,
  'anon cannot reorder');

-- ---------------------------------------------------------------------------
-- Docente y alumno: solo lo publicado; no escriben
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"d2000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
select is(
  (select count(*)::int from public.teacher_profiles where slug = 'd2-borrador'),
  0, 'a teacher does not see drafts'
);
select is(
  (select count(*)::int from public.teacher_profiles where slug in ('maribel-mayhua', 'pamela-rojas')),
  2, 'a teacher sees published profiles'
);
select lives_ok(
  $$ update public.teacher_profiles set name = 'Hack' where slug = 'maribel-mayhua' $$,
  'a teacher update runs but is filtered by RLS'
);
select is(
  (select name from public.teacher_profiles where slug = 'maribel-mayhua'),
  'Maribel Mayhua', 'a teacher update changed nothing'
);

set local request.jwt.claims = '{"sub":"d2000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select throws_ok(
  $$ insert into public.teacher_profiles (slug, name, photo_alt_es, photo_alt_en, role_es, role_en, tagline_es, tagline_en,
       meta_description_es, meta_description_en, intro_es, intro_en, body_es, body_en)
     values ('d2-alumno', 'x', 'a', 'a', 'r', 'r', 't', 't', 'm', 'm', 'i', 'i', 'b', 'b') $$,
  '42501', null, 'a student cannot insert'
);

-- ---------------------------------------------------------------------------
-- Admin: ve borradores, escribe y reordena; una admin suspendida no
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"d2000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
select is(
  (select count(*)::int from public.teacher_profiles where slug = 'd2-borrador'),
  1, 'admin sees drafts'
);
select lives_ok(
  $$ update public.teacher_profiles set tagline_es = 'nuevo lema' where slug = 'd2-borrador' $$,
  'admin can edit'
);
select lives_ok(
  $$ select public.move_teacher_profile('d2100000-0000-4000-8000-000000000001', 'up') $$,
  'admin can reorder'
);
select ok(
  (select sort_order from public.teacher_profiles where slug = 'd2-borrador') <
  (select sort_order from public.teacher_profiles where slug = 'pamela-rojas'),
  'moving up swaps with the neighbour'
);
select throws_ok(
  $$ select public.move_teacher_profile('d2100000-0000-4000-8000-000000000001', 'sideways') $$,
  '22023', null, 'an invalid direction is rejected'
);

set local request.jwt.claims = '{"sub":"d2000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
select is(
  (select count(*)::int from public.teacher_profiles),
  0, 'a suspended admin sees nothing'
);

select * from finish();
rollback;

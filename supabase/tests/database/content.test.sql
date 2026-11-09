-- Pruebas pgTAP de contenido (0010): recursos, lecciones, bloques, niveles de
-- acceso, guards, orden y lecturas públicas.
-- Todo ocurre dentro de una transacción que se revierte al final: no deja datos.
-- Personas (prefijo d1): A admin, T1 docente, S1 alumno con ficha activa,
-- V visitante (rol student sin ficha), I alumno con ficha inactiva, GU1 tutor de
-- un menor activo, SU admin suspendida, anon.
-- Contenido de prueba: recursos d13…, lecciones d14…, bloques d15….
begin;

create extension if not exists pgtap with schema extensions;

select plan(59);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('d1000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd1-admin@test.local', '{}', '{}', now(), now()),
  ('d1000000-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd1-teacher1@test.local', '{}', '{"initial_role":"teacher"}', now(), now()),
  ('d1000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd1-student1@test.local', '{}', '{}', now(), now()),
  ('d1000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd1-visitor@test.local', '{}', '{}', now(), now()),
  ('d1000000-0000-4000-8000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd1-inactive@test.local', '{}', '{}', now(), now()),
  ('d1000000-0000-4000-8000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd1-guardian1@test.local', '{}', '{"initial_role":"guardian"}', now(), now()),
  ('d1000000-0000-4000-8000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd1-suspended@test.local', '{}', '{}', now(), now());

insert into public.user_roles (user_id, role) values
  ('d1000000-0000-4000-8000-0000000000a1', 'admin'),
  ('d1000000-0000-4000-8000-0000000000e1', 'admin');
update public.profiles set status = 'suspended' where id = 'd1000000-0000-4000-8000-0000000000e1';

insert into public.students (id, profile_id, full_name, audience, status) values
  ('d1100000-0000-4000-8000-0000000000c1', 'd1000000-0000-4000-8000-0000000000c1', 'D1 Student One', 'adults', 'active'),
  ('d1100000-0000-4000-8000-0000000000c3', 'd1000000-0000-4000-8000-0000000000c3', 'D1 Inactive', 'adults', 'inactive'),
  ('d1100000-0000-4000-8000-0000000000f1', null, 'D1 Kid One', 'kids', 'active');
insert into public.guardians (id, profile_id, full_name, email, phone) values
  ('d1200000-0000-4000-8000-0000000000d1', 'd1000000-0000-4000-8000-0000000000d1', 'D1 Guardian One',
   'd1-g1@private.local', '0400 000 111');
insert into public.student_guardians (student_id, guardian_id, relationship) values
  ('d1100000-0000-4000-8000-0000000000f1', 'd1200000-0000-4000-8000-0000000000d1', 'parent');

-- Contenido de partida (como postgres). Recursos: R1 public, R2 account,
-- R3 enrolled (publicados), R4 public en borrador, R9 enrolled publicado sin
-- teaser y R10 account publicado con archivo.
insert into public.resources (id, kind, access_level, status, title_es, title_en, teaser_public, external_url,
                              file_path, file_mime, file_size_bytes) values
  ('d1300000-0000-4000-8000-000000000009', 'link', 'enrolled', 'published', 'D1 sin teaser', 'D1 no teaser', false,
   'https://example.com/r9', null, null, null),
  ('d1300000-0000-4000-8000-000000000010', 'document', 'account', 'published', 'D1 archivo', 'D1 file', true, null,
   'resources/d1300000-0000-4000-8000-000000000010/d1600000-0000-4000-8000-000000000010.pdf', 'application/pdf', 1024);
insert into public.resources (id, kind, access_level, status, title_es, title_en, external_url, youtube_id) values
  ('d1300000-0000-4000-8000-000000000001', 'link', 'public', 'published', 'D1 público', 'D1 public',
   'https://example.com/r1', null),
  ('d1300000-0000-4000-8000-000000000002', 'link', 'account', 'published', 'D1 con cuenta', 'D1 account',
   'https://example.com/r2', null),
  ('d1300000-0000-4000-8000-000000000003', 'video', 'enrolled', 'published', 'D1 alumnos', 'D1 enrolled',
   null, 'abcdefghijk'),
  ('d1300000-0000-4000-8000-000000000004', 'link', 'public', 'draft', 'D1 borrador', 'D1 draft',
   'https://example.com/r4', null);

-- Lecciones artículo L1 public, L2 account, L3 enrolled (se publican después de
-- tener bloques) y L4 borrador.
insert into public.lessons (id, slug, category, level_id, title_es, title_en, access_level)
select v.id::uuid, v.slug, v.category::public.learn_category, l.id, v.title, v.title, v.access::public.access_level
from (values
  ('d1400000-0000-4000-8000-000000000011', 'd1-public', 'kids', 'D1 L public', 'public'),
  ('d1400000-0000-4000-8000-000000000012', 'd1-account', 'adults', 'D1 L account', 'account'),
  ('d1400000-0000-4000-8000-000000000013', 'd1-enrolled', 'adults', 'D1 L enrolled', 'enrolled'),
  ('d1400000-0000-4000-8000-000000000014', 'd1-draft', 'adults', 'D1 L draft', 'public')
) as v (id, slug, category, title, access)
cross join public.levels l
where l.language_code = 'es' and l.code = 'A1';

insert into public.lesson_blocks (id, lesson_id, kind, body_es, body_en) values
  ('d1500000-0000-4000-8000-000000000011', 'd1400000-0000-4000-8000-000000000011', 'text', 'Hola', 'Hello'),
  ('d1500000-0000-4000-8000-000000000012', 'd1400000-0000-4000-8000-000000000012', 'text', 'Hola', 'Hello'),
  ('d1500000-0000-4000-8000-000000000013', 'd1400000-0000-4000-8000-000000000013', 'text', 'Hola', 'Hello'),
  ('d1500000-0000-4000-8000-000000000014', 'd1400000-0000-4000-8000-000000000014', 'text', 'Hola', 'Hello');
insert into public.lesson_blocks (id, lesson_id, kind, body_es, body_en, options_es, options_en, correct_option) values
  ('d1500000-0000-4000-8000-000000000021', 'd1400000-0000-4000-8000-000000000011', 'quiz', '¿Hola?', 'Hello?',
   array['sí', 'no'], array['yes', 'no'], 0);

update public.lessons set status = 'published'
where id in ('d1400000-0000-4000-8000-000000000011', 'd1400000-0000-4000-8000-000000000012',
             'd1400000-0000-4000-8000-000000000013');

-- Visibilidad de las filas de prueba para el usuario actual.
create function pg_temp.d1_resources()
returns setof text language sql as $$
  select right(id::text, 2) from public.resources where id::text like 'd13%' order by 1;
$$;
create function pg_temp.d1_lessons()
returns setof text language sql as $$
  select right(id::text, 2) from public.lessons where id::text like 'd14%' order by 1;
$$;
create function pg_temp.d1_blocks()
returns setof text language sql as $$
  select right(id::text, 2) from public.lesson_blocks where id::text like 'd15%' order by 1;
$$;
grant execute on function pg_temp.d1_resources() to authenticated;
grant execute on function pg_temp.d1_lessons() to authenticated;
grant execute on function pg_temp.d1_blocks() to authenticated;

-- ---------------------------------------------------------------------------
-- Privilegios y datos de la migración
-- ---------------------------------------------------------------------------
select is(
  (select count(*) from information_schema.role_table_grants
   where grantee = 'anon' and table_schema = 'public'
     and table_name in ('resources', 'lessons', 'lesson_blocks')),
  0::bigint,
  'anon has no table privilege on resources, lessons or lesson_blocks'
);
select ok(
  not has_function_privilege('anon', 'public.has_enrolled_access()', 'execute')
  and not has_function_privilege('authenticated', 'public.has_enrolled_access()', 'execute')
  and not has_function_privilege('anon', 'public.text_items_within(text[], integer, integer)', 'execute'),
  'has_enrolled_access and text_items_within are not callable through the API (anon)'
);
select results_eq(
  $$ select slug, component_key, access_level::text, status::text from public.lessons
     where kind = 'interactive' order by slug $$,
  $$ values ('alphabet'::text, 'alphabet'::text, 'public'::text, 'published'::text),
            ('nouns-and-articles', 'nouns', 'public', 'published') $$,
  'the migration ships two interactive lessons and three public videos: lessons'
);
select results_eq(
  $$ select youtube_id, title_lang, access_level::text, status::text from public.resources
     where youtube_id in ('GilfeIjZm_g', 'VSpA7iGcArI', '4Wrww413fvA') and title_lang = 'en' order by sort_order $$,
  $$ values ('GilfeIjZm_g'::text, 'en'::text, 'public'::text, 'published'::text),
            ('VSpA7iGcArI', 'en', 'public', 'published'),
            ('4Wrww413fvA', 'en', 'public', 'published') $$,
  'the migration ships two interactive lessons and three public videos: videos'
);

-- ---------------------------------------------------------------------------
-- content_tier()
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is(public.content_tier(), 'public'::public.access_level, 'content_tier is public for anon');
select throws_ok($$ select 1 from public.resources $$, '42501', null, 'anon cannot select resources directly');
select throws_ok($$ select 1 from public.lesson_blocks $$, '42501', null, 'anon cannot select lesson_blocks directly');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000c2","role":"authenticated"}';
select is(public.content_tier(), 'account'::public.access_level, 'content_tier is account for visitor');
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select is(public.content_tier(), 'enrolled'::public.access_level, 'content_tier is enrolled for student1');
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
select is(public.content_tier(), 'enrolled'::public.access_level, 'content_tier is enrolled for teacher1');
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
select is(public.content_tier(), 'enrolled'::public.access_level, 'content_tier is enrolled for admin');
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000c3","role":"authenticated"}';
select is(public.content_tier(), 'account'::public.access_level,
  'content_tier is account for a student whose students row is inactive');
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000d1","role":"authenticated"}';
select is(public.content_tier(), 'enrolled'::public.access_level, 'content_tier is enrolled for guardian1 of an active minor');
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
select is(public.content_tier(), 'public'::public.access_level, 'content_tier is public for a suspended account');
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000ff","role":"authenticated"}';
select is(public.content_tier(), 'public'::public.access_level, 'content_tier is public for a user without profile');

-- ---------------------------------------------------------------------------
-- Lectura por rol
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000c2","role":"authenticated"}';
select results_eq('select * from pg_temp.d1_resources()', $$ values ('01'), ('02'), ('10') $$,
  'visitor reads public and account published resources but not enrolled ones');
select results_eq('select * from pg_temp.d1_lessons()', $$ values ('11'), ('12') $$,
  'visitor reads public and account published lessons');
select results_eq('select * from pg_temp.d1_blocks()', $$ values ('11'), ('12'), ('21') $$,
  'lesson_blocks of an enrolled lesson are invisible to visitor');

set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select results_eq('select * from pg_temp.d1_resources()', $$ values ('01'), ('02'), ('03'), ('09'), ('10') $$,
  'student1 reads enrolled published resources');
select results_eq('select * from pg_temp.d1_blocks()', $$ values ('11'), ('12'), ('13'), ('21') $$,
  'student1 reads the blocks of every published lesson');

set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000c3","role":"authenticated"}';
select results_eq('select * from pg_temp.d1_resources()', $$ values ('01'), ('02'), ('10') $$,
  'an inactive student reads only up to account');

set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000d1","role":"authenticated"}';
select results_eq('select * from pg_temp.d1_lessons()', $$ values ('11'), ('12'), ('13') $$,
  'guardian1 reads enrolled published lessons');

set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
select results_eq('select * from pg_temp.d1_resources()', $$ values ('01'), ('02'), ('03'), ('09'), ('10') $$,
  'nobody but admin reads drafts: teacher1 resources');
select results_eq('select * from pg_temp.d1_lessons()', $$ values ('11'), ('12'), ('13') $$,
  'nobody but admin reads drafts: teacher1 lessons');
select results_eq('select * from pg_temp.d1_blocks()', $$ values ('11'), ('12'), ('13'), ('21') $$,
  'nobody but admin reads drafts: teacher1 blocks');

set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
select results_eq('select * from pg_temp.d1_resources()', $$ values ('01'), ('02'), ('03'), ('04'), ('09'), ('10') $$,
  'admin reads drafts: resources');
select results_eq('select * from pg_temp.d1_blocks()', $$ values ('11'), ('12'), ('13'), ('14'), ('21') $$,
  'admin reads drafts: blocks');

set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
select is(
  (select count(*) from public.resources) + (select count(*) from public.lessons)
    + (select count(*) from public.lesson_blocks),
  0::bigint,
  'suspended admin reads nothing'
);

-- ---------------------------------------------------------------------------
-- Escritura: solo admin
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
select throws_ok(
  $$ insert into public.resources (kind, title_es, title_en, external_url)
     values ('link', 'T1', 'T1', 'https://example.com/t1') $$,
  '42501', null, 'teacher1 cannot insert a resource (42501)'
);
update public.resources set title_es = 'Hackeado' where id = 'd1300000-0000-4000-8000-000000000001';
delete from public.lessons where id = 'd1400000-0000-4000-8000-000000000011';

set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select throws_ok(
  $$ insert into public.lesson_blocks (lesson_id, kind, body_es, body_en)
     values ('d1400000-0000-4000-8000-000000000011', 'text', 'x', 'x') $$,
  '42501', null, 'student1 cannot insert a lesson block (42501)'
);

reset role;
select results_eq(
  $$ select (select title_es from public.resources where id = 'd1300000-0000-4000-8000-000000000001'),
            (select count(*) from public.lessons where id = 'd1400000-0000-4000-8000-000000000011') $$,
  $$ values ('D1 público'::text, 1::bigint) $$,
  'teacher1 cannot update a resource or delete a lesson (state unchanged)'
);

-- ---------------------------------------------------------------------------
-- Checks y guards (como admin)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-0000000000a1","role":"authenticated"}';

insert into public.resources (id, kind, access_level, title_es, title_en)
values ('d1300000-0000-4000-8000-000000000005', 'document', 'account', 'D1 sin origen', 'D1 no source');
select throws_ok(
  $$ update public.resources set status = 'published' where id = 'd1300000-0000-4000-8000-000000000005' $$,
  'P0001', 'content_incomplete', 'publishing a resource without a source raises content_incomplete'
);
select throws_ok(
  $$ insert into public.resources (kind, title_es, title_en, youtube_id, file_path, file_mime, file_size_bytes)
     values ('document', 'x', 'x', 'abcdefghijk',
             'resources/d1300000-0000-4000-8000-000000000006/d1300000-0000-4000-8000-000000000007.pdf',
             'application/pdf', 10) $$,
  '23514', null, 'a resource with a youtube_id and a file_path is rejected (23514)'
);
select throws_ok(
  $$ insert into public.resources (kind, title_es, title_en, external_url)
     values ('link', 'x', 'x', 'http://example.com') $$,
  '23514', null, 'an external_url without https is rejected'
);
select throws_ok(
  $$ insert into public.resources (kind, title_es, title_en, file_path)
     values ('document', 'x', 'x',
             'resources/d1300000-0000-4000-8000-000000000006/d1300000-0000-4000-8000-000000000007.pdf') $$,
  '23514', null, 'a file_path without mime and size is rejected'
);

insert into public.lessons (id, slug, category, title_es, title_en)
values ('d1400000-0000-4000-8000-000000000015', 'd1-empty', 'foundations', 'D1 vacía', 'D1 empty');
select throws_ok(
  $$ update public.lessons set status = 'published' where id = 'd1400000-0000-4000-8000-000000000015' $$,
  'P0001', 'content_incomplete', 'publishing an article lesson without blocks raises content_incomplete'
);
select throws_ok(
  $$ update public.lessons set slug = 'abecedario' where component_key = 'alphabet' $$,
  '42501', 'forbidden', 'changing the slug of an interactive lesson raises forbidden'
);
select throws_ok(
  $$ delete from public.lessons where component_key = 'nouns' $$,
  '42501', 'forbidden', 'an interactive lesson cannot be deleted'
);
select throws_ok(
  $$ insert into public.lesson_blocks (lesson_id, kind, body_es, body_en)
     select id, 'text', 'x', 'x' from public.lessons where component_key = 'alphabet' $$,
  '42501', 'forbidden', 'an interactive lesson does not accept blocks'
);
select throws_ok(
  $$ update public.lessons set access_level = 'account' where component_key = 'alphabet' $$,
  '23514', null, 'an interactive lesson with access_level account is rejected'
);
select throws_ok(
  $$ insert into public.lessons (slug, category, title_es, title_en) values ('d1-kids', 'kids', 'x', 'x') $$,
  '23514', null, 'a kids lesson without level is rejected'
);
select throws_ok(
  $$ insert into public.lessons (slug, category, title_es, title_en) values ('D1 Mal', 'foundations', 'x', 'x') $$,
  '23514', null, 'a slug with spaces or capitals is rejected'
);
select throws_ok(
  $$ insert into public.lessons (slug, category, title_es, title_en) values ('d1-public', 'foundations', 'x', 'x') $$,
  '23505', null, 'a repeated slug is rejected (lessons_slug_key)'
);

-- L2 tiene un único bloque.
select throws_ok(
  $$ delete from public.lesson_blocks where id = 'd1500000-0000-4000-8000-000000000012' $$,
  'P0001', 'content_incomplete', 'deleting the last block of a published lesson raises content_incomplete'
);
select lives_ok(
  $$ delete from public.lesson_blocks where id = 'd1500000-0000-4000-8000-000000000021' $$,
  'deleting a block that is not the last one works'
);
select lives_ok(
  $$ delete from public.lessons where id = 'd1400000-0000-4000-8000-000000000013' $$,
  'deleting a published article lesson cascades to its blocks'
);

select throws_ok(
  $$ insert into public.lesson_blocks (lesson_id, kind, body_es, body_en, options_es, options_en, correct_option)
     values ('d1400000-0000-4000-8000-000000000014', 'quiz', '¿?', '?',
             array['a','b','c','d','e'], array['a','b','c','d','e'], 0) $$,
  '23514', null, 'a quiz block with 5 options or mismatched es/en options is rejected: 5 options'
);
select throws_ok(
  $$ insert into public.lesson_blocks (lesson_id, kind, body_es, body_en, options_es, options_en, correct_option)
     values ('d1400000-0000-4000-8000-000000000014', 'quiz', '¿?', '?', array['a','b','c'], array['a','b'], 0) $$,
  '23514', null, 'a quiz block with 5 options or mismatched es/en options is rejected: mismatched'
);
select throws_ok(
  $$ insert into public.lesson_blocks (lesson_id, kind, body_es, body_en, options_es, options_en, correct_option)
     values ('d1400000-0000-4000-8000-000000000014', 'quiz', '¿?', '?', array['a','b'], array['a','b'], 2) $$,
  '23514', null, 'a quiz block whose correct_option is out of range is rejected'
);
select throws_ok(
  format(
    $$ insert into public.lesson_blocks (lesson_id, kind, body_es, body_en, options_es, options_en, correct_option)
       values ('d1400000-0000-4000-8000-000000000014', 'quiz', '¿?', '?', array['a', %L], array['a', 'b'], 0) $$,
    repeat('x', 121)
  ),
  '23514', null, 'a quiz option longer than 120 chars is rejected'
);
select lives_ok(
  $$ insert into public.lesson_blocks (lesson_id, kind, body_es, body_en, options_es, options_en, correct_option)
     values ('d1400000-0000-4000-8000-000000000014', 'quiz', '¿?', '?', array['a','b','c','d'],
             array['a','b','c','d'], 3) $$,
  'admin inserts a valid quiz block with 4 options'
);
select throws_ok(
  $$ insert into public.lesson_blocks (lesson_id, kind, body_es, body_en, youtube_id)
     values ('d1400000-0000-4000-8000-000000000014', 'text', 'x', 'x', 'abcdefghijk') $$,
  '23514', null, 'a text block with fields of another kind is rejected'
);
select throws_ok(
  $$ insert into public.lesson_blocks (lesson_id, kind, image_path, alt_es, alt_en)
     values ('d1400000-0000-4000-8000-000000000014', 'image',
             'lessons/d1400000-0000-4000-8000-000000000014/d1500000-0000-4000-8000-000000000099.png', 'a', 'a') $$,
  '23514', null, 'an image block without dimensions is rejected'
);

-- Orden automático.
insert into public.resources (id, kind, access_level, title_es, title_en)
values ('d1300000-0000-4000-8000-000000000008', 'document', 'enrolled', 'D1 orden', 'D1 order');
select is(
  (select sort_order from public.resources where id = 'd1300000-0000-4000-8000-000000000008'),
  (select max(sort_order) from public.resources
   where access_level = 'enrolled' and id <> 'd1300000-0000-4000-8000-000000000008') + 10,
  'new rows get sort_order max + 10 in their group: resources'
);
insert into public.lesson_blocks (id, lesson_id, kind, body_es, body_en)
values ('d1500000-0000-4000-8000-000000000031', 'd1400000-0000-4000-8000-000000000011', 'text', 'b', 'b');
select results_eq(
  $$ select position from public.lesson_blocks where lesson_id = 'd1400000-0000-4000-8000-000000000011'
     order by position $$,
  $$ values (10), (20) $$,
  'new rows get sort_order max + 10 in their group: blocks'
);
select is(
  (select sort_order from public.lessons where id = 'd1400000-0000-4000-8000-000000000015'),
  (select coalesce(max(sort_order), 0) from public.lessons
   where category = 'foundations' and level_id is null and id <> 'd1400000-0000-4000-8000-000000000015') + 10,
  'new rows get sort_order max + 10 in their group: lessons'
);

-- published_at.
update public.resources set status = 'published', external_url = 'https://example.com/r5',
  kind = 'link'
where id = 'd1300000-0000-4000-8000-000000000005';
select isnt(
  (select published_at from public.resources where id = 'd1300000-0000-4000-8000-000000000005'),
  null,
  'published_at is set on first publish and kept on later edits: set'
);
update public.resources set published_at = '2026-01-01 00:00+00' where id = 'd1300000-0000-4000-8000-000000000005';
update public.resources set title_es = 'D1 editado', status = 'draft' where id = 'd1300000-0000-4000-8000-000000000005';
update public.resources set status = 'published' where id = 'd1300000-0000-4000-8000-000000000005';
select is(
  (select published_at from public.resources where id = 'd1300000-0000-4000-8000-000000000005'),
  '2026-01-01 00:00+00'::timestamptz,
  'published_at is set on first publish and kept on later edits: kept'
);

-- Auditoría.
update public.resources set title_en = 'D1 audited' where id = 'd1300000-0000-4000-8000-000000000001';
reset role;
select is(
  (select count(*) from public.audit_logs
   where table_name = 'resources' and action = 'UPDATE'
     and row_id = 'd1300000-0000-4000-8000-000000000001'
     and actor = 'd1000000-0000-4000-8000-0000000000a1'
     and new_data ->> 'title_en' = 'D1 audited'),
  1::bigint,
  'admin update of a resource writes an audit row'
);

select * from finish();
rollback;

-- Pruebas pgTAP de alumnos, datos privados, tutores y consentimientos (0009).
-- Todo ocurre dentro de una transacción que se revierte al final: no deja datos.
-- Personas (prefijo c9): A admin, T1 docente, S1 y S2 alumnos con cuenta,
-- GU1 tutor de K1 (menor), GU2 tutor de K2, SU admin suspendida, anon.
begin;

create extension if not exists pgtap with schema extensions;

select plan(47);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('c9000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'c9-admin@test.local', '{}', '{}', now(), now()),
  ('c9000000-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'c9-teacher1@test.local', '{}', '{"initial_role":"teacher"}', now(), now()),
  ('c9000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'c9-student1@test.local', '{}', '{}', now(), now()),
  ('c9000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'c9-student2@test.local', '{}', '{}', now(), now()),
  ('c9000000-0000-4000-8000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'c9-guardian1@test.local', '{}', '{"initial_role":"guardian"}', now(), now()),
  ('c9000000-0000-4000-8000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'c9-guardian2@test.local', '{}', '{"initial_role":"guardian"}', now(), now()),
  ('c9000000-0000-4000-8000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'c9-suspended@test.local', '{}', '{}', now(), now());

insert into public.user_roles (user_id, role) values
  ('c9000000-0000-4000-8000-0000000000a1', 'admin'),
  ('c9000000-0000-4000-8000-0000000000e1', 'admin');
update public.profiles set status = 'suspended' where id = 'c9000000-0000-4000-8000-0000000000e1';

-- Datos de partida (como postgres).
insert into public.consent_texts (id, kind, body_es, body_en, effective_from) values
  ('ctest_minor_data-v1', 'minor_data', 'Texto de prueba', 'Test text', '2026-01-01'),
  ('ctest_privacy-v1', 'privacy', 'Privacidad de prueba', 'Test privacy', '2026-01-01');

insert into public.students (id, profile_id, full_name, audience) values
  ('c9100000-0000-4000-8000-0000000000c1', 'c9000000-0000-4000-8000-0000000000c1', 'C9 Student One', 'adults'),
  ('c9100000-0000-4000-8000-0000000000c2', 'c9000000-0000-4000-8000-0000000000c2', 'C9 Student Two', 'mature'),
  ('c9100000-0000-4000-8000-0000000000f1', null, 'C9 Kid One', 'kids'),
  ('c9100000-0000-4000-8000-0000000000f2', null, 'C9 Kid Two', 'kids');
insert into public.student_private (student_id, email, phone, birth_year) values
  ('c9100000-0000-4000-8000-0000000000c1', 'c9-s1@private.local', '0400 000 001', 1980),
  ('c9100000-0000-4000-8000-0000000000c2', 'c9-s2@private.local', '0400 000 002', 1950),
  ('c9100000-0000-4000-8000-0000000000f1', null, null, 2018),
  ('c9100000-0000-4000-8000-0000000000f2', null, null, 2017);
insert into public.student_admin_notes (student_id, notes) values
  ('c9100000-0000-4000-8000-0000000000c1', 'C9 note about S1'),
  ('c9100000-0000-4000-8000-0000000000f1', 'C9 note about K1');
insert into public.guardians (id, profile_id, full_name, email, phone) values
  ('c9200000-0000-4000-8000-0000000000d1', 'c9000000-0000-4000-8000-0000000000d1', 'C9 Guardian One', 'c9-g1@private.local', '0400 000 011'),
  ('c9200000-0000-4000-8000-0000000000d2', 'c9000000-0000-4000-8000-0000000000d2', 'C9 Guardian Two', 'c9-g2@private.local', '0400 000 012');
insert into public.student_guardians (student_id, guardian_id, relationship) values
  ('c9100000-0000-4000-8000-0000000000f1', 'c9200000-0000-4000-8000-0000000000d1', 'parent'),
  ('c9100000-0000-4000-8000-0000000000f2', 'c9200000-0000-4000-8000-0000000000d2', 'parent');
insert into public.consents (student_id, guardian_id, text_id, kind, granted, method) values
  ('c9100000-0000-4000-8000-0000000000f1', 'c9200000-0000-4000-8000-0000000000d1', 'ctest_minor_data-v1', 'minor_data', true, 'paper'),
  ('c9100000-0000-4000-8000-0000000000f2', 'c9200000-0000-4000-8000-0000000000d2', 'ctest_minor_data-v1', 'minor_data', true, 'paper');

-- Visibilidad de las filas de prueba (c9…) para el usuario actual.
create function pg_temp.c9_visible()
returns table (students bigint, private bigint, guardians bigint, links bigint, consents bigint)
language sql as $$
  select
    (select count(*) from public.students where id::text like 'c91%'),
    (select count(*) from public.student_private where student_id::text like 'c91%'),
    (select count(*) from public.guardians where id::text like 'c92%'),
    (select count(*) from public.student_guardians where student_id::text like 'c91%'),
    (select count(*) from public.consents where student_id::text like 'c91%');
$$;
grant execute on function pg_temp.c9_visible() to authenticated;

set local role authenticated;

-- ---------------------------------------------------------------------------
-- Lectura por rol
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"c9000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
select results_eq('select * from pg_temp.c9_visible()',
  $$ values (4::bigint, 4::bigint, 2::bigint, 2::bigint, 2::bigint) $$,
  'admin reads every student, private row, guardian, link and consent');
select results_eq(
  $$ select count(*) from public.student_admin_notes where student_id::text like 'c91%' $$,
  $$ values (2::bigint) $$,
  'admin reads admin notes'
);

set local request.jwt.claims = '{"sub":"c9000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select results_eq(
  $$ select id::text from public.students where id::text like 'c91%' $$,
  array['c9100000-0000-4000-8000-0000000000c1'],
  'student reads only own students row'
);
select results_eq(
  $$ select email from public.student_private where student_id::text like 'c91%' $$,
  array['c9-s1@private.local'],
  'student reads own student_private but not others'
);
select results_eq('select guardians, links, consents from pg_temp.c9_visible()',
  $$ values (0::bigint, 0::bigint, 0::bigint) $$,
  'an adult student reads no guardians, links or consents of others');
update public.students set full_name = 'Hacked', status = 'inactive' where id = 'c9100000-0000-4000-8000-0000000000c1';
update public.student_private set phone = 'Hacked' where student_id = 'c9100000-0000-4000-8000-0000000000c1';
select is_empty(
  $$ select 1 from public.student_admin_notes $$,
  'student cannot read admin notes, not even their own'
);
select throws_ok(
  $$ insert into public.students (full_name, audience) values ('Fake', 'adults') $$,
  '42501', null, 'student cannot insert a student'
);

set local request.jwt.claims = '{"sub":"c9000000-0000-4000-8000-0000000000d1","role":"authenticated"}';
select results_eq(
  $$ select (select string_agg(id::text, ',') from public.students where id::text like 'c91%'),
            (select string_agg(student_id::text, ',') from public.student_private where student_id::text like 'c91%'),
            (select string_agg(student_id::text, ',') from public.consents where student_id::text like 'c91%'),
            (select string_agg(id::text, ',') from public.guardians where id::text like 'c92%') $$,
  $$ values ('c9100000-0000-4000-8000-0000000000f1'::text, 'c9100000-0000-4000-8000-0000000000f1'::text,
             'c9100000-0000-4000-8000-0000000000f1'::text, 'c9200000-0000-4000-8000-0000000000d1'::text) $$,
  'guardian reads own minors and their consents only'
);
select is_empty(
  $$ select 1 from public.students where id = 'c9100000-0000-4000-8000-0000000000f2'
     union all select 1 from public.consents where student_id = 'c9100000-0000-4000-8000-0000000000f2'
     union all select 1 from public.student_guardians where student_id = 'c9100000-0000-4000-8000-0000000000f2' $$,
  'guardian cannot read another guardian''s minor'
);
select is_empty(
  $$ select 1 from public.student_admin_notes $$,
  'guardian cannot read the admin notes of their minor'
);
select throws_ok(
  $$ insert into public.consents (student_id, guardian_id, text_id, kind, granted, method)
     values ('c9100000-0000-4000-8000-0000000000f1', 'c9200000-0000-4000-8000-0000000000d1',
             'ctest_minor_data-v1', 'minor_data', false, 'portal') $$,
  '42501', null, 'guardian cannot record a consent directly (portal comes in milestone 2)'
);

set local request.jwt.claims = '{"sub":"c9000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
select results_eq('select * from pg_temp.c9_visible()',
  $$ values (0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint) $$,
  'teacher cannot read student_private, guardians or consents (nor students without enrolments)');
select is_empty(
  $$ select 1 from public.student_admin_notes $$,
  'teacher cannot read admin notes'
);
select throws_ok(
  $$ insert into public.student_admin_notes (student_id, notes)
     values ('c9100000-0000-4000-8000-0000000000c2', 'teacher note') $$,
  '42501', null, 'teacher cannot write admin notes'
);
select results_eq(
  $$ select count(*) from public.consent_texts where id like 'ctest_%' $$,
  $$ values (2::bigint) $$,
  'teacher reads consent texts'
);
select throws_ok(
  $$ select public.create_student('{"full_name":"T","audience":"adults"}'::jsonb) $$,
  '42501', null, 'teacher cannot execute create_student (42501)'
);

set local request.jwt.claims = '{"sub":"c9000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
select results_eq('select * from pg_temp.c9_visible()',
  $$ values (0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint) $$,
  'suspended admin reads nothing');
select is_empty($$ select 1 from public.student_admin_notes $$, 'suspended admin cannot read admin notes');
select throws_ok(
  $$ select public.create_student('{"full_name":"T","audience":"adults"}'::jsonb) $$,
  '42501', null, 'suspended admin cannot execute create_student'
);

reset role;
select results_eq(
  $$ select s.full_name, s.status::text, p.phone
     from public.students s join public.student_private p on p.student_id = s.id
     where s.id = 'c9100000-0000-4000-8000-0000000000c1' $$,
  $$ values ('C9 Student One'::text, 'active'::text, '0400 000 001'::text) $$,
  'student updates of own rows change nothing'
);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select 1 from public.students $$, '42501', null, 'anon reads nothing: students');
select throws_ok($$ select 1 from public.student_private $$, '42501', null, 'anon reads nothing: student_private');
select throws_ok($$ select 1 from public.consents $$, '42501', null, 'anon reads nothing: consents');
select throws_ok($$ select public.create_student('{}'::jsonb) $$, '42501', null, 'anon cannot execute create_student');

-- ---------------------------------------------------------------------------
-- Invariantes
-- ---------------------------------------------------------------------------
reset role;
select throws_ok(
  $$ insert into public.students (profile_id, full_name, audience)
     values ('c9000000-0000-4000-8000-0000000000a1', 'Kid with account', 'kids') $$,
  '23514', null, 'a minor with a profile_id is rejected'
);
select throws_ok(
  $$ insert into public.guardians (profile_id, full_name, email)
     values ('c9000000-0000-4000-8000-0000000000b1', 'Not a guardian', 'x@test.local') $$,
  'P0001', 'forbidden', 'linking a guardian profile without guardian role is rejected'
);
select throws_ok(
  $$ update public.students set profile_id = 'c9000000-0000-4000-8000-0000000000b1'
     where id = 'c9100000-0000-4000-8000-0000000000c2' $$,
  'P0001', 'forbidden', 'linking a student profile without student role is rejected'
);
select throws_ok(
  $$ insert into public.consents (student_id, guardian_id, text_id, kind, granted, method)
     values ('c9100000-0000-4000-8000-0000000000f1', 'c9200000-0000-4000-8000-0000000000d1',
             'ctest_privacy-v1', 'minor_data', true, 'paper') $$,
  '23503', null, 'a consent whose kind differs from its text kind is rejected'
);
select throws_ok(
  $$ insert into public.consents (student_id, text_id, kind, granted, method)
     values ('c9100000-0000-4000-8000-0000000000f1', 'ctest_minor_data-v1', 'minor_data', true, 'paper') $$,
  'P0001', 'guardian_required', 'a consent for a minor without guardian raises guardian_required'
);
select throws_ok(
  $$ insert into public.consents (student_id, guardian_id, text_id, kind, granted, method)
     values ('c9100000-0000-4000-8000-0000000000f1', 'c9200000-0000-4000-8000-0000000000d2',
             'ctest_minor_data-v1', 'minor_data', true, 'paper') $$,
  'P0001', 'guardian_required', 'a consent signed by a guardian of another child is rejected'
);

-- has_current_consent: el último registro manda (la revocación gana).
select ok(public.has_current_consent('c9100000-0000-4000-8000-0000000000f1', 'minor_data'),
  'has_current_consent is true after a grant');
insert into public.consents (student_id, guardian_id, text_id, kind, granted, method) values
  ('c9100000-0000-4000-8000-0000000000f1', 'c9200000-0000-4000-8000-0000000000d1', 'ctest_minor_data-v1', 'minor_data', false, 'email');
select ok(not public.has_current_consent('c9100000-0000-4000-8000-0000000000f1', 'minor_data'),
  'has_current_consent follows the latest record (revocation wins)');
select ok(not public.has_current_consent('c9100000-0000-4000-8000-0000000000c1', 'minor_data'),
  'has_current_consent is false without records');
select ok(
  not has_function_privilege('authenticated', 'public.has_current_consent(uuid, public.consent_kind)', 'execute')
  and not has_function_privilege('anon', 'public.has_current_consent(uuid, public.consent_kind)', 'execute'),
  'has_current_consent is internal (no EXECUTE for API roles)'
);

select ok(
  not has_function_privilege('anon', 'public.current_student_ids()', 'execute')
  and not has_function_privilege('anon', 'public.guarded_student_ids()', 'execute')
  and not has_function_privilege('anon', 'public.current_guardian_ids()', 'execute')
  and not has_function_privilege('anon', 'public.can_view_student(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.create_student(jsonb)', 'execute')
  and not has_function_privilege('service_role', 'public.create_student(jsonb)', 'execute'),
  'people helper functions are not executable by anon (create_student neither by service_role)'
);
select ok(
  (select bool_and(p.prosecdef and p.proconfig @> array['search_path=""'])
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('check_linked_profile', 'consents_before_insert', 'current_student_ids',
                       'current_guardian_ids', 'guarded_student_ids', 'can_view_student',
                       'has_current_consent', 'create_student')),
  'every security definer function of 0009 pins an empty search_path'
);

-- ---------------------------------------------------------------------------
-- Append-only, incluso para admin
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"c9000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
select throws_ok(
  $$ update public.consents set granted = true where student_id = 'c9100000-0000-4000-8000-0000000000f2' $$,
  '42501', null, 'consents cannot be updated or deleted, even by admin: update'
);
select throws_ok(
  $$ delete from public.consents where student_id = 'c9100000-0000-4000-8000-0000000000f2' $$,
  '42501', null, 'consents cannot be updated or deleted, even by admin: delete'
);
select throws_ok(
  $$ update public.consent_texts set body_es = 'Cambiado' where id = 'ctest_minor_data-v1' $$,
  '42501', null, 'consent texts cannot be edited, even by admin'
);
select lives_ok(
  $$ insert into public.consent_texts (id, kind, body_es, body_en, effective_from)
     values ('ctest_minor_data-v2', 'minor_data', 'Texto v2', 'Text v2', '2026-06-01') $$,
  'admin adds a new consent text version'
);

-- ---------------------------------------------------------------------------
-- create_student
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ select public.create_student('{"full_name":"C9 Kid NG","audience":"kids",
       "consent":{"text_id":"ctest_minor_data-v1","method":"paper"}}'::jsonb) $$,
  'P0001', 'guardian_required', 'create_student for a minor without guardian raises guardian_required'
);
select throws_ok(
  $$ select public.create_student('{"full_name":"C9 Kid NC","audience":"kids",
       "guardian":{"full_name":"C9 New Guardian","email":"c9-new@private.local","relationship":"parent"}}'::jsonb) $$,
  'P0001', 'consent_required', 'create_student for a minor without consent raises consent_required'
);
select throws_ok(
  $$ select public.create_student('{"full_name":"C9 Kid WT","audience":"kids",
       "guardian":{"full_name":"C9 New Guardian","email":"c9-new@private.local","relationship":"parent"},
       "consent":{"text_id":"ctest_privacy-v1","method":"paper"}}'::jsonb) $$,
  'P0001', 'consent_required', 'create_student with a consent text of another kind raises consent_required'
);

create temporary table c9_new (id uuid) on commit drop;
grant insert, select on c9_new to authenticated;
insert into c9_new
select public.create_student('{"full_name":"C9 Kid New","audience":"kids","birth_year":2019,"admin_notes":"Alergia: ninguna conocida",
  "guardian":{"full_name":"C9 New Guardian","email":"c9-new@private.local","phone":"0400 000 099","relationship":"legal_guardian"},
  "consent":{"text_id":"ctest_minor_data-v1","method":"paper"}}'::jsonb);
insert into c9_new
select public.create_student('{"full_name":"C9 Kid Sibling","audience":"kids",
  "guardian":{"id":"c9200000-0000-4000-8000-0000000000d1"},
  "consent":{"text_id":"ctest_minor_data-v1","method":"email"}}'::jsonb);

reset role;
select results_eq(
  $$ select s.full_name, s.is_minor, p.birth_year, g.email, sg.relationship, c.kind::text, c.granted,
            c.recorded_by::text, (select count(*) from public.guardians where email = 'c9-new@private.local')
     from c9_new n
     join public.students s on s.id = n.id
     join public.student_private p on p.student_id = s.id
     join public.student_guardians sg on sg.student_id = s.id
     join public.guardians g on g.id = sg.guardian_id
     join public.consents c on c.student_id = s.id and c.guardian_id = g.id
     order by s.full_name $$,
  $$ values
       ('C9 Kid New'::text, true, 2019::smallint, 'c9-new@private.local'::text, 'legal_guardian'::text, 'minor_data'::text, true,
        'c9000000-0000-4000-8000-0000000000a1'::text, 1::bigint),
       ('C9 Kid Sibling'::text, true, null::smallint, 'c9-g1@private.local'::text, 'parent'::text, 'minor_data'::text, true,
        'c9000000-0000-4000-8000-0000000000a1'::text, 1::bigint) $$,
  'create_student for a minor writes student, guardian link and consent atomically (new or existing guardian)'
);
select results_eq(
  $$ select n.notes, n.updated_by::text from public.student_admin_notes n
     join public.students s on s.id = n.student_id where s.full_name like 'C9 Kid%' and s.id::text not like 'c91%' $$,
  $$ values ('Alergia: ninguna conocida'::text, 'c9000000-0000-4000-8000-0000000000a1'::text) $$,
  'create_student stores admin notes only in student_admin_notes, stamped with the admin'
);
select ok(
  not exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'student_private' and column_name = 'admin_notes'),
  'student_private has no admin_notes column (notes live in student_admin_notes)'
);
select is(
  (select count(*) from public.students where full_name in ('C9 Kid NG', 'C9 Kid NC', 'C9 Kid WT')),
  0::bigint,
  'a failed create_student leaves no student behind'
);

select * from finish();
rollback;

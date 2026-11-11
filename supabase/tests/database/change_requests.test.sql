-- change_requests.test.sql — cambios de clase (0037)
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('e3000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e3-admin@test.local', '{}', '{}', now(), now()),
  ('e3000000-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e3-teacher1@test.local', '{}', '{"initial_role":"teacher"}', now(), now()),
  ('e3000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e3-teacher2@test.local', '{}', '{"initial_role":"teacher"}', now(), now()),
  ('e3000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e3-student1@test.local', '{}', '{}', now(), now()),
  ('e3000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e3-student2@test.local', '{}', '{}', now(), now());
insert into public.user_roles (user_id, role) values ('e3000000-0000-4000-8000-0000000000a1', 'admin');

insert into public.students (id, profile_id, full_name, audience) values
  ('e3100000-0000-4000-8000-0000000000c1', 'e3000000-0000-4000-8000-0000000000c1', 'E3 Student One', 'adults'),
  ('e3100000-0000-4000-8000-0000000000c2', 'e3000000-0000-4000-8000-0000000000c2', 'E3 Student Two', 'adults');
insert into public.programs (id, code, name_es, name_en, language_code, audience, format)
values ('e3500000-0000-4000-8000-000000000001', 'e3-prog', 'E3 programa', 'E3 program', 'es', 'adults', 'local_group');
insert into public.groups (id, code, name, program_id, teacher_id, format, capacity, status)
values ('e3500000-0000-4000-8000-0000000000a1', 'E3-GA', 'E3 grupo', 'e3500000-0000-4000-8000-000000000001', 'e3000000-0000-4000-8000-0000000000b1', 'local_group', 5, 'active');
insert into public.enrollments (student_id, group_id, billing_mode, starts_on)
values ('e3100000-0000-4000-8000-0000000000c1', 'e3500000-0000-4000-8000-0000000000a1', 'free', current_date - 30);
insert into public.sessions (id, group_id, starts_at, ends_at, teacher_id) values
  ('e3500000-0000-4000-8000-0000000000c1', 'e3500000-0000-4000-8000-0000000000a1', now() + interval '2 days', now() + interval '2 days 1 hour', 'e3000000-0000-4000-8000-0000000000b1'),
  ('e3500000-0000-4000-8000-0000000000c2', 'e3500000-0000-4000-8000-0000000000a1', now() - interval '1 hour', now() + interval '10 minutes', 'e3000000-0000-4000-8000-0000000000b1');

-- ---------------------------------------------------------------------------
-- El alumno pide
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"e3000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
set local role authenticated;
select lives_ok($$ insert into public.session_change_requests (session_id, student_id, kind, note) values ('e3500000-0000-4000-8000-0000000000c1', 'e3100000-0000-4000-8000-0000000000c1', 'absence', 'Viaje') $$,
  'a student asks to miss an upcoming class');
select throws_ok($$ insert into public.session_change_requests (session_id, student_id, kind) values ('e3500000-0000-4000-8000-0000000000c1', 'e3100000-0000-4000-8000-0000000000c1', 'reschedule') $$,
  '23505', null, 'only one pending request per student and class');
select throws_ok($$ insert into public.session_change_requests (session_id, student_id, kind) values ('e3500000-0000-4000-8000-0000000000c2', 'e3100000-0000-4000-8000-0000000000c1', 'absence') $$,
  'P0001', 'session_not_editable', 'a class that already started cannot be changed');
select throws_ok($$ insert into public.session_change_requests (session_id, student_id, kind) values ('e3500000-0000-4000-8000-0000000000c1', 'e3100000-0000-4000-8000-0000000000c2', 'absence') $$,
  'P0001', 'not_in_roster', 'a student cannot ask on behalf of someone who is not in the class');
select throws_ok($$ update public.session_change_requests set status = 'approved' $$,
  '42501', null, 'a student cannot approve their own request');

-- ---------------------------------------------------------------------------
-- La docente decide
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"e3000000-0000-4000-8000-0000000000b2","role":"authenticated"}';
select is((select count(*)::int from public.session_change_requests), 0, 'another teacher sees nothing');

set local request.jwt.claims = '{"sub":"e3000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
select is((select count(*)::int from public.session_change_requests), 1, 'the class teacher sees the request');
select lives_ok($$ update public.session_change_requests set status = 'approved', response_note = 'Gracias por avisar' $$, 'the class teacher approves');

reset role;
select is((select decided_by from public.session_change_requests), 'e3000000-0000-4000-8000-0000000000b1'::uuid, 'the database records who decided');
select isnt((select decided_at from public.session_change_requests), null, 'and when');

set local request.jwt.claims = '{"sub":"e3000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
set local role authenticated;
select throws_ok($$ update public.session_change_requests set status = 'declined' $$, 'P0001', 'conflict', 'a decided request cannot be changed again');

set local request.jwt.claims = '{"sub":"e3000000-0000-4000-8000-0000000000c2","role":"authenticated"}';
select is((select count(*)::int from public.session_change_requests), 0, 'another student sees nothing');

reset role;
select * from finish();
rollback;

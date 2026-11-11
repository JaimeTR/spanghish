-- sessions_attendance.test.sql — horarios, sesiones y asistencia (0036)
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('e2000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e2-admin@test.local', '{}', '{}', now(), now()),
  ('e2000000-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e2-teacher1@test.local', '{}', '{"initial_role":"teacher"}', now(), now()),
  ('e2000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e2-teacher2@test.local', '{}', '{"initial_role":"teacher"}', now(), now()),
  ('e2000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e2-student1@test.local', '{}', '{}', now(), now()),
  ('e2000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e2-student2@test.local', '{}', '{}', now(), now());
insert into public.user_roles (user_id, role) values ('e2000000-0000-4000-8000-0000000000a1', 'admin');

insert into public.students (id, profile_id, full_name, audience) values
  ('e2100000-0000-4000-8000-0000000000c1', 'e2000000-0000-4000-8000-0000000000c1', 'E2 Student One', 'adults'),
  ('e2100000-0000-4000-8000-0000000000c2', 'e2000000-0000-4000-8000-0000000000c2', 'E2 Student Two', 'adults');

insert into public.programs (id, code, name_es, name_en, language_code, audience, format)
values ('e2500000-0000-4000-8000-000000000001', 'e2-prog', 'E2 programa', 'E2 program', 'es', 'adults', 'local_group');
insert into public.program_editions (id, program_id, starts_on, ends_on, status)
values ('e2500000-0000-4000-8000-000000000003', 'e2500000-0000-4000-8000-000000000001', current_date, current_date + 90, 'open');
insert into public.groups (id, code, name, program_id, edition_id, teacher_id, format, capacity, status) values
  ('e2500000-0000-4000-8000-0000000000a1', 'E2-GA', 'E2 grupo A', 'e2500000-0000-4000-8000-000000000001', 'e2500000-0000-4000-8000-000000000003', 'e2000000-0000-4000-8000-0000000000b1', 'local_group', 5, 'active');
insert into public.enrollments (student_id, group_id, billing_mode, starts_on)
values ('e2100000-0000-4000-8000-0000000000c1', 'e2500000-0000-4000-8000-0000000000a1', 'free', current_date - 30);
-- Regla: mañana a las 18:00 de Brisbane, cada semana.
insert into public.schedule_rules (id, group_id, weekday, start_time, starts_on)
values ('e2500000-0000-4000-8000-0000000000b1', 'e2500000-0000-4000-8000-0000000000a1',
        extract(isodow from public.school_today() + 1)::int, '18:00', public.school_today());

-- ---------------------------------------------------------------------------
-- Generar sesiones
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
set local role authenticated;
select throws_ok($$ select public.generate_sessions('e2500000-0000-4000-8000-0000000000a1', current_date + 21) $$,
  '42501', 'forbidden', 'a teacher cannot generate sessions');

set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
select is(public.generate_sessions('e2500000-0000-4000-8000-0000000000a1', public.school_today() + 22), 4,
  'admin generates one session per week until the date');
select is(public.generate_sessions('e2500000-0000-4000-8000-0000000000a1', public.school_today() + 22), 0,
  'generating again inserts nothing');
select throws_ok($$ select public.generate_sessions('e2500000-0000-4000-8000-0000000000a1', current_date + 400) $$,
  'P0001', 'horizon_too_far', 'generating beyond a year is rejected');
select is(
  (select extract(hour from min(starts_at) at time zone 'UTC')::int from public.sessions where group_id = 'e2500000-0000-4000-8000-0000000000a1'),
  8, '18:00 in Brisbane is 08:00 UTC');

-- ---------------------------------------------------------------------------
-- Asistencia
-- ---------------------------------------------------------------------------
reset role;
insert into public.sessions (id, group_id, starts_at, ends_at, teacher_id) values
  ('e2500000-0000-4000-8000-0000000000c1', 'e2500000-0000-4000-8000-0000000000a1', now() - interval '10 minutes', now() + interval '60 minutes', 'e2000000-0000-4000-8000-0000000000b1'),
  ('e2500000-0000-4000-8000-0000000000c2', 'e2500000-0000-4000-8000-0000000000a1', now() + interval '3 days', now() + interval '3 days 1 hour', 'e2000000-0000-4000-8000-0000000000b1'),
  ('e2500000-0000-4000-8000-0000000000c3', 'e2500000-0000-4000-8000-0000000000a1', now() - interval '1 day', now() - interval '23 hours', 'e2000000-0000-4000-8000-0000000000b1');
update public.sessions set status = 'cancelled', cancel_reason = 'test' where id = 'e2500000-0000-4000-8000-0000000000c3';

set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::int from public.session_roster('e2500000-0000-4000-8000-0000000000c1')), 1, 'the roster has the enrolled student only');
select lives_ok($$ insert into public.attendance (session_id, student_id, status) values ('e2500000-0000-4000-8000-0000000000c1', 'e2100000-0000-4000-8000-0000000000c1', 'present') $$,
  'the teacher marks an enrolled student during the class');
select throws_ok($$ insert into public.attendance (session_id, student_id, status) values ('e2500000-0000-4000-8000-0000000000c1', 'e2100000-0000-4000-8000-0000000000c2', 'present') $$,
  'P0001', 'not_in_roster', 'marking a student who is not enrolled is rejected');
select throws_ok($$ insert into public.attendance (session_id, student_id, status) values ('e2500000-0000-4000-8000-0000000000c2', 'e2100000-0000-4000-8000-0000000000c1', 'present') $$,
  'P0001', 'outside_attendance_window', 'the teacher cannot mark a class days before it starts');
select throws_ok($$ insert into public.attendance (session_id, student_id, status) values ('e2500000-0000-4000-8000-0000000000c3', 'e2100000-0000-4000-8000-0000000000c1', 'present') $$,
  'P0001', 'session_not_editable', 'a cancelled class cannot be marked');

reset role;
select is((select status from public.sessions where id = 'e2500000-0000-4000-8000-0000000000c1'), 'completed'::public.session_status,
  'marking attendance completes the session');

set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-0000000000b2","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::int from public.sessions), 0, 'another teacher sees no sessions of this group');
select throws_ok($$ insert into public.attendance (session_id, student_id, status) values ('e2500000-0000-4000-8000-0000000000c1', 'e2100000-0000-4000-8000-0000000000c1', 'late') $$,
  '42501', null, 'another teacher cannot mark attendance (RLS)');

set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
select lives_ok($$ insert into public.attendance (session_id, student_id, status) values ('e2500000-0000-4000-8000-0000000000c2', 'e2100000-0000-4000-8000-0000000000c1', 'excused') $$,
  'admin can mark outside the window');

set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select is((select count(*)::int from public.attendance), 2, 'student1 reads only their own attendance');

set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-0000000000c2","role":"authenticated"}';
select is((select count(*)::int from public.sessions) + (select count(*)::int from public.attendance), 0, 'a student not enrolled sees no sessions or attendance');

reset role;
select * from finish();
rollback;

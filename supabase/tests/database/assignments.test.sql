-- assignments.test.sql — tareas, entregas, archivos y lecciones completadas (0038)
begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('e4000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e4-admin@test.local', '{}', '{}', now(), now()),
  ('e4000000-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e4-teacher1@test.local', '{}', '{"initial_role":"teacher"}', now(), now()),
  ('e4000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e4-teacher2@test.local', '{}', '{"initial_role":"teacher"}', now(), now()),
  ('e4000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e4-student1@test.local', '{}', '{}', now(), now()),
  ('e4000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e4-student2@test.local', '{}', '{}', now(), now());
insert into public.user_roles (user_id, role) values ('e4000000-0000-4000-8000-0000000000a1', 'admin');

insert into public.students (id, profile_id, full_name, audience) values
  ('e4100000-0000-4000-8000-0000000000c1', 'e4000000-0000-4000-8000-0000000000c1', 'E4 Student One', 'adults'),
  ('e4100000-0000-4000-8000-0000000000c2', 'e4000000-0000-4000-8000-0000000000c2', 'E4 Student Two', 'adults');
insert into public.programs (id, code, name_es, name_en, language_code, audience, format)
values ('e4500000-0000-4000-8000-000000000001', 'e4-prog', 'E4 programa', 'E4 program', 'es', 'adults', 'local_group');
insert into public.groups (id, code, name, program_id, teacher_id, format, capacity, status)
values ('e4500000-0000-4000-8000-0000000000a1', 'E4-GA', 'E4 grupo', 'e4500000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-0000000000b1', 'local_group', 5, 'active');
insert into public.enrollments (student_id, group_id, billing_mode, starts_on)
values ('e4100000-0000-4000-8000-0000000000c1', 'e4500000-0000-4000-8000-0000000000a1', 'free', current_date - 30);
insert into public.assignments (id, group_id, title, due_at, status) values
  ('e4500000-0000-4000-8000-0000000000d1', 'e4500000-0000-4000-8000-0000000000a1', 'Tarea publicada', now() + interval '3 days', 'published'),
  ('e4500000-0000-4000-8000-0000000000d2', 'e4500000-0000-4000-8000-0000000000a1', 'Tarea en borrador', null, 'draft'),
  ('e4500000-0000-4000-8000-0000000000d3', 'e4500000-0000-4000-8000-0000000000a1', 'Tarea vencida', now() - interval '1 day', 'published');

-- ---------------------------------------------------------------------------
-- Alumno
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::int from public.assignments), 2, 'the student sees published assignments of their group, not drafts');
select lives_ok($$ insert into public.assignment_submissions (assignment_id, student_id, text_answer) values ('e4500000-0000-4000-8000-0000000000d1', 'e4100000-0000-4000-8000-0000000000c1', 'Mi respuesta') $$,
  'the student submits an assignment');
select throws_ok($$ insert into public.assignment_submissions (assignment_id, student_id, text_answer) values ('e4500000-0000-4000-8000-0000000000d2', 'e4100000-0000-4000-8000-0000000000c1', 'x') $$,
  'P0001', 'not_available', 'the student cannot submit a draft assignment');
select lives_ok($$ insert into public.assignment_submissions (assignment_id, student_id, text_answer) values ('e4500000-0000-4000-8000-0000000000d3', 'e4100000-0000-4000-8000-0000000000c1', 'Tarde') $$,
  'a late submission is accepted');
select throws_ok($$ insert into public.assignment_submissions (assignment_id, student_id, text_answer, file_path) values ('e4500000-0000-4000-8000-0000000000d1', 'e4100000-0000-4000-8000-0000000000c2', 'x', null) $$,
  '42501', null, 'the student cannot submit in the name of another student');
select lives_ok($$ update public.assignment_submissions set text_answer = 'Corregida', grade = 10 where assignment_id = 'e4500000-0000-4000-8000-0000000000d1' $$,
  'an update that tries to set a grade is accepted but the grade is ignored');

reset role;
select is((select grade from public.assignment_submissions where assignment_id = 'e4500000-0000-4000-8000-0000000000d1'), null, 'the student cannot set their own grade');
select is((select is_late from public.assignment_submissions where assignment_id = 'e4500000-0000-4000-8000-0000000000d3'), true, 'the database flags late submissions');

-- ---------------------------------------------------------------------------
-- Docente
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-0000000000b2","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::int from public.assignments) + (select count(*)::int from public.assignment_submissions), 0, 'another teacher sees nothing');

set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
select is((select count(*)::int from public.assignments), 3, 'the group teacher sees all their assignments, drafts included');
select throws_ok($$ update public.assignment_submissions set grade = 11 where assignment_id = 'e4500000-0000-4000-8000-0000000000d1' $$,
  'P0001', 'invalid', 'a grade above the maximum is rejected');
select lives_ok($$ update public.assignment_submissions set grade = 9, feedback = 'Muy bien', text_answer = 'cambiada' where assignment_id = 'e4500000-0000-4000-8000-0000000000d1' $$,
  'the group teacher grades');

reset role;
select is((select status from public.assignment_submissions where assignment_id = 'e4500000-0000-4000-8000-0000000000d1'), 'graded'::public.submission_status, 'grading marks the submission as graded');
select is((select text_answer from public.assignment_submissions where assignment_id = 'e4500000-0000-4000-8000-0000000000d1'), 'Corregida', 'and the student''s text is not changed by the teacher');
select isnt((select graded_by from public.assignment_submissions where assignment_id = 'e4500000-0000-4000-8000-0000000000d1'), null, 'the database records who graded');

set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
set local role authenticated;
update public.assignment_submissions set text_answer = 'otra vez' where assignment_id = 'e4500000-0000-4000-8000-0000000000d1';
select is((select text_answer from public.assignment_submissions where assignment_id = 'e4500000-0000-4000-8000-0000000000d1'), 'Corregida',
  'a graded submission can no longer be changed by the student');

-- ---------------------------------------------------------------------------
-- Archivos y lecciones completadas
-- ---------------------------------------------------------------------------
select is(public.assignment_file_access('e4500000-0000-4000-8000-0000000000d1/e4100000-0000-4000-8000-0000000000c1/a.pdf', true), true, 'the student can write in their own folder');
select is(public.assignment_file_access('e4500000-0000-4000-8000-0000000000d1/e4100000-0000-4000-8000-0000000000c2/a.pdf', false), false, 'the student cannot read another student''s folder');
select throws_ok($$ insert into public.lesson_completions (student_id, lesson_id) values ('e4100000-0000-4000-8000-0000000000c2', gen_random_uuid()) $$,
  '42501', null, 'a student cannot complete a lesson for someone else');

reset role;
select * from finish();
rollback;

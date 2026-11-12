-- notifications.test.sql — avisos y recordatorios (0041)
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('e4000000-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e4-teacher@test.local', '{}', '{"initial_role":"teacher"}', now(), now()),
  ('e4000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e4-student1@test.local', '{}', '{}', now(), now()),
  ('e4000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e4-student2@test.local', '{}', '{}', now(), now());

insert into public.students (id, profile_id, full_name, audience) values
  ('e4100000-0000-4000-8000-0000000000c1', 'e4000000-0000-4000-8000-0000000000c1', 'E4 Student One', 'adults'),
  ('e4100000-0000-4000-8000-0000000000c2', 'e4000000-0000-4000-8000-0000000000c2', 'E4 Student Two', 'adults');
insert into public.programs (id, code, name_es, name_en, language_code, audience, format)
values ('e4500000-0000-4000-8000-000000000001', 'e4-prog', 'E4 programa', 'E4 program', 'es', 'adults', 'local_group');
insert into public.groups (id, code, name, program_id, teacher_id, format, capacity, status)
values ('e4500000-0000-4000-8000-0000000000a1', 'E4-GA', 'E4 grupo', 'e4500000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-0000000000b1', 'local_group', 5, 'active');
insert into public.enrollments (student_id, group_id, billing_mode, starts_on)
values ('e4100000-0000-4000-8000-0000000000c1', 'e4500000-0000-4000-8000-0000000000a1', 'free', current_date - 30);
insert into public.sessions (id, group_id, starts_at, ends_at, teacher_id) values
  ('e4500000-0000-4000-8000-0000000000c1', 'e4500000-0000-4000-8000-0000000000a1', now() + interval '10 hours', now() + interval '11 hours', 'e4000000-0000-4000-8000-0000000000b1'),
  ('e4500000-0000-4000-8000-0000000000c2', 'e4500000-0000-4000-8000-0000000000a1', now() + interval '5 days', now() + interval '5 days 1 hour', 'e4000000-0000-4000-8000-0000000000b1');

-- Un recordatorio por la clase de las próximas 24 h, no por la lejana.
select is(public.generate_reminders(), 1, 'one reminder for the class in the next 24 hours');
select is(public.generate_reminders(), 0, 'running it again does not repeat the reminder');
select is((select count(*)::int from public.notifications where user_id = 'e4000000-0000-4000-8000-0000000000c1' and kind = 'class_reminder'), 1, 'the enrolled student has it');
select is((select count(*)::int from public.notifications where user_id = 'e4000000-0000-4000-8000-0000000000c2'), 0, 'a student who is not enrolled gets nothing');

-- Tarea publicada: aviso a los matriculados; por vencer: recordatorio.
insert into public.assignments (id, group_id, title, due_at, status)
values ('e4500000-0000-4000-8000-0000000000d1', 'e4500000-0000-4000-8000-0000000000a1', 'E4 tarea', now() + interval '30 hours', 'published');
select is((select count(*)::int from public.notifications where user_id = 'e4000000-0000-4000-8000-0000000000c1' and kind = 'assignment_new'), 1, 'publishing an assignment notifies the enrolled student');
select is(public.generate_reminders(), 1, 'an assignment due within 48 hours gets a reminder');

-- Clase cancelada: aviso al alumno.
update public.sessions set status = 'cancelled', cancel_reason = 'Festivo' where id = 'e4500000-0000-4000-8000-0000000000c2';
select is((select count(*)::int from public.notifications where user_id = 'e4000000-0000-4000-8000-0000000000c1' and kind = 'session_cancelled'), 1, 'cancelling a future class notifies the student');

-- Seguridad: cada persona ve solo lo suyo y solo puede marcar leído.
set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
set local role authenticated;
select ok((select count(*) from public.notifications) >= 3, 'the student sees their own notices');
select is((select count(*)::int from public.notifications where user_id <> 'e4000000-0000-4000-8000-0000000000c1'), 0, 'and nobody else''s');
select lives_ok($$ update public.notifications set read_at = now() $$, 'the student marks them as read');
select throws_ok($$ update public.notifications set title_es = 'hack' $$, '42501', null, 'but cannot change their content');
select throws_ok($$ insert into public.notifications (user_id, kind, title_es, title_en) values ('e4000000-0000-4000-8000-0000000000c1', 'x', 'x', 'x') $$, '42501', null, 'nor create notices');

select * from finish();
rollback;

-- closures_credits.test.sql — cierres y packs de clases (0040)
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('e6000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e6-admin@test.local', '{}', '{}', now(), now()),
  ('e6000000-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e6-teacher@test.local', '{}', '{"initial_role":"teacher"}', now(), now()),
  ('e6000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e6-student1@test.local', '{}', '{}', now(), now()),
  ('e6000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e6-student2@test.local', '{}', '{}', now(), now());
insert into public.user_roles (user_id, role) values ('e6000000-0000-4000-8000-0000000000a1', 'admin');

insert into public.students (id, profile_id, full_name, audience) values
  ('e6100000-0000-4000-8000-0000000000c1', 'e6000000-0000-4000-8000-0000000000c1', 'E6 Student One', 'adults'),
  ('e6100000-0000-4000-8000-0000000000c2', 'e6000000-0000-4000-8000-0000000000c2', 'E6 Student Two', 'adults');
insert into public.programs (id, code, name_es, name_en, language_code, audience, format)
values ('e6500000-0000-4000-8000-000000000001', 'e6-prog', 'E6 programa', 'E6 program', 'es', 'adults', 'local_group');
insert into public.program_prices (id, program_id, kind, amount_cents, lessons_included)
values ('e6500000-0000-4000-8000-000000000004', 'e6500000-0000-4000-8000-000000000001', 'pack', 20000, 2);
insert into public.groups (id, code, name, program_id, teacher_id, format, capacity, status)
values ('e6500000-0000-4000-8000-0000000000a1', 'E6-GA', 'E6 grupo', 'e6500000-0000-4000-8000-000000000001', 'e6000000-0000-4000-8000-0000000000b1', 'local_group', 5, 'active');
-- Student1 con matrícula "pack" y un precio de pack de 2 clases (crea su pack); student2 con pago por clase.
insert into public.enrollments (student_id, group_id, billing_mode, price_id, agreed_amount_cents, starts_on) values
  ('e6100000-0000-4000-8000-0000000000c1', 'e6500000-0000-4000-8000-0000000000a1', 'pack', 'e6500000-0000-4000-8000-000000000004', 20000, current_date - 30),
  ('e6100000-0000-4000-8000-0000000000c2', 'e6500000-0000-4000-8000-0000000000a1', 'payg', null, null, current_date - 30);
insert into public.sessions (id, group_id, starts_at, ends_at, teacher_id)
select ('e6500000-0000-4000-8000-0000000000c' || n)::uuid, 'e6500000-0000-4000-8000-0000000000a1',
       now() - interval '1 hour' + (n * interval '1 minute'), now() + interval '30 minutes' + (n * interval '1 minute'), 'e6000000-0000-4000-8000-0000000000b1'
from generate_series(1, 3) n;

-- ---------------------------------------------------------------------------
-- Packs
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.credit_packs where student_id = 'e6100000-0000-4000-8000-0000000000c1'), 1, 'a pack enrolment with a pack price creates its credit pack');
select is((select remaining from public.credit_pack_balances where student_id = 'e6100000-0000-4000-8000-0000000000c1'), 2, 'the pack starts with its lessons');
select is((select count(*)::int from public.credit_packs where student_id = 'e6100000-0000-4000-8000-0000000000c2'), 0, 'a pay-per-lesson enrolment has no pack');

set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
set local role authenticated;
insert into public.attendance (session_id, student_id, status) values ('e6500000-0000-4000-8000-0000000000c1', 'e6100000-0000-4000-8000-0000000000c1', 'present');
insert into public.attendance (session_id, student_id, status) values ('e6500000-0000-4000-8000-0000000000c1', 'e6100000-0000-4000-8000-0000000000c2', 'present');
reset role;
select is((select remaining from public.credit_pack_balances where student_id = 'e6100000-0000-4000-8000-0000000000c1'), 1, 'marking a pack student present uses one lesson');
select is((select charge_status from public.attendance where student_id = 'e6100000-0000-4000-8000-0000000000c1'), 'charged', 'and the attendance records the charge');
select is((select charge_status from public.attendance where student_id = 'e6100000-0000-4000-8000-0000000000c2'), 'not_applicable', 'a pay-per-lesson student is never charged to a pack');

set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
set local role authenticated;
update public.attendance set status = 'late' where student_id = 'e6100000-0000-4000-8000-0000000000c1';
reset role;
select is((select remaining from public.credit_pack_balances where student_id = 'e6100000-0000-4000-8000-0000000000c1'), 1, 'present -> late does not charge twice');

set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
set local role authenticated;
update public.attendance set status = 'excused' where student_id = 'e6100000-0000-4000-8000-0000000000c1';
reset role;
select is((select remaining from public.credit_pack_balances where student_id = 'e6100000-0000-4000-8000-0000000000c1'), 2, 'an excused absence gives the lesson back');

set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
set local role authenticated;
update public.attendance set status = 'absent' where student_id = 'e6100000-0000-4000-8000-0000000000c1';
insert into public.attendance (session_id, student_id, status) values ('e6500000-0000-4000-8000-0000000000c2', 'e6100000-0000-4000-8000-0000000000c1', 'present');
insert into public.attendance (session_id, student_id, status) values ('e6500000-0000-4000-8000-0000000000c3', 'e6100000-0000-4000-8000-0000000000c1', 'present');
reset role;
select is((select remaining from public.credit_pack_balances where student_id = 'e6100000-0000-4000-8000-0000000000c1'), 0, 'a pack never goes below zero');
select is((select count(*)::int from public.attendance where student_id = 'e6100000-0000-4000-8000-0000000000c1' and charge_status = 'uncovered'), 1, 'the mark without balance is saved as uncovered');

select throws_ok($$ update public.credit_movements set delta = 5 $$, '42501', 'append-only', 'movements cannot be edited');
select throws_ok($$ delete from public.credit_movements $$, '42501', 'append-only', 'or deleted');

set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::int from public.credit_pack_balances), 1, 'the student reads their own pack balance');
select throws_ok($$ insert into public.credit_movements (pack_id, student_id, delta, reason) select pack_id, student_id, 50, 'adjustment' from public.credit_pack_balances $$,
  '42501', null, 'a student cannot adjust their own balance');

set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-0000000000c2","role":"authenticated"}';
select is((select count(*)::int from public.credit_pack_balances), 0, 'another student sees no packs');

-- ---------------------------------------------------------------------------
-- Cierres
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
select throws_ok($$ select public.add_closure(current_date + 5, current_date + 1, null, 'x', null) $$, 'P0001', 'invalid_range', 'a closure cannot end before it starts');

reset role;
insert into public.sessions (id, group_id, starts_at, ends_at, teacher_id) values
  ('e6500000-0000-4000-8000-0000000000d1', 'e6500000-0000-4000-8000-0000000000a1', now() + interval '10 days', now() + interval '10 days 1 hour', 'e6000000-0000-4000-8000-0000000000b1');
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
set local role authenticated;
select is(public.add_closure((current_date + 9), (current_date + 11), null, 'Festivo de prueba', 'Test holiday'), 1, 'a closure cancels the future classes that fall inside it');
reset role;
select is((select cancel_reason from public.sessions where id = 'e6500000-0000-4000-8000-0000000000d1'), 'Festivo de prueba', 'with the reason as the cancellation note');

select * from finish();
rollback;

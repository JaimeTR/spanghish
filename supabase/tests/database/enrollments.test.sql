-- enrollments.test.sql — grupos, prematrículas, matrículas y pagos de matrícula (0035)
begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('e1000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e1-admin@test.local', '{}', '{}', now(), now()),
  ('e1000000-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e1-teacher@test.local', '{}', '{"initial_role":"teacher"}', now(), now()),
  ('e1000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e1-student1@test.local', '{}', '{}', now(), now()),
  ('e1000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e1-student2@test.local', '{}', '{}', now(), now());
insert into public.user_roles (user_id, role) values ('e1000000-0000-4000-8000-0000000000a1', 'admin');

insert into public.students (id, profile_id, full_name, audience) values
  ('e1100000-0000-4000-8000-0000000000c1', 'e1000000-0000-4000-8000-0000000000c1', 'E1 Student One', 'adults'),
  ('e1100000-0000-4000-8000-0000000000c2', 'e1000000-0000-4000-8000-0000000000c2', 'E1 Student Two', 'adults'),
  ('e1100000-0000-4000-8000-0000000000f1', null, 'E1 Kid', 'kids');
insert into public.guardians (id, full_name, email) values ('e1200000-0000-4000-8000-0000000000d1', 'E1 Guardian', 'e1-g@private.local');
insert into public.student_guardians (student_id, guardian_id, relationship)
values ('e1100000-0000-4000-8000-0000000000f1', 'e1200000-0000-4000-8000-0000000000d1', 'parent');

insert into public.programs (id, code, name_es, name_en, language_code, audience, format, is_public)
values ('e1500000-0000-4000-8000-000000000001', 'e1-prog', 'E1 programa', 'E1 program', 'es', 'adults', 'local_group', true);
insert into public.program_editions (id, program_id, starts_on, ends_on, status)
values ('e1500000-0000-4000-8000-000000000003', 'e1500000-0000-4000-8000-000000000001', current_date + 30, current_date + 90, 'open');
insert into public.program_prices (id, program_id, kind, amount_cents)
values ('e1500000-0000-4000-8000-000000000004', 'e1500000-0000-4000-8000-000000000001', 'upfront', 25000);
-- GA: una sola plaza, pública, con docente. GB: cinco plazas, sin reservas web.
insert into public.groups (id, code, name, program_id, edition_id, teacher_id, format, capacity, status, is_public) values
  ('e1500000-0000-4000-8000-0000000000a1', 'E1-GA', 'E1 grupo A', 'e1500000-0000-4000-8000-000000000001', 'e1500000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-0000000000b1', 'local_group', 1, 'active', true),
  ('e1500000-0000-4000-8000-0000000000b1', 'E1-GB', 'E1 grupo B', 'e1500000-0000-4000-8000-000000000001', null, null, 'local_group', 5, 'active', false);

-- ---------------------------------------------------------------------------
-- Web pública (anon)
-- ---------------------------------------------------------------------------
set local role anon;

select is(
  (select count(*)::int from jsonb_array_elements(public.list_public_groups()) g where g ->> 'group_id' = 'e1500000-0000-4000-8000-0000000000a1'),
  1, 'anon lists the public group with an open edition');
select is(
  (select (g ->> 'seats_left')::int from jsonb_array_elements(public.list_public_groups()) g where g ->> 'group_id' = 'e1500000-0000-4000-8000-0000000000a1'),
  1, 'the public list shows the free seats');
select is(
  (select count(*)::int from jsonb_array_elements(public.list_public_groups()) g where g ->> 'group_id' = 'e1500000-0000-4000-8000-0000000000b1'),
  0, 'a group without web booking is not listed');

select is(
  public.submit_enrollment_request('{"group_id":"e1500000-0000-4000-8000-0000000000a1","price_id":"e1500000-0000-4000-8000-000000000004","full_name":"Web Uno","email":"Web.Uno@Example.com","terms":true}') ->> 'status',
  'pending_payment', 'the first booking holds the only seat');
select is(
  public.submit_enrollment_request('{"group_id":"e1500000-0000-4000-8000-0000000000a1","price_id":"e1500000-0000-4000-8000-000000000004","full_name":"Web Uno","email":"web.uno@example.com","terms":true}') ->> 'status',
  'pending_payment', 'the same person booking again gets the same hold');
select is(
  public.submit_enrollment_request('{"group_id":"e1500000-0000-4000-8000-0000000000a1","price_id":"e1500000-0000-4000-8000-000000000004","full_name":"Web Dos","email":"web.dos@example.com","terms":true}') ->> 'status',
  'waitlist', 'a booking on a full group goes to the waiting list');
select throws_ok(
  $$ select public.submit_enrollment_request('{"group_id":"e1500000-0000-4000-8000-0000000000a1","price_id":"e1500000-0000-4000-8000-000000000004","full_name":"Sin Terminos","email":"x@example.com"}') $$,
  'P0001', 'terms_required', 'booking without accepting the terms is rejected');
select throws_ok(
  $$ select public.submit_enrollment_request('{"group_id":"e1500000-0000-4000-8000-0000000000b1","price_id":"e1500000-0000-4000-8000-000000000004","full_name":"X Y","email":"x@example.com","terms":true}') $$,
  'P0001', 'not_available', 'booking a group that is not open to the web is rejected');
select throws_ok(
  $$ select public.submit_enrollment_request('{"group_id":"e1500000-0000-4000-8000-0000000000a1","price_id":"e1500000-0000-4000-8000-0000000000ff","full_name":"X Y","email":"x@example.com","terms":true}') $$,
  'P0001', 'price_invalid', 'a price that is not the group''s is rejected (the amount never comes from the browser)');
select throws_ok($$ select count(*) from public.enrollment_requests $$, '42501', null, 'anon cannot read the bookings table');
select throws_ok(
  $$ select public.confirm_enrollment_request('e1500000-0000-4000-8000-0000000000ff', '{}') $$,
  '42501', null, 'anon cannot confirm a booking');

reset role;
select is((select count(*)::int from public.enrollment_requests where group_id = 'e1500000-0000-4000-8000-0000000000a1'), 2,
  'only two bookings were stored (the duplicate was not)');

-- ---------------------------------------------------------------------------
-- Servidor (service_role): confirmar el pago es idempotente
-- ---------------------------------------------------------------------------
set local role service_role;
select is(
  (select (public.confirm_enrollment_request(r.id, '{"amount_cents":25000,"stripe_session_id":"cs_test_e1check0001","payment_intent_id":"pi_e1check0001"}') ->> 'already')::boolean
   from public.enrollment_requests r where r.email = 'web.uno@example.com'),
  false, 'service_role confirms a paid booking');
select is(
  (select (public.confirm_enrollment_request(r.id, '{"amount_cents":25000,"stripe_session_id":"cs_test_e1check0001","payment_intent_id":"pi_e1check0001"}') ->> 'already')::boolean
   from public.enrollment_requests r where r.email = 'web.uno@example.com'),
  true, 'confirming twice is harmless');
reset role;
select is((select count(*)::int from public.enrollment_payments where payment_intent_id = 'pi_e1check0001'), 1, 'the payment was recorded once');

-- ---------------------------------------------------------------------------
-- Matrículas: cupo y menores
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ insert into public.enrollments (student_id, group_id, billing_mode) values ('e1100000-0000-4000-8000-0000000000c2', 'e1500000-0000-4000-8000-0000000000a1', 'free') $$,
  'P0001', 'group_full', 'enrolling beyond capacity raises group_full');
select throws_ok(
  $$ insert into public.enrollments (student_id, group_id, billing_mode) values ('e1100000-0000-4000-8000-0000000000f1', 'e1500000-0000-4000-8000-0000000000b1', 'free') $$,
  'P0001', 'consent_required', 'enrolling a minor without a current consent raises consent_required');
select throws_ok(
  $$ insert into public.enrollment_payments (enrollment_id, student_id, method, amount_cents)
     select e.id, e.student_id, 'stripe', 100 from public.enrollments e limit 1 $$,
  '42501', null, 'the admin cannot hand-write a Stripe payment');

-- ---------------------------------------------------------------------------
-- Lectura por rol
-- ---------------------------------------------------------------------------
reset role;
insert into public.enrollments (student_id, group_id, billing_mode) values ('e1100000-0000-4000-8000-0000000000c1', 'e1500000-0000-4000-8000-0000000000b1', 'free');

set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::int from public.enrollments), 1, 'student1 reads only their own enrollment');
select is(public.content_tier(), 'enrolled'::public.access_level, 'an active enrollment unlocks the enrolled content tier');

set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
select is((select count(*)::int from public.enrollments), 1, 'the teacher reads the enrollments of their own group only');

reset role;
select * from finish();
rollback;

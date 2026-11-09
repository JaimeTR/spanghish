-- Pruebas pgTAP del catálogo de sedes, programas, ediciones y precios (0008).
-- Todo ocurre dentro de una transacción que se revierte al final: no deja datos.
-- Personas (prefijo c8): A admin, T1 docente, S1 alumno, GU1 tutor, SU admin suspendida.
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('c8000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'c8-admin@test.local', '{}', '{}', now(), now()),
  ('c8000000-0000-4000-8000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'c8-teacher1@test.local', '{}', '{"initial_role":"teacher"}', now(), now()),
  ('c8000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'c8-student1@test.local', '{}', '{}', now(), now()),
  ('c8000000-0000-4000-8000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'c8-guardian1@test.local', '{}', '{"initial_role":"guardian"}', now(), now()),
  ('c8000000-0000-4000-8000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'c8-suspended@test.local', '{}', '{}', now(), now());

insert into public.user_roles (user_id, role) values
  ('c8000000-0000-4000-8000-0000000000a1', 'admin'),
  ('c8000000-0000-4000-8000-0000000000e1', 'admin');
update public.profiles set status = 'suspended' where id = 'c8000000-0000-4000-8000-0000000000e1';

-- Datos de partida (como postgres).
insert into public.locations (id, name, kind, region, address) values
  ('c8100000-0000-4000-8000-000000000001', 'C8 Library', 'library', 'sunshine_coast', '1 Test St'),
  ('c8100000-0000-4000-8000-000000000002', 'C8 Online', 'online', 'online', null);
insert into public.programs (id, code, name_es, name_en, language_code, audience, format) values
  ('c8200000-0000-4000-8000-000000000001', 'c8-adults-a1', 'C8 Adultos A1', 'C8 Adults A1', 'es', 'adults', 'local_group'),
  ('c8200000-0000-4000-8000-000000000002', 'c8-kids', 'C8 Niños', 'C8 Kids', 'es', 'kids', 'local_group');
insert into public.program_editions (id, program_id, starts_on, ends_on) values
  ('c8300000-0000-4000-8000-000000000001', 'c8200000-0000-4000-8000-000000000001', '2027-02-01', '2027-04-01'),
  ('c8300000-0000-4000-8000-000000000002', 'c8200000-0000-4000-8000-000000000002', '2027-02-01', '2027-04-01');
insert into public.program_prices (id, program_id, edition_id, location_id, kind, amount_cents, lessons_included) values
  ('c8400000-0000-4000-8000-000000000001', 'c8200000-0000-4000-8000-000000000001', null, null, 'per_lesson', 2500, null),
  ('c8400000-0000-4000-8000-000000000002', 'c8200000-0000-4000-8000-000000000001', 'c8300000-0000-4000-8000-000000000001', null, 'pack', 24500, 10);

-- ---------------------------------------------------------------------------
-- Lectura
-- ---------------------------------------------------------------------------
create function pg_temp.c8_visible() returns table (l bigint, p bigint, e bigint, pr bigint)
language sql as $$
  select
    (select count(*) from public.locations where id::text like 'c81%'),
    (select count(*) from public.programs where id::text like 'c82%'),
    (select count(*) from public.program_editions where id::text like 'c83%'),
    (select count(*) from public.program_prices where id::text like 'c84%');
$$;
grant execute on function pg_temp.c8_visible() to authenticated;

set local role authenticated;

set local request.jwt.claims = '{"sub":"c8000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
select results_eq('select * from pg_temp.c8_visible()', $$ values (2::bigint, 2::bigint, 2::bigint, 2::bigint) $$,
  'any active user reads locations, programs, editions and prices: admin');
set local request.jwt.claims = '{"sub":"c8000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
select results_eq('select * from pg_temp.c8_visible()', $$ values (2::bigint, 2::bigint, 2::bigint, 2::bigint) $$,
  'any active user reads locations, programs, editions and prices: teacher');
set local request.jwt.claims = '{"sub":"c8000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select results_eq('select * from pg_temp.c8_visible()', $$ values (2::bigint, 2::bigint, 2::bigint, 2::bigint) $$,
  'any active user reads locations, programs, editions and prices: student');
set local request.jwt.claims = '{"sub":"c8000000-0000-4000-8000-0000000000d1","role":"authenticated"}';
select results_eq('select * from pg_temp.c8_visible()', $$ values (2::bigint, 2::bigint, 2::bigint, 2::bigint) $$,
  'any active user reads locations, programs, editions and prices: guardian');

set local request.jwt.claims = '{"sub":"c8000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
select results_eq('select * from pg_temp.c8_visible()', $$ values (0::bigint, 0::bigint, 0::bigint, 0::bigint) $$,
  'suspended user reads none');
select throws_ok(
  $$ insert into public.programs (code, name_es, name_en, language_code, audience, format)
     values ('c8-suspended', 'X', 'X', 'es', 'adults', 'individual') $$,
  '42501', null, 'suspended admin cannot insert a program'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select 1 from public.programs $$, '42501', null, 'anon cannot read programs (42501)');
select throws_ok($$ select 1 from public.locations $$, '42501', null, 'anon cannot read locations (42501)');
select throws_ok($$ select 1 from public.program_prices $$, '42501', null, 'anon cannot read prices (42501)');

-- ---------------------------------------------------------------------------
-- Escritura: solo admin
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"c8000000-0000-4000-8000-0000000000b1","role":"authenticated"}';
select throws_ok(
  $$ insert into public.programs (code, name_es, name_en, language_code, audience, format)
     values ('c8-teacher', 'X', 'X', 'es', 'adults', 'individual') $$,
  '42501', null, 'teacher cannot insert a program'
);
update public.locations set name = 'Hacked' where id = 'c8100000-0000-4000-8000-000000000001';
delete from public.program_prices where id = 'c8400000-0000-4000-8000-000000000001';

set local request.jwt.claims = '{"sub":"c8000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select throws_ok(
  $$ insert into public.program_prices (program_id, kind, amount_cents)
     values ('c8200000-0000-4000-8000-000000000001', 'upfront', 1) $$,
  '42501', null, 'student cannot insert a price'
);
update public.program_editions set status = 'open' where id = 'c8300000-0000-4000-8000-000000000001';

reset role;
select results_eq(
  $$ select (select name from public.locations where id = 'c8100000-0000-4000-8000-000000000001'),
            (select count(*) from public.program_prices where id = 'c8400000-0000-4000-8000-000000000001'),
            (select status::text from public.program_editions where id = 'c8300000-0000-4000-8000-000000000001') $$,
  $$ values ('C8 Library'::text, 1::bigint, 'draft'::text) $$,
  'teacher and student updates and deletes change nothing'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"c8000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ with p as (
       insert into public.programs (id, code, name_es, name_en, language_code, audience, format, duration_weeks)
       values ('c8200000-0000-4000-8000-000000000003', 'c8-mature', 'C8 Mayores', 'C8 Seniors', 'es', 'mature', 'local_group', 9)
       returning id
     ), e as (
       insert into public.program_editions (id, program_id, label_es, label_en, starts_on, ends_on, status)
       select 'c8300000-0000-4000-8000-000000000003', p.id, 'Febrero', 'February', '2027-02-01', '2027-04-01', 'open' from p
       returning id, program_id
     )
     insert into public.program_prices (program_id, edition_id, location_id, kind, amount_cents)
     select e.program_id, e.id, 'c8100000-0000-4000-8000-000000000001', 'upfront', 31000 from e $$,
  'admin creates program, edition and price'
);

select throws_ok(
  $$ insert into public.locations (name, kind, region, address) values ('Casa', 'home', 'brisbane', '2 Private Rd') $$,
  '23514', null, 'a home location with an address is rejected (23514)'
);
select throws_ok(
  $$ insert into public.locations (name, kind, region, map_url) values ('Bad map', 'library', 'brisbane', 'http://x') $$,
  '23514', null, 'a map_url that is not https is rejected'
);
select throws_ok(
  $$ insert into public.program_editions (program_id, starts_on, ends_on)
     values ('c8200000-0000-4000-8000-000000000001', '2027-05-01', '2027-04-01') $$,
  '23514', null, 'edition ending before it starts is rejected'
);
select throws_ok(
  $$ insert into public.programs (code, name_es, name_en, language_code, audience, format)
     values ('Adults A1', 'X', 'X', 'es', 'adults', 'individual') $$,
  '23514', null, 'a program code with spaces or capitals is rejected'
);
select throws_ok(
  $$ insert into public.program_prices (program_id, edition_id, kind, amount_cents)
     values ('c8200000-0000-4000-8000-000000000001', 'c8300000-0000-4000-8000-000000000002', 'upfront', 100) $$,
  '23503', null, 'a price for an edition of another program is rejected (23503)'
);
select throws_ok(
  $$ insert into public.program_prices (program_id, edition_id, kind, amount_cents, lessons_included)
     values ('c8200000-0000-4000-8000-000000000001', 'c8300000-0000-4000-8000-000000000001', 'pack', 30000, 10) $$,
  '23505', null, 'two active prices for the same program, edition, location, kind and lessons are rejected (23505)'
);
select lives_ok(
  $$ insert into public.program_prices (program_id, edition_id, kind, amount_cents, lessons_included, active)
     values ('c8200000-0000-4000-8000-000000000001', 'c8300000-0000-4000-8000-000000000001', 'pack', 30000, 10, false) $$,
  'an inactive duplicate price is allowed (history)'
);
select throws_ok(
  $$ insert into public.program_prices (program_id, kind, amount_cents, lessons_included)
     values ('c8200000-0000-4000-8000-000000000002', 'per_lesson', 2500, 1) $$,
  '23514', null, 'per_lesson price with lessons_included is rejected'
);
select throws_ok(
  $$ insert into public.program_prices (program_id, kind, amount_cents)
     values ('c8200000-0000-4000-8000-000000000002', 'pack', 24500) $$,
  '23514', null, 'pack price without lessons_included is rejected'
);
select throws_ok(
  $$ insert into public.program_prices (program_id, kind, amount_cents, currency)
     values ('c8200000-0000-4000-8000-000000000002', 'upfront', 2500, 'USD') $$,
  '23514', null, 'currency other than AUD is rejected'
);

update public.programs set name_en = 'C8 Adults A1 (new)' where id = 'c8200000-0000-4000-8000-000000000001';
reset role;
select results_eq(
  $$ select count(*) from public.audit_logs
     where table_name = 'programs' and action = 'UPDATE'
       and row_id = 'c8200000-0000-4000-8000-000000000001'
       and actor = 'c8000000-0000-4000-8000-0000000000a1'
       and new_data ->> 'name_en' = 'C8 Adults A1 (new)' $$,
  $$ values (1::bigint) $$,
  'admin update of a program writes an audit row'
);

select * from finish();
rollback;

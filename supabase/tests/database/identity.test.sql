-- Pruebas pgTAP de identidad, roles y RLS (migración 0001_identity.sql).
-- Todo ocurre dentro de una transacción que se revierte al final: no deja datos.
begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

-- ---------------------------------------------------------------------------
-- Datos de prueba: usuarios creados directamente en auth.users (como postgres).
-- El trigger on_auth_user_created debe crear su perfil y el rol 'student'.
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student1@test.local', '{"full_name":"Student One"}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student2@test.local', '{"full_name":"Student Two"}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'teacher@test.local', '{"full_name":"Teacher"}', '{}', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin@test.local', '{"full_name":"Admin"}', '{}', now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'suspended@test.local', '{"full_name":"Suspended"}', '{}', now(), now());

-- ---------------------------------------------------------------------------
-- new auth user gets profile and student role
-- ---------------------------------------------------------------------------
select results_eq(
  $$ select email, full_name, preferred_locale, status from public.profiles
     where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('student1@test.local'::text, 'Student One'::text, 'es'::text, 'active'::text) $$,
  'new auth user gets profile and student role: profile created with defaults'
);
select results_eq(
  $$ select role::text from public.user_roles where user_id = '11111111-1111-1111-1111-111111111111' $$,
  array['student'],
  'new auth user gets profile and student role: role student assigned'
);

-- Si la creación del perfil falla, el alta en auth.users también debe fallar
-- (sin cuentas a medio crear). Se fuerza el fallo con una restricción temporal
-- que se revierte junto con la transacción.
alter table public.profiles add constraint tmp_force_fail check (email <> 'boom@test.local');
select throws_ok(
  $$ insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
     values ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated',
             'authenticated', 'boom@test.local', '{}', '{}', now(), now()) $$,
  '23514',
  null,
  'signup fails when profile creation fails'
);
select is_empty(
  $$ select 1 from auth.users where id = '66666666-6666-6666-6666-666666666666' $$,
  'no half-made account is left in auth.users'
);
alter table public.profiles drop constraint tmp_force_fail;

-- Roles y estados de partida (como postgres).
insert into public.user_roles (user_id, role) values
  ('33333333-3333-3333-3333-333333333333', 'teacher'),
  ('44444444-4444-4444-4444-444444444444', 'admin');
update public.profiles set status = 'suspended' where id = '55555555-5555-5555-5555-555555555555';

-- ---------------------------------------------------------------------------
-- Estudiante 1
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select results_eq(
  $$ select id from public.profiles $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'student can select own profile'
);
select is_empty(
  $$ select 1 from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  'student cannot select other profiles'
);
select results_eq(
  $$ select user_id, role::text from public.user_roles $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid, 'student'::text) $$,
  'student only sees own roles'
);

-- Puede editar sus campos permitidos.
select lives_ok(
  $$ update public.profiles set full_name = 'Uno', preferred_locale = 'en'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  'student can update own full_name and preferred_locale'
);
select results_eq(
  $$ select full_name, preferred_locale from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('Uno'::text, 'en'::text) $$,
  'own allowed fields were updated'
);
select throws_ok(
  $$ update public.profiles set preferred_locale = 'fr' where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514',
  null,
  'preferred_locale only accepts es|en'
);

-- student cannot update own role or status
select throws_ok(
  $$ update public.profiles set status = 'suspended' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'student cannot update own role or status: status'
);
select throws_ok(
  $$ update public.profiles set email = 'x@test.local' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'student cannot update own email'
);
select throws_ok(
  $$ insert into public.user_roles (user_id, role) values ('11111111-1111-1111-1111-111111111111', 'admin') $$,
  '42501',
  null,
  'student cannot update own role or status: cannot grant itself a role'
);
update public.user_roles set role = 'admin' where user_id = '11111111-1111-1111-1111-111111111111';
delete from public.user_roles where user_id = '11111111-1111-1111-1111-111111111111';
update public.profiles set full_name = 'hack' where id = '22222222-2222-2222-2222-222222222222';
select ok(not public.has_role('admin'), 'student is not admin');

-- ---------------------------------------------------------------------------
-- Docente
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select throws_ok(
  $$ insert into public.user_roles (user_id, role) values ('11111111-1111-1111-1111-111111111111', 'teacher') $$,
  '42501',
  null,
  'teacher cannot insert into user_roles'
);
select ok(public.has_role('teacher'), 'teacher has_role teacher');
select is(
  (select count(*)::int from public.profiles),
  1,
  'teacher only sees own profile'
);

-- ---------------------------------------------------------------------------
-- Suspendido
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select ok(not public.is_active(), 'suspended user is_active() is false');
select is_empty($$ select 1 from public.profiles $$, 'suspended user sees no rows: profiles (own included)');
select is_empty($$ select 1 from public.user_roles $$, 'suspended user sees no rows: user_roles');
select ok(not public.has_role('student'), 'suspended user has no effective role');

-- ---------------------------------------------------------------------------
-- Administrador
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select is(
  (select count(*)::int from public.profiles where email like '%@test.local'),
  5,
  'admin can select all profiles'
);
select lives_ok(
  $$ update public.profiles set status = 'suspended' where id = '22222222-2222-2222-2222-222222222222' $$,
  'admin can update status'
);
select lives_ok(
  $$ insert into public.user_roles (user_id, role) values ('22222222-2222-2222-2222-222222222222', 'guardian') $$,
  'admin can insert into user_roles'
);
select lives_ok(
  $$ delete from public.user_roles where user_id = '33333333-3333-3333-3333-333333333333' and role = 'teacher' $$,
  'admin can delete from user_roles'
);

-- ---------------------------------------------------------------------------
-- Comprobaciones finales como postgres (efecto real de los intentos anteriores).
-- ---------------------------------------------------------------------------
reset role;

select results_eq(
  $$ select role::text from public.user_roles where user_id = '11111111-1111-1111-1111-111111111111' $$,
  array['student'],
  'student cannot update own role or status: own roles unchanged after update/delete attempts'
);
select results_eq(
  $$ select full_name from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  array['Student Two'],
  'student could not update another profile'
);
select results_eq(
  $$ select status from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  array['suspended'],
  'admin status update took effect'
);
select results_eq(
  $$ select role::text from public.user_roles where user_id = '33333333-3333-3333-3333-333333333333' $$,
  array['student'],
  'admin role delete took effect'
);

-- ---------------------------------------------------------------------------
-- anon sees nothing
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok($$ select 1 from public.profiles $$, '42501', null, 'anon sees nothing: profiles');
select throws_ok($$ select 1 from public.user_roles $$, '42501', null, 'anon sees nothing: user_roles');
select throws_ok($$ select public.is_active() $$, '42501', null, 'anon cannot execute is_active()');

reset role;

select * from finish();
rollback;

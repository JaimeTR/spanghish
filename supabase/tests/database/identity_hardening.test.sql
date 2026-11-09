-- Pruebas pgTAP de identidad endurecida (0007): rol inicial por app_metadata,
-- última admin y sincronía de email.
-- Todo ocurre dentro de una transacción que se revierte al final: no deja datos.
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- ---------------------------------------------------------------------------
-- Rol inicial
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('91111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ih-teacher@test.local', '{"full_name":"IH Teacher"}',
   '{"provider":"email","providers":["email"],"initial_role":"teacher"}', now(), now()),
  ('92222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ih-guardian@test.local', '{"full_name":"IH Guardian"}', '{"initial_role":"guardian"}', now(), now()),
  ('93333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ih-admin-attempt@test.local', '{}', '{"initial_role":"admin"}', now(), now()),
  ('94444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ih-usermeta@test.local', '{"initial_role":"teacher","role":"admin"}', '{}', now(), now()),
  ('95555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ih-junk@test.local', '{}', '{"initial_role":["teacher"]}', now(), now());

select results_eq(
  $$ select role::text from public.user_roles where user_id = '91111111-1111-1111-1111-111111111111' $$,
  array['teacher'],
  'user with app_metadata initial_role teacher gets only teacher'
);
select results_eq(
  $$ select role::text from public.user_roles where user_id = '92222222-2222-2222-2222-222222222222' $$,
  array['guardian'],
  'initial_role guardian gets only guardian'
);
select results_eq(
  $$ select role::text from public.user_roles where user_id = '93333333-3333-3333-3333-333333333333' $$,
  array['student'],
  'initial_role admin falls back to student'
);
select results_eq(
  $$ select role::text from public.user_roles where user_id = '94444444-4444-4444-4444-444444444444' $$,
  array['student'],
  'initial_role in user_metadata is ignored'
);
select results_eq(
  $$ select role::text from public.user_roles where user_id = '95555555-5555-5555-5555-555555555555' $$,
  array['student'],
  'a non-text initial_role falls back to student'
);

-- GoTrue (auth.admin.createUser) inserta sin app_metadata y lo escribe después
-- con un UPDATE: se simula ese orden.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('96666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ih-gotrue@test.local', '{}', '{"provider":"email","providers":["email"]}', now(), now());
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"initial_role":"teacher"}'
where id = '96666666-6666-6666-6666-666666666666';
select results_eq(
  $$ select role::text from public.user_roles where user_id = '96666666-6666-6666-6666-666666666666' $$,
  array['teacher'],
  'initial_role written by an update right after signup (GoTrue order) gets only that role'
);

-- Más tarde, cambiar initial_role ya no toca los roles.
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"initial_role":"guardian"}'
where id = '96666666-6666-6666-6666-666666666666';
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"initial_role":"admin"}'
where id = '95555555-5555-5555-5555-555555555555';
select results_eq(
  $$ select user_id::text || ':' || role::text from public.user_roles
     where user_id in ('96666666-6666-6666-6666-666666666666', '95555555-5555-5555-5555-555555555555')
     order by 1 $$,
  array['95555555-5555-5555-5555-555555555555:student', '96666666-6666-6666-6666-666666666666:teacher'],
  'a later initial_role change never alters roles and never grants admin'
);

-- ---------------------------------------------------------------------------
-- Última admin. HA1 y HA2 serán las únicas admins: se quita el rol admin al
-- resto (p. ej. la admin del seed) mientras HA1 sigue activa.
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('9a111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ih-admin1@test.local', '{}', '{}', now(), now()),
  ('9a222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ih-admin2@test.local', '{}', '{}', now(), now());
insert into public.user_roles (user_id, role) values
  ('9a111111-1111-1111-1111-111111111111', 'admin'),
  ('9a222222-2222-2222-2222-222222222222', 'admin');
delete from public.user_roles
where role = 'admin'
  and user_id not in ('9a111111-1111-1111-1111-111111111111', '9a222222-2222-2222-2222-222222222222');

-- Quitar el rol a HA2 está permitido: queda HA1.
select lives_ok(
  $$ delete from public.user_roles
     where user_id = '9a222222-2222-2222-2222-222222222222' and role = 'admin' $$,
  'an admin role can be removed while another active admin exists'
);

-- HA1 (como usuaria autenticada) intenta quitarse su propio rol de admin.
set local role authenticated;
set local request.jwt.claims = '{"sub":"9a111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok(
  $$ delete from public.user_roles
     where user_id = '9a111111-1111-1111-1111-111111111111' and role = 'admin' $$,
  'P0001',
  'last_admin',
  'deleting the last active admin role raises last_admin'
);
select throws_ok(
  $$ update public.user_roles set role = 'teacher'
     where user_id = '9a111111-1111-1111-1111-111111111111' and role = 'admin' $$,
  'P0001',
  'last_admin',
  'changing the last admin role to another role raises last_admin'
);
select throws_ok(
  $$ update public.profiles set status = 'suspended'
     where id = '9a111111-1111-1111-1111-111111111111' $$,
  'P0001',
  'last_admin',
  'suspending the last active admin raises last_admin'
);
reset role;

-- También vale para postgres / service_role (cualquier camino de escritura).
select throws_ok(
  $$ update public.profiles set status = 'suspended'
     where id = '9a111111-1111-1111-1111-111111111111' $$,
  'P0001',
  'last_admin',
  'the last admin guard also applies outside the API roles'
);

-- HA2 vuelve a ser admin pero suspendida: no cuenta como admin restante.
insert into public.user_roles (user_id, role) values ('9a222222-2222-2222-2222-222222222222', 'admin');
update public.profiles set status = 'suspended' where id = '9a222222-2222-2222-2222-222222222222';
select throws_ok(
  $$ delete from public.user_roles
     where user_id = '9a111111-1111-1111-1111-111111111111' and role = 'admin' $$,
  'P0001',
  'last_admin',
  'a suspended admin does not count as the remaining admin'
);

-- Suspender a una no-admin nunca se bloquea.
select lives_ok(
  $$ update public.profiles set status = 'suspended'
     where id = '91111111-1111-1111-1111-111111111111' $$,
  'suspending a non-admin is not affected by the guard'
);

-- ---------------------------------------------------------------------------
-- Sincronía de email
-- ---------------------------------------------------------------------------
update auth.users set email = 'ih-teacher-new@test.local'
where id = '91111111-1111-1111-1111-111111111111';
select is(
  (select email from public.profiles where id = '91111111-1111-1111-1111-111111111111'),
  'ih-teacher-new@test.local',
  'changing auth.users.email updates profiles.email'
);

-- ---------------------------------------------------------------------------
-- user_has_role no es ejecutable por los roles de la API
-- ---------------------------------------------------------------------------
select ok(
  not has_function_privilege('authenticated', 'public.user_has_role(uuid, public.app_role)', 'execute')
  and not has_function_privilege('anon', 'public.user_has_role(uuid, public.app_role)', 'execute')
  and not has_function_privilege('service_role', 'public.user_has_role(uuid, public.app_role)', 'execute'),
  'user_has_role is not executable by API roles'
);

select * from finish();
rollback;

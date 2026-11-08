-- Pruebas pgTAP del guard de profiles.status (0001 + corrección 0004).
-- Todo ocurre dentro de una transacción que se revierte al final: no deja datos.
begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('71111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'sr-student@test.local', '{"full_name":"SR Student"}', '{}', now(), now()),
  ('72222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'sr-other@test.local', '{"full_name":"SR Other"}', '{}', now(), now()),
  ('74444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'sr-admin@test.local', '{"full_name":"SR Admin"}', '{}', now(), now());

insert into public.user_roles (user_id, role) values ('74444444-4444-4444-4444-444444444444', 'admin');

-- ---------------------------------------------------------------------------
-- service_role
-- ---------------------------------------------------------------------------
set local role service_role;
select lives_ok(
  $$ update public.profiles set status = 'suspended' where id = '72222222-2222-2222-2222-222222222222' $$,
  'service_role can update a profile status'
);
reset role;
select is(
  (select status from public.profiles where id = '72222222-2222-2222-2222-222222222222'),
  'suspended',
  'service_role status change is persisted'
);
update public.profiles set status = 'active' where id = '72222222-2222-2222-2222-222222222222';

-- ---------------------------------------------------------------------------
-- authenticated: alumno
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"71111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok(
  $$ update public.profiles set status = 'suspended' where id = '71111111-1111-1111-1111-111111111111' $$,
  '42501',
  'only an admin can change profiles.status',
  'authenticated student still cannot change status'
);
select lives_ok(
  $$ update public.profiles set full_name = 'Nuevo nombre' where id = '71111111-1111-1111-1111-111111111111' $$,
  'authenticated student can still edit own name'
);

-- ---------------------------------------------------------------------------
-- authenticated: admin
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"74444444-4444-4444-4444-444444444444","role":"authenticated"}';
select lives_ok(
  $$ update public.profiles set status = 'suspended' where id = '72222222-2222-2222-2222-222222222222' $$,
  'authenticated admin still can change status'
);
reset role;
select is(
  (select status from public.profiles where id = '72222222-2222-2222-2222-222222222222'),
  'suspended',
  'admin status change is persisted'
);

select * from finish();
rollback;

-- Pruebas pgTAP de auditoría (migración 0002_audit.sql).
-- Todo ocurre dentro de una transacción que se revierte al final: no deja datos.
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

-- Usuarios de prueba (como postgres); el trigger de alta crea perfil + rol student.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'student@test.local', '{"full_name":"Student"}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'teacher@test.local', '{"full_name":"Teacher"}', '{}', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin@test.local', '{"full_name":"Admin"}', '{}', now(), now());

insert into public.user_roles (user_id, role) values
  ('33333333-3333-3333-3333-333333333333', 'teacher'),
  ('44444444-4444-4444-4444-444444444444', 'admin');

-- ---------------------------------------------------------------------------
-- El alta (ejecutada por postgres) también queda auditada, con actor nulo.
-- ---------------------------------------------------------------------------
select is(
  (select actor from public.audit_logs
    where table_name = 'profiles' and action = 'INSERT'
      and row_id = '11111111-1111-1111-1111-111111111111'),
  null,
  'signup is audited with null actor when run by postgres'
);

-- ---------------------------------------------------------------------------
-- Admin cambia un rol y un estado
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

insert into public.user_roles (user_id, role) values ('11111111-1111-1111-1111-111111111111', 'teacher');
update public.profiles set status = 'suspended' where id = '11111111-1111-1111-1111-111111111111';

select ok(
  (select count(*) from public.audit_logs) > 0,
  'admin can select audit_logs'
);

reset role;

select results_eq(
  $$ select actor, row_id, action, new_data ->> 'role' from public.audit_logs
     where table_name = 'user_roles'
       and row_id = '11111111-1111-1111-1111-111111111111:teacher' $$,
  $$ values ('44444444-4444-4444-4444-444444444444'::uuid,
             '11111111-1111-1111-1111-111111111111:teacher'::text,
             'INSERT'::text, 'teacher'::text) $$,
  'role change writes an audit row with actor'
);

select results_eq(
  $$ select actor, action, old_data ->> 'status', new_data ->> 'status' from public.audit_logs
     where table_name = 'profiles' and action = 'UPDATE'
       and row_id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('44444444-4444-4444-4444-444444444444'::uuid, 'UPDATE'::text,
             'active'::text, 'suspended'::text) $$,
  'profile status change is audited with old and new status'
);

-- ---------------------------------------------------------------------------
-- Solo admin lee audit_logs
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select is_empty($$ select 1 from public.audit_logs $$, 'only admin can select audit_logs: teacher sees 0 rows');

-- Estudiante (suspendido arriba; también debe ver 0). Se reactiva antes para no depender del estado.
reset role;
update public.profiles set status = 'active' where id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is_empty($$ select 1 from public.audit_logs $$, 'only admin can select audit_logs: student sees 0 rows');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select 1 from public.audit_logs $$, '42501', null, 'only admin can select audit_logs: anon cannot select');

-- ---------------------------------------------------------------------------
-- Append-only
-- ---------------------------------------------------------------------------
reset role;
create temp table audit_snapshot as select * from public.audit_logs;

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
select throws_ok($$ update public.audit_logs set action = 'DELETE' $$, '42501', null, 'nobody can update or delete audit_logs: admin update');
select throws_ok($$ delete from public.audit_logs $$, '42501', null, 'nobody can update or delete audit_logs: admin delete');
select throws_ok(
  $$ insert into public.audit_logs (table_name, row_id, action) values ('profiles', 'x', 'INSERT') $$,
  '42501', null, 'authenticated cannot insert into audit_logs directly'
);

reset role;
select throws_ok($$ update public.audit_logs set action = 'DELETE' $$, '42501', null, 'nobody can update or delete audit_logs: postgres update');
select throws_ok($$ delete from public.audit_logs $$, '42501', null, 'nobody can update or delete audit_logs: postgres delete');

select is_empty(
  $$ (select * from audit_snapshot except select * from public.audit_logs)
     union all
     (select * from public.audit_logs except select * from audit_snapshot) $$,
  'nobody can update or delete audit_logs: state unchanged'
);

select * from finish();
rollback;

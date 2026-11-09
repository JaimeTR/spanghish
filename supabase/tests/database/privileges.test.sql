-- Pruebas pgTAP de privilegios por defecto, service_role y enable_audit (0006).
-- Todo ocurre dentro de una transacción que se revierte al final: no deja datos.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

-- ---------------------------------------------------------------------------
-- Privilegios por defecto: tabla y función nuevas en public (creadas por postgres,
-- igual que las migraciones).
-- ---------------------------------------------------------------------------
create table public.__probe (
  id uuid primary key default gen_random_uuid(),
  note text,
  updated_at timestamptz not null default now() - interval '1 day'
);
create function public.__probe_fn() returns int language sql as $$ select 1 $$;

select ok(
  not has_table_privilege('anon', 'public.__probe', 'select')
  and not has_table_privilege('anon', 'public.__probe', 'insert')
  and not has_table_privilege('anon', 'public.__probe', 'update')
  and not has_table_privilege('anon', 'public.__probe', 'delete'),
  'new table in public gives no privilege to anon or authenticated: anon'
);
select ok(
  not has_table_privilege('authenticated', 'public.__probe', 'select')
  and not has_table_privilege('authenticated', 'public.__probe', 'insert')
  and not has_table_privilege('authenticated', 'public.__probe', 'update')
  and not has_table_privilege('authenticated', 'public.__probe', 'delete'),
  'new table in public gives no privilege to anon or authenticated: authenticated'
);
select ok(
  has_table_privilege('service_role', 'public.__probe', 'select')
  and has_table_privilege('service_role', 'public.__probe', 'insert')
  and has_table_privilege('service_role', 'public.__probe', 'update')
  and has_table_privilege('service_role', 'public.__probe', 'delete'),
  'new table in public gives DML to service_role'
);
select ok(
  not has_table_privilege('service_role', 'public.__probe', 'truncate'),
  'new table in public does not give TRUNCATE to service_role'
);
select ok(
  not has_function_privilege('anon', 'public.__probe_fn()', 'execute'),
  'new function in public is not executable by anon or authenticated: anon'
);
select ok(
  not has_function_privilege('authenticated', 'public.__probe_fn()', 'execute'),
  'new function in public is not executable by anon or authenticated: authenticated'
);
select ok(
  not has_function_privilege('service_role', 'public.__probe_fn()', 'execute'),
  'new function in public is not executable by service_role either'
);

-- ---------------------------------------------------------------------------
-- service_role sobre las tablas de 1A
-- ---------------------------------------------------------------------------
set local role service_role;
select lives_ok(
  $$ select 1 from public.profiles limit 1;
     select 1 from public.user_roles limit 1;
     select 1 from public.languages limit 1;
     select 1 from public.levels limit 1 $$,
  'service_role can select profiles, user_roles, languages and levels'
);
select lives_ok(
  $$ select 1 from public.audit_logs limit 1 $$,
  'service_role can select but not insert audit_logs: select'
);
select throws_ok(
  $$ insert into public.audit_logs (table_name, row_id, action) values ('x', 'x', 'INSERT') $$,
  '42501',
  null,
  'service_role can select but not insert audit_logs: insert'
);
reset role;

-- ---------------------------------------------------------------------------
-- enable_audit
-- ---------------------------------------------------------------------------
select public.enable_audit('public.__probe');
select has_trigger('public', '__probe', 'audit___probe_ins_del',
  'enable_audit creates insert/delete and update triggers: ins_del');
select has_trigger('public', '__probe', 'audit___probe_upd',
  'enable_audit creates insert/delete and update triggers: upd');
select has_trigger('public', 'levels', 'audit_levels_upd', 'levels uses enable_audit triggers');
select hasnt_trigger('public', 'levels', 'audit_levels', 'old levels audit trigger is gone');

-- Ejecutar dos veces no duplica triggers.
select public.enable_audit('public.__probe');
select is(
  (select count(*)::int from pg_trigger
    where tgrelid = 'public.__probe'::regclass and not tgisinternal),
  2,
  'enable_audit is idempotent'
);

insert into public.__probe (note) values ('a');
select is(
  (select count(*)::int from public.audit_logs where table_name = '__probe' and action = 'INSERT'),
  1,
  'enable_audit audits inserts'
);

create temp table levels_audit_before as
  select count(*) as n from public.audit_logs where table_name = 'levels';

update public.levels set name_es = name_es where language_code = 'es' and code = 'A1';
select is(
  (select count(*) from public.audit_logs where table_name = 'levels'),
  (select n from levels_audit_before),
  'no-op update on levels writes no audit row'
);

update public.levels set name_es = 'A1 Inicial' where language_code = 'es' and code = 'A1';
select is(
  (select count(*) from public.audit_logs where table_name = 'levels'),
  (select n + 1 from levels_audit_before),
  'real update on levels still writes one audit row'
);

select ok(
  not has_function_privilege('authenticated', 'public.enable_audit(regclass)', 'execute')
  and not has_function_privilege('anon', 'public.enable_audit(regclass)', 'execute')
  and not has_function_privilege('service_role', 'public.enable_audit(regclass)', 'execute'),
  'authenticated cannot execute enable_audit'
);

-- ---------------------------------------------------------------------------
-- touch_updated_at y reject_mutation
-- ---------------------------------------------------------------------------
create trigger probe_touch before update on public.__probe
  for each row execute function public.touch_updated_at();
update public.__probe set note = 'b';
select is(
  (select updated_at from public.__probe),
  now(),
  'touch_updated_at sets updated_at to now()'
);

create trigger probe_append_only before update or delete on public.__probe
  for each row execute function public.reject_mutation();
select throws_ok(
  $$ update public.__probe set note = 'c' $$,
  '42501',
  'append-only',
  'reject_mutation blocks updates'
);
select throws_ok(
  $$ delete from public.__probe $$,
  '42501',
  'append-only',
  'reject_mutation blocks deletes'
);

select * from finish();
rollback;

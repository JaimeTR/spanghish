-- 0006_privileges_baseline.sql
-- Base de privilegios para 1B (pendientes de 1A):
--   * Privilegios por defecto: Supabase concede ALL sobre tablas/secuencias y
--     EXECUTE sobre funciones nuevas de public a anon, authenticated y
--     service_role. A partir de aquí, nada nuevo es accesible por la API salvo
--     grant explícito en su migración. service_role recibe DML por defecto
--     (sin TRUNCATE/REFERENCES/TRIGGER) para tablas, y nada sobre funciones.
--   * Política única de service_role en las tablas de 1A: DML en profiles,
--     user_roles, languages y levels; en audit_logs solo SELECT (sigue siendo
--     append-only vía audit_row()).
--   * Utilidades de triggers: touch_updated_at(), reject_mutation() y
--     enable_audit(tabla), que crea los triggers de auditoría y no registra
--     UPDATE sin cambios (WHEN old.* is distinct from new.*).
--
-- Las migraciones se ejecutan como postgres: los privilegios por defecto se
-- fijan para objetos creados por ese rol.

-- ---------------------------------------------------------------------------
-- Privilegios por defecto (objetos futuros creados por postgres)
-- ---------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;

-- EXECUTE a PUBLIC es un privilegio por defecto global (no por esquema): un
-- revoke "in schema public" no lo quitaría, así que se revoca globalmente para
-- las funciones de postgres, y además por esquema el que concede Supabase.
alter default privileges for role postgres
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- service_role sobre las tablas existentes
-- ---------------------------------------------------------------------------
revoke all on table public.profiles, public.user_roles, public.languages, public.levels
  from service_role;
grant select, insert, update, delete
  on table public.profiles, public.user_roles, public.languages, public.levels
  to service_role;

revoke all on table public.audit_logs from service_role;
grant select on table public.audit_logs to service_role;

-- ---------------------------------------------------------------------------
-- Utilidades de triggers
-- ---------------------------------------------------------------------------
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.touch_updated_at() is 'Trigger BEFORE UPDATE: mantiene updated_at.';

create function public.reject_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'append-only' using errcode = '42501';
end;
$$;

comment on function public.reject_mutation() is 'Trigger BEFORE UPDATE OR DELETE para tablas append-only.';

-- enable_audit: no es security definer; solo lo llaman las migraciones (postgres).
-- Idempotente: vuelve a crear los dos triggers si ya existían.
create function public.enable_audit(p_table regclass)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_name text;
begin
  select c.relname into v_name from pg_catalog.pg_class c where c.oid = p_table;

  execute format('drop trigger if exists %I on %s', 'audit_' || v_name || '_ins_del', p_table);
  execute format('drop trigger if exists %I on %s', 'audit_' || v_name || '_upd', p_table);

  execute format(
    'create trigger %I after insert or delete on %s '
    'for each row execute function public.audit_row()',
    'audit_' || v_name || '_ins_del', p_table
  );
  execute format(
    'create trigger %I after update on %s '
    'for each row when (old.* is distinct from new.*) execute function public.audit_row()',
    'audit_' || v_name || '_upd', p_table
  );
end;
$$;

comment on function public.enable_audit(regclass) is
  'Crea los triggers de auditoría (insert/delete y update con cambios) de una tabla.';

-- Por si acaso (las funciones de arriba ya nacen sin EXECUTE para la API).
revoke execute on function public.touch_updated_at() from public, anon, authenticated, service_role;
revoke execute on function public.reject_mutation() from public, anon, authenticated, service_role;
revoke execute on function public.enable_audit(regclass) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Auditoría de las tablas de 1A con enable_audit
-- (profiles sigue auditando sus UPDATE sin cambios de otras transacciones,
-- porque profiles_before_update renueva updated_at).
-- ---------------------------------------------------------------------------
drop trigger audit_profiles on public.profiles;
drop trigger audit_user_roles on public.user_roles;
drop trigger audit_languages on public.languages;
drop trigger audit_levels on public.levels;

select public.enable_audit('public.profiles');
select public.enable_audit('public.user_roles');
select public.enable_audit('public.languages');
select public.enable_audit('public.levels');

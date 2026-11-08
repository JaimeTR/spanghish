-- 0002_audit.sql
-- Auditoría por triggers sobre profiles y user_roles.
--
-- Reglas:
--   * audit_logs es append-only: solo se escribe vía audit_row() (SECURITY
--     DEFINER); ningún rol de la API tiene INSERT/UPDATE/DELETE/TRUNCATE y un
--     trigger BEFORE UPDATE OR DELETE rechaza cambios incluso del dueño (postgres).
--     TRUNCATE no pasa por triggers de fila: lo usan las herramientas de
--     Supabase (db reset) y queda fuera del alcance de la API por falta de privilegio.
--   * Solo un admin activo puede leer (SELECT); anon no tiene ningún privilegio.
--   * actor = auth.uid() en el momento de la escritura (null si lo hace postgres
--     o service_role sin JWT de usuario).
--   * No se registran secretos: profiles y user_roles no contienen ninguno.
--     Si se audita una tabla futura con datos sensibles, hay que excluirlos aquí.

-- ---------------------------------------------------------------------------
-- Tabla
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor uuid,
  table_name text not null,
  row_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  at timestamptz not null default now()
);

comment on table public.audit_logs is 'Registro de auditoría append-only de cambios en tablas sensibles.';

create index audit_logs_table_row_idx on public.audit_logs (table_name, row_id);
create index audit_logs_at_idx on public.audit_logs (at);

alter table public.audit_logs enable row level security;

-- Supabase concede privilegios amplios por defecto en tablas nuevas de public:
-- se revocan todos y se concede solo lectura a authenticated (filtrada por RLS).
revoke all on table public.audit_logs from public, anon, authenticated, service_role;
revoke all on sequence public.audit_logs_id_seq from public, anon, authenticated, service_role;
grant select on table public.audit_logs to authenticated;

create policy audit_logs_select_admin
  on public.audit_logs for select
  to authenticated
  using ((select public.has_role('admin')));
-- Sin políticas de INSERT/UPDATE/DELETE: nadie las tiene vía API.

-- ---------------------------------------------------------------------------
-- Inmutabilidad
-- ---------------------------------------------------------------------------
create function public.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs is append-only'
    using errcode = '42501';
end;
$$;

revoke execute on function public.audit_logs_immutable() from public, anon, authenticated, service_role;

create trigger audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();

-- ---------------------------------------------------------------------------
-- Trigger de auditoría
-- SECURITY DEFINER: inserta aunque ningún rol de la API tenga INSERT.
-- row_id: profiles = id; user_roles = user_id || ':' || role.
-- ---------------------------------------------------------------------------
create function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  v_row_id text;
begin
  r := to_jsonb(case when tg_op = 'DELETE' then old else new end);

  if tg_table_name = 'user_roles' then
    v_row_id := (r ->> 'user_id') || ':' || (r ->> 'role');
  else
    v_row_id := r ->> 'id';
  end if;

  insert into public.audit_logs (actor, table_name, row_id, action, old_data, new_data)
  values (
    (select auth.uid()),
    tg_table_name,
    v_row_id,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  return null;
end;
$$;

comment on function public.audit_row() is 'Trigger AFTER de auditoría: registra INSERT/UPDATE/DELETE en audit_logs.';

revoke execute on function public.audit_row() from public, anon, authenticated, service_role;

create trigger audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.audit_row();

create trigger audit_user_roles
  after insert or update or delete on public.user_roles
  for each row execute function public.audit_row();

-- 0003_languages_levels.sql
-- Catálogo de idiomas y niveles (A1..C2) con semilla, RLS y auditoría.
--
-- Reglas:
--   * Lectura: solo usuarios autenticados y activos (public.is_active()).
--   * Escritura (INSERT/UPDATE/DELETE): solo admin (public.has_role('admin')).
--   * anon no tiene ningún privilegio.
--   * Los triggers de auditoría se crean DESPUÉS de insertar la semilla, así la
--     semilla no genera filas en audit_logs (solo los cambios posteriores).

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table public.languages (
  code text primary key check (code ~ '^[a-z]{2}$'),
  name_es text not null,
  name_en text not null,
  active boolean not null default true
);

comment on table public.languages is 'Idiomas del catálogo (código ISO 639-1 de dos letras).';

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  language_code text not null references public.languages (code) on update cascade,
  code text not null check (code in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  name_es text not null,
  name_en text not null,
  sort smallint not null,
  unique (language_code, code)
);

comment on table public.levels is 'Niveles MCER (A1..C2) por idioma.';

create index levels_language_code_idx on public.levels (language_code);

-- ---------------------------------------------------------------------------
-- Semilla
-- ---------------------------------------------------------------------------
insert into public.languages (code, name_es, name_en) values
  ('es', 'Español', 'Spanish'),
  ('en', 'Inglés', 'English');

insert into public.levels (language_code, code, name_es, name_en, sort)
select l.code, v.code, v.name_es, v.name_en, v.sort
from public.languages l
cross join (values
  ('A1', 'A1 Principiante',       'A1 Beginner',           1::smallint),
  ('A2', 'A2 Elemental',          'A2 Elementary',         2::smallint),
  ('B1', 'B1 Intermedio',         'B1 Intermediate',       3::smallint),
  ('B2', 'B2 Intermedio alto',    'B2 Upper intermediate', 4::smallint),
  ('C1', 'C1 Avanzado',           'C1 Advanced',           5::smallint),
  ('C2', 'C2 Maestría',           'C2 Proficiency',        6::smallint)
) as v (code, name_es, name_en, sort);

-- ---------------------------------------------------------------------------
-- RLS y privilegios
-- ---------------------------------------------------------------------------
alter table public.languages enable row level security;
alter table public.levels enable row level security;

-- Supabase concede privilegios amplios por defecto: se revocan y se conceden
-- solo los necesarios a authenticated (filtrados por RLS).
revoke all on table public.languages from public, anon, authenticated, service_role;
revoke all on table public.levels from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.languages to authenticated;
grant select, insert, update, delete on table public.levels to authenticated;

create policy languages_select_active
  on public.languages for select
  to authenticated
  using ((select public.is_active()));

create policy languages_insert_admin
  on public.languages for insert
  to authenticated
  with check ((select public.has_role('admin')));

create policy languages_update_admin
  on public.languages for update
  to authenticated
  using ((select public.has_role('admin')))
  with check ((select public.has_role('admin')));

create policy languages_delete_admin
  on public.languages for delete
  to authenticated
  using ((select public.has_role('admin')));

create policy levels_select_active
  on public.levels for select
  to authenticated
  using ((select public.is_active()));

create policy levels_insert_admin
  on public.levels for insert
  to authenticated
  with check ((select public.has_role('admin')));

create policy levels_update_admin
  on public.levels for update
  to authenticated
  using ((select public.has_role('admin')))
  with check ((select public.has_role('admin')));

create policy levels_delete_admin
  on public.levels for delete
  to authenticated
  using ((select public.has_role('admin')));

-- ---------------------------------------------------------------------------
-- Auditoría
-- row_id: profiles = id; user_roles = user_id || ':' || role;
--         languages = code; levels = id (resto de tablas: columna id).
-- ---------------------------------------------------------------------------
create or replace function public.audit_row()
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
  elsif tg_table_name = 'languages' then
    v_row_id := r ->> 'code';
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

-- create or replace conserva los privilegios; se reafirma la revocación.
revoke execute on function public.audit_row() from public, anon, authenticated, service_role;

create trigger audit_languages
  after insert or update or delete on public.languages
  for each row execute function public.audit_row();

create trigger audit_levels
  after insert or update or delete on public.levels
  for each row execute function public.audit_row();

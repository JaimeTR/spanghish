-- 0001_identity.sql
-- Identidad: perfiles, roles (una persona puede tener varios) y RLS.
--
-- Reglas:
--   * Toda lectura/escritura de datos privados exige is_active(): una cuenta
--     con status = 'suspended' no ve ni modifica nada (ni su propio perfil).
--   * profiles: cada usuario lee su fila; admin lee todas.
--     El dueño solo puede cambiar full_name y preferred_locale; admin además status.
--   * user_roles: cada usuario lee sus roles; solo admin inserta/actualiza/borra.
--   * anon no tiene ningún privilegio sobre estas tablas ni funciones.
--   * La autorización nunca usa raw_user_meta_data (editable por el usuario):
--     se usa solo para el nombre visible inicial.

-- ---------------------------------------------------------------------------
-- Tipos y tablas
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'teacher', 'student', 'guardian');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 200),
  email text,
  preferred_locale text not null default 'es' check (preferred_locale in ('es', 'en')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil público-interno de cada usuario de auth.users (1:1).';

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  primary key (user_id, role)
);

comment on table public.user_roles is 'Roles de cada usuario; una persona puede tener varios.';
-- La PK (user_id, role) sirve de índice para las búsquedas por user_id de las
-- políticas y de has_role(); no hace falta un índice adicional.

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- ---------------------------------------------------------------------------
-- Funciones auxiliares de autorización
-- security definer para poder leer profiles/user_roles sin recursión de RLS;
-- siempre referidas al usuario que llama ((select auth.uid())).
-- ---------------------------------------------------------------------------
create function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.status = 'active' from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

comment on function public.is_active() is 'true si el usuario actual existe y su cuenta no está suspendida.';

-- has_role() también exige cuenta activa: un rol no otorga nada a una cuenta
-- suspendida, aunque una política futura olvide llamar a is_active().
create function public.has_role(r public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = (select auth.uid())
      and ur.role = r
      and p.status = 'active'
  );
$$;

comment on function public.has_role(public.app_role) is 'true si el usuario actual (activo) tiene el rol indicado.';

-- Supabase concede EXECUTE por defecto a anon/authenticated/service_role en public.
revoke execute on function public.is_active() from public, anon, service_role;
revoke execute on function public.has_role(public.app_role) from public, anon, service_role;
grant execute on function public.is_active() to authenticated;
grant execute on function public.has_role(public.app_role) to authenticated;

-- ---------------------------------------------------------------------------
-- Alta: al crear un usuario en auth.users se crea su perfil y el rol 'student'.
-- Sin bloque EXCEPTION a propósito: si algo falla, falla el alta completa y no
-- quedan cuentas a medio crear.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  -- Recorte a 200 para no romper el alta con metadatos largos (check de profiles).
  values (new.id, new.email, left(new.raw_user_meta_data ->> 'full_name', 200));

  insert into public.user_roles (user_id, role)
  values (new.id, 'student');

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated, service_role;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Protección de columnas de profiles
--
-- Decisión: privilegios por columna + trigger BEFORE UPDATE.
--   * authenticated solo tiene UPDATE sobre (full_name, preferred_locale, status).
--     id, email y created_at no son modificables por ningún usuario de la API
--     (email se sincroniza desde auth.users; nadie, ni admin, lo edita aquí).
--   * status sí está concedido (para que admin pueda suspender/reactivar), así que
--     este trigger rechaza con 42501 cualquier cambio de status hecho por el rol
--     authenticated si quien llama no es admin.
--   * El trigger también mantiene updated_at.
-- Roles con privilegios superiores (postgres, service_role) no están limitados.
--
-- AVISO para migraciones futuras: el guard solo actúa cuando current_user es
-- 'authenticated'. Una función SECURITY DEFINER (propiedad de postgres) que
-- actualice profiles se ejecuta como postgres y SE SALTA este control: debe
-- volver a comprobar por sí misma (has_role('admin'), is_active()) antes de
-- cambiar status u otras columnas protegidas.
-- ---------------------------------------------------------------------------
create function public.profiles_before_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and new.status is distinct from old.status
     and not public.has_role('admin') then
    raise exception 'only an admin can change profiles.status'
      using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.profiles_before_update() from public, anon, authenticated, service_role;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

-- ---------------------------------------------------------------------------
-- Privilegios de tabla (anon: ninguno)
-- ---------------------------------------------------------------------------
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name, preferred_locale, status) on table public.profiles to authenticated;

grant select, insert, update, delete on table public.user_roles to authenticated;

-- ---------------------------------------------------------------------------
-- Políticas RLS (funciones envueltas en select para evaluarlas una vez por consulta)
-- ---------------------------------------------------------------------------
create policy profiles_select_own_or_admin
  on public.profiles for select
  to authenticated
  using (
    (select public.is_active())
    and (id = (select auth.uid()) or (select public.has_role('admin')))
  );

create policy profiles_update_own_or_admin
  on public.profiles for update
  to authenticated
  using (
    (select public.is_active())
    and (id = (select auth.uid()) or (select public.has_role('admin')))
  )
  with check (
    (select public.is_active())
    and (id = (select auth.uid()) or (select public.has_role('admin')))
  );

create policy user_roles_select_own_or_admin
  on public.user_roles for select
  to authenticated
  using (
    (select public.is_active())
    and (user_id = (select auth.uid()) or (select public.has_role('admin')))
  );

create policy user_roles_insert_admin
  on public.user_roles for insert
  to authenticated
  with check ((select public.is_active()) and (select public.has_role('admin')));

create policy user_roles_update_admin
  on public.user_roles for update
  to authenticated
  using ((select public.is_active()) and (select public.has_role('admin')))
  with check ((select public.is_active()) and (select public.has_role('admin')));

create policy user_roles_delete_admin
  on public.user_roles for delete
  to authenticated
  using ((select public.is_active()) and (select public.has_role('admin')));

-- 0007_identity_hardening.sql
-- Identidad endurecida (pendientes de 1A):
--   * user_has_role(uid, rol): para triggers y funciones security definer que
--     necesitan saber el rol de OTRO usuario (o funcionar con service_role, que
--     no puede ejecutar has_role(); lección de 0004). Sin EXECUTE para la API.
--   * Rol inicial: raw_app_meta_data ->> 'initial_role' (solo lo escribe
--     service_role/Auth admin) si es teacher, student o guardian; si no,
--     student. Nunca se lee raw_user_meta_data para roles y admin jamás se
--     asigna por metadatos (la primera admin de producción se crea por SQL).
--   * Última admin: no se puede quitar el rol admin ni suspender a la última
--     admin activa, por ningún camino de escritura (API, service_role, SQL).
--     Añadir admins no está limitado.
--   * profiles.email se mantiene sincronizado con auth.users.email.

-- ---------------------------------------------------------------------------
-- user_has_role
-- ---------------------------------------------------------------------------
create function public.user_has_role(p_user_id uuid, p_role public.app_role)
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
    where ur.user_id = p_user_id
      and ur.role = p_role
      and p.status = 'active'
  );
$$;

comment on function public.user_has_role(uuid, public.app_role) is
  'true si el usuario indicado (activo) tiene el rol. Solo para triggers y funciones definer.';

revoke execute on function public.user_has_role(uuid, public.app_role)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Rol inicial desde app_metadata
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested text;
  v_role public.app_role := 'student';
begin
  -- jsonb_typeof evita que un valor no textual (array, objeto) cuele algo raro.
  if jsonb_typeof(new.raw_app_meta_data -> 'initial_role') = 'string' then
    v_requested := new.raw_app_meta_data ->> 'initial_role';
    if v_requested in ('teacher', 'student', 'guardian') then
      v_role := v_requested::public.app_role;
    end if;
  end if;

  insert into public.profiles (id, email, full_name)
  -- Recorte a 200 para no romper el alta con metadatos largos (check de profiles).
  values (new.id, new.email, left(new.raw_user_meta_data ->> 'full_name', 200));

  insert into public.user_roles (user_id, role)
  values (new.id, v_role);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated, service_role;

-- GoTrue (auth.admin.createUser) inserta el usuario solo con provider/providers
-- y escribe el app_metadata recibido con un UPDATE posterior (verificado con la
-- CLI 2.122.0): handle_new_user ve el insert sin initial_role. Este trigger
-- aplica el rol la PRIMERA vez que aparece initial_role, y solo si la cuenta
-- sigue con el rol por defecto (exactamente {student}); después ya no cambia
-- nada (los roles se gestionan en user_roles). raw_app_meta_data solo lo puede
-- escribir Auth/service_role, nunca el propio usuario.
create function public.apply_initial_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested text;
begin
  if jsonb_typeof(new.raw_app_meta_data -> 'initial_role') <> 'string' then
    return null;
  end if;
  v_requested := new.raw_app_meta_data ->> 'initial_role';
  if v_requested not in ('teacher', 'guardian') then
    return null; -- student ya es el rol por defecto; admin nunca por metadatos
  end if;

  if (select array_agg(ur.role order by ur.role) from public.user_roles ur where ur.user_id = new.id)
     is distinct from array['student'::public.app_role] then
    return null;
  end if;

  insert into public.user_roles (user_id, role) values (new.id, v_requested::public.app_role);
  delete from public.user_roles where user_id = new.id and role = 'student';
  return null;
end;
$$;

revoke execute on function public.apply_initial_role() from public, anon, authenticated, service_role;

create trigger on_auth_user_initial_role_set
  after update of raw_app_meta_data on auth.users
  for each row
  when (old.raw_app_meta_data -> 'initial_role' is null
        and new.raw_app_meta_data -> 'initial_role' is not null)
  execute function public.apply_initial_role();

-- ---------------------------------------------------------------------------
-- Última admin
-- ---------------------------------------------------------------------------
create function public.guard_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if tg_table_name = 'user_roles' then
    -- Un UPDATE que deja la misma fila como admin no quita nada.
    if tg_op = 'UPDATE' and new.role = 'admin' and new.user_id = old.user_id then
      return new;
    end if;
    v_user := old.user_id;
  else
    -- profiles: solo importa si la persona que se suspende es admin.
    if not public.user_has_role(old.id, 'admin') then
      return new;
    end if;
    v_user := old.id;
  end if;

  -- Serializa las retiradas de admin: dos admins no pueden quitarse a la vez.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('public.guard_last_admin'));

  if not exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.role = 'admin'
      and p.status = 'active'
      and ur.user_id <> v_user
  ) then
    raise exception 'last_admin' using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

comment on function public.guard_last_admin() is
  'Impide quitar el rol admin o suspender a la última admin activa (P0001 last_admin).';

revoke execute on function public.guard_last_admin() from public, anon, authenticated, service_role;

create trigger user_roles_guard_last_admin
  before update or delete on public.user_roles
  for each row
  when (old.role = 'admin')
  execute function public.guard_last_admin();

create trigger profiles_guard_last_admin
  before update of status on public.profiles
  for each row
  when (new.status = 'suspended' and old.status is distinct from 'suspended')
  execute function public.guard_last_admin();

-- ---------------------------------------------------------------------------
-- Sincronía de email auth.users -> profiles
-- ---------------------------------------------------------------------------
create function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return null;
end;
$$;

revoke execute on function public.sync_profile_email() from public, anon, authenticated, service_role;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

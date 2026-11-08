-- 0004_profiles_status_guard_service_role.sql
-- Corrige profiles_before_update (0001): la condición única
--   current_user = 'authenticated' and ... and not public.has_role('admin')
-- hace que Postgres compruebe EXECUTE sobre has_role() también para service_role
-- (al que 0001 se lo revocó a propósito), y todo UPDATE de profiles hecho con la
-- service key fallaba con 42501 "permission denied for function has_role".
--
-- Solución: IF anidados. Cada condición de PL/pgSQL es una expresión aparte que
-- solo se prepara al alcanzarse, así que has_role() se evalúa únicamente cuando
-- quien llama es 'authenticated' y el status cambia. No se concede nada nuevo a
-- service_role y para authenticated la regla es idéntica.

create or replace function public.profiles_before_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if new.status is distinct from old.status then
      if not public.has_role('admin') then
        raise exception 'only an admin can change profiles.status'
          using errcode = '42501';
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.profiles_before_update() from public, anon, authenticated, service_role;

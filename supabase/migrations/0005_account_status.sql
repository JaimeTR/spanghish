-- 0005_account_status.sql
-- account_status(): estado de la cuenta del usuario que llama, para que la app
-- distinga "suspendida" de "sin perfil" (por RLS un suspendido no puede leer ni
-- su propio perfil, e is_active() devuelve false en ambos casos).
--   'active' | 'suspended' | NULL (sin perfil o sin sesión)
-- Solo devuelve datos del propio usuario ((select auth.uid())); nada de otros.

create function public.account_status()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.status from public.profiles p where p.id = (select auth.uid());
$$;

comment on function public.account_status() is 'Estado (active/suspended) de la cuenta del usuario actual; NULL si no tiene perfil.';

revoke execute on function public.account_status() from public, anon, service_role;
grant execute on function public.account_status() to authenticated;

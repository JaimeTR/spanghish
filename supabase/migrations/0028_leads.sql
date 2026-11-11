-- 0028_leads.sql
-- Solicitudes: lo que llega por los formularios de la web pública (clase gratis
-- y contacto) se guarda en el portal además de enviarse por correo.
--
--   * leads: solo administración (lectura, cambio de estado y notas).
--   * submit_lead(): única vía de entrada de la web (clave anónima). Valida
--     formato y longitudes, frena avalanchas (60 solicitudes por hora en total)
--     y no duplica la misma solicitud enviada dos veces en 10 minutos.
--   * Contienen datos personales: auditoría con enable_audit() como las fichas
--     de alumnos.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('booking', 'contact')),
  full_name text not null check (char_length(full_name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (char_length(phone) <= 30),
  audience text check (audience in ('adults', 'kids', 'mature')),
  place text check (place in ('sunshineCoast', 'brisbane', 'online', 'notSure')),
  times text check (char_length(times) <= 300),
  language text check (language in ('spanish', 'english')),
  message text check (char_length(message) <= 2000),
  site_locale text not null default 'es' check (site_locale in ('es', 'en')),
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'discarded')),
  admin_notes text check (char_length(admin_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.leads is 'Solicitudes de la web pública (clase gratis y contacto); solo administración.';
create index leads_status_created_idx on public.leads (status, created_at desc);

create trigger leads_touch_updated_at before update on public.leads
  for each row execute function public.touch_updated_at();

alter table public.leads enable row level security;
revoke all on table public.leads from anon, authenticated;
grant select, delete on table public.leads to authenticated;
grant update (status, admin_notes) on table public.leads to authenticated;

create policy leads_admin_select on public.leads for select to authenticated
  using ((select public.is_active()) and (select public.has_role('admin')));
create policy leads_admin_update on public.leads for update to authenticated
  using ((select public.is_active()) and (select public.has_role('admin')))
  with check ((select public.is_active()) and (select public.has_role('admin')));
create policy leads_admin_delete on public.leads for delete to authenticated
  using ((select public.is_active()) and (select public.has_role('admin')));

create function public.submit_lead(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text := p_payload ->> 'kind';
  v_name text := btrim(p_payload ->> 'name');
  v_email text := lower(btrim(p_payload ->> 'email'));
  v_message text := nullif(btrim(p_payload ->> 'message'), '');
  v_id uuid;
begin
  if jsonb_typeof(p_payload) is distinct from 'object' or v_kind not in ('booking', 'contact') then
    raise exception 'invalid' using errcode = 'P0001';
  end if;
  if v_name is null or char_length(v_name) not between 1 and 100
     or v_email is null or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or char_length(v_email) > 254 then
    raise exception 'invalid' using errcode = 'P0001';
  end if;

  -- Misma solicitud enviada dos veces seguidas: se devuelve la que ya existe.
  select l.id into v_id from public.leads l
  where l.email = v_email and l.kind = v_kind and l.message is not distinct from v_message
    and l.created_at > now() - interval '10 minutes'
  limit 1;
  if v_id is not null then
    return v_id;
  end if;

  if (select count(*) from public.leads l where l.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.leads (kind, full_name, email, phone, audience, place, times, language, message, site_locale)
  values (
    v_kind, v_name, v_email,
    nullif(btrim(p_payload ->> 'phone'), ''),
    nullif(p_payload ->> 'audience', ''),
    nullif(p_payload ->> 'place', ''),
    nullif(btrim(p_payload ->> 'times'), ''),
    nullif(p_payload ->> 'language', ''),
    v_message,
    coalesce(nullif(p_payload ->> 'locale', ''), 'es')
  )
  returning id into v_id;
  return v_id;
end;
$$;

comment on function public.submit_lead(jsonb) is 'Entrada de solicitudes desde la web pública (anon): valida, frena avalanchas y no duplica.';

revoke execute on function public.submit_lead(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.submit_lead(jsonb) to anon, authenticated;

select public.enable_audit('public.leads');

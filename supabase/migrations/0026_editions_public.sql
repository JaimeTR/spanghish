-- 0026_editions_public.sql
-- Las ediciones llevan su sede, su horario y, opcionalmente, un enlace de
-- inscripción externo, y la web pública las lee por una RPC.
--
--   * program_editions.location_id: sede de la edición (las sedes 'home' y
--     'online' no llevan dirección: ver locations_no_private_address).
--   * schedule_es / schedule_en: horario en texto libre ("Miércoles, 13:30–14:40").
--   * enrol_url: enlace https opcional (p. ej. una página de reservas externa).
--   * list_public_editions(): solo ediciones ABIERTAS de programas públicos y
--     activos que no hayan terminado; con la sede (sin direcciones privadas) y
--     los precios activos de la edición (si no hay uno de un tipo, el del
--     programa). anon y authenticated pueden ejecutarla; no devuelve nada más.

alter table public.program_editions
  add column location_id uuid references public.locations (id),
  add column schedule_es text check (char_length(schedule_es) <= 200),
  add column schedule_en text check (char_length(schedule_en) <= 200),
  add column enrol_url text check (enrol_url ~ '^https://' and char_length(enrol_url) <= 500);

create index program_editions_location_id_idx on public.program_editions (location_id);

create function public.list_public_editions()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(row order by row ->> 'starts_on', row ->> 'program_code'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'edition_id', e.id,
      'program_code', p.code,
      'program_name_es', p.name_es,
      'program_name_en', p.name_en,
      'description_es', p.description_es,
      'description_en', p.description_en,
      'audience', p.audience,
      'format', p.format,
      'level_code', lv.code,
      'duration_weeks', p.duration_weeks,
      'lesson_minutes', p.lesson_minutes,
      'label_es', e.label_es,
      'label_en', e.label_en,
      'starts_on', e.starts_on,
      'ends_on', e.ends_on,
      'schedule_es', e.schedule_es,
      'schedule_en', e.schedule_en,
      'enrol_url', e.enrol_url,
      'location', case when l.id is null then null else jsonb_build_object(
        'name', l.name,
        'kind', l.kind,
        'region', l.region,
        'address', l.address,
        'map_url', l.map_url
      ) end,
      'prices', coalesce((
        select jsonb_agg(jsonb_build_object(
          'kind', x.kind,
          'amount_cents', x.amount_cents,
          'lessons_included', x.lessons_included
        ) order by x.kind)
        from (
          select distinct on (pp.kind, pp.lessons_included) pp.kind, pp.amount_cents, pp.lessons_included
          from public.program_prices pp
          where pp.program_id = p.id
            and pp.active
            and (pp.edition_id = e.id or pp.edition_id is null)
            and (pp.location_id is null or pp.location_id = e.location_id)
          order by pp.kind, pp.lessons_included nulls first, (pp.edition_id is null), (pp.location_id is null)
        ) x
      ), '[]'::jsonb)
    ) as row
    from public.program_editions e
    join public.programs p on p.id = e.program_id
    left join public.levels lv on lv.id = p.level_id
    left join public.locations l on l.id = e.location_id and l.active
    where e.status = 'open'
      and p.is_public
      and p.active
      and e.ends_on >= current_date
  ) q;
$$;

comment on function public.list_public_editions() is
  'Ediciones abiertas de programas públicos, con sede y precios. Lectura de la web.';

revoke execute on function public.list_public_editions() from public, anon, authenticated, service_role;
grant execute on function public.list_public_editions() to anon, authenticated;

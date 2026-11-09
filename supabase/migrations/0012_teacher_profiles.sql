-- 0012_teacher_profiles.sql
-- Perfiles públicos de docentes (la página /teachers de la web): foto, rol,
-- biografía y datos clave en es/en, con estado borrador/publicado y orden.
--
-- Reglas:
--   * Son datos públicos de presentación, SIN datos personales sensibles (ni
--     teléfono ni correo). Se separan de la cuenta de la docente: `profile_id`
--     enlaza opcionalmente a su cuenta (null para quien aún no tiene).
--   * Lectura (authenticated): admin todo, incluidos borradores; el resto solo
--     lo publicado. Escritura: solo admin. anon no tiene privilegios de tabla:
--     la web lee por las RPC security definer de abajo (solo publicado y sin
--     columnas internas).
--   * La foto vive en el bucket público content-media (teachers/<uuid>.<ext>);
--     la ruta la fija la app y la tabla solo valida su forma.
--   * Auditoría con enable_audit() después de los datos reales iniciales.

create table public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(name) between 1 and 80),
  status public.content_status not null default 'draft',
  photo_path text check (photo_path ~ '^teachers/[0-9a-f-]{36}\.(png|jpg|webp)$'),
  photo_position text not null default '50% 30%' check (photo_position ~ '^[0-9]{1,3}% [0-9]{1,3}%$'),
  photo_alt_es text not null check (char_length(photo_alt_es) between 1 and 160),
  photo_alt_en text not null check (char_length(photo_alt_en) between 1 and 160),
  role_es text not null check (char_length(role_es) between 1 and 120),
  role_en text not null check (char_length(role_en) between 1 and 120),
  tagline_es text not null check (char_length(tagline_es) between 1 and 200),
  tagline_en text not null check (char_length(tagline_en) between 1 and 200),
  meta_description_es text not null check (char_length(meta_description_es) between 1 and 300),
  meta_description_en text not null check (char_length(meta_description_en) between 1 and 300),
  intro_es text not null check (char_length(intro_es) between 1 and 300),
  intro_en text not null check (char_length(intro_en) between 1 and 300),
  body_es text not null check (char_length(body_es) between 1 and 3000),
  body_en text not null check (char_length(body_en) between 1 and 3000),
  specialty_es text check (char_length(specialty_es) between 1 and 1500),
  specialty_en text check (char_length(specialty_en) between 1 and 1500),
  enrol_title_es text check (char_length(enrol_title_es) between 1 and 80),
  enrol_title_en text check (char_length(enrol_title_en) between 1 and 80),
  enrol_es text check (char_length(enrol_es) between 1 and 1500),
  enrol_en text check (char_length(enrol_en) between 1 and 1500),
  facts_es text[] not null default '{}',
  facts_en text[] not null default '{}',
  show_approach boolean not null default false,
  sort_order integer not null,
  profile_id uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_profiles_slug_key unique (slug),
  constraint teacher_profiles_specialty_pair check ((specialty_es is null) = (specialty_en is null)),
  constraint teacher_profiles_enrol_pair check (
    num_nonnulls(enrol_title_es, enrol_title_en, enrol_es, enrol_en) in (0, 4)
  ),
  constraint teacher_profiles_facts check (
    cardinality(facts_es) <= 6
    and cardinality(facts_en) = cardinality(facts_es)
    and public.text_items_within(facts_es, 1, 160)
    and public.text_items_within(facts_en, 1, 160)
  )
);

comment on table public.teacher_profiles is
  'Perfiles públicos de docentes para la web (es/en). Sin teléfono ni correo; profile_id enlaza opcionalmente a la cuenta.';

create index teacher_profiles_status_sort_idx on public.teacher_profiles (status, sort_order);
create index teacher_profiles_profile_id_idx on public.teacher_profiles (profile_id) where profile_id is not null;
create index teacher_profiles_created_by_idx on public.teacher_profiles (created_by);

-- ---------------------------------------------------------------------------
-- Triggers: orden automático (máximo + 10) y published_at
-- ---------------------------------------------------------------------------
create function public.teacher_profiles_prepare()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.sort_order is null then
    select coalesce(max(t.sort_order), 0) + 10 into new.sort_order from public.teacher_profiles t;
  end if;
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

comment on function public.teacher_profiles_prepare() is
  'Trigger BEFORE INSERT/UPDATE: sort_order = máximo + 10 si viene nulo; fija published_at al publicar.';

create trigger teacher_profiles_prepare before insert or update on public.teacher_profiles
  for each row execute function public.teacher_profiles_prepare();
create trigger teacher_profiles_touch_updated_at before update on public.teacher_profiles
  for each row execute function public.touch_updated_at();

revoke execute on function public.teacher_profiles_prepare() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS y privilegios
-- ---------------------------------------------------------------------------
alter table public.teacher_profiles enable row level security;

grant select, insert, update, delete on table public.teacher_profiles to authenticated;

create policy teacher_profiles_select on public.teacher_profiles for select to authenticated
  using (
    (select public.is_active())
    and ((select public.has_role('admin')) or status = 'published')
  );
create policy teacher_profiles_insert_admin on public.teacher_profiles for insert to authenticated
  with check ((select public.has_role('admin')));
create policy teacher_profiles_update_admin on public.teacher_profiles for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy teacher_profiles_delete_admin on public.teacher_profiles for delete to authenticated
  using ((select public.has_role('admin')));

-- ---------------------------------------------------------------------------
-- Datos reales iniciales: las dos docentes de la web (antes de la auditoría)
-- ---------------------------------------------------------------------------
insert into public.teacher_profiles (
  slug, name, status, photo_position, photo_alt_es, photo_alt_en, role_es, role_en, tagline_es, tagline_en,
  meta_description_es, meta_description_en, intro_es, intro_en, body_es, body_en,
  specialty_es, specialty_en, enrol_title_es, enrol_title_en, enrol_es, enrol_en,
  facts_es, facts_en, show_approach
) values
  ('maribel-mayhua', 'Maribel Mayhua', 'published', '50% 18%',
   'Retrato de Maribel Mayhua, profesora de español', 'Portrait of Maribel Mayhua, Spanish tutor',
   'Profesora de español', 'Spanish tutor',
   'Nativa de Lima (Perú), certificada para los niveles A1 a B2.',
   'Native speaker from Lima, Peru, certified for levels A1 to B2.',
   'Maribel Mayhua es profesora de español nativa, de Lima (Perú), certificada para los niveles A1 a B2. Vive en Australia.',
   'Maribel Mayhua is a native Spanish tutor from Lima, Peru, certified for levels A1 to B2. She lives in Australia.',
   'Soy Maribel, de Lima (Perú), y me apasiona enseñar español.',
   'I''m Maribel, from Lima, Peru, and I''m a passionate Spanish teacher.',
   'Mi misión es ayudarte a seguir aprendiendo y avanzando en español, hasta que lo hables con confianza.',
   'My mission is to help you keep learning and progressing in Spanish, until you speak it with confidence.',
   null, null, null, null, null, null,
   array['Nativa, de Lima (Perú)', 'Certificada para enseñar los niveles A1, A2, B1 y B2', 'Vive en Australia'],
   array['Native speaker, from Lima, Peru', 'Certified to teach levels A1, A2, B1 and B2', 'Based in Australia'],
   true),
  ('pamela-rojas', 'Pamela Rojas', 'published', '50% 30%',
   'Retrato de Pamela Rojas, profesora de español', 'Portrait of Pamela Rojas, Spanish tutor',
   'Profesora de español', 'Spanish tutor',
   'Psicóloga y viajera: español para viajeros.',
   'Psychologist and traveller: Spanish for travellers.',
   'Pamela Rojas es profesora de español, psicóloga y viajera incansable, especialista en enseñar español a viajeros.',
   'Pamela Rojas is a Spanish teacher, psychologist and tireless traveller, specialising in teaching Spanish to travellers.',
   '¡Hola! Soy profesora de español, psicóloga y viajera incansable.',
   '¡Hola! I''m a Spanish teacher, a psychologist and a tireless traveller.',
   'Mi experiencia internacional me ha regalado un sinfín de historias, culturas fascinantes y una perspectiva única que quiero compartir contigo. Aprender un nuevo idioma puede ser toda una aventura, y te prometo que mis clases no serán la excepción. ¡Vamos a divertirnos mientras progresas con confianza! Únete y exploramos juntos el mundo, una palabra a la vez.',
   'My international experience has given me countless stories, fascinating cultures and a unique perspective that I want to share with you. Learning a new language can be a real adventure, and I promise my lessons will be no exception. Let''s have fun while you progress with confidence! Join me and let''s explore the world together, one word at a time.',
   'Especialista en enseñar español a viajeros, combinando un profundo conocimiento del idioma y las costumbres de Latinoamérica con una dosis de humor y sabiduría. Mis clases te preparan para vivir experiencias auténticas, comunicarte con confianza y disfrutar del viaje al máximo.',
   'I specialise in teaching Spanish to travellers, combining a deep knowledge of the language and the customs of Latin America with a dose of humour and wisdom. My lessons prepare you to live authentic experiences, communicate with confidence and make the most of your trip.',
   'Reserva conmigo', 'Enrol with me',
   'Te guiaré en un aprendizaje efectivo y lleno de diversión. Cada palabra te llevará más cerca de nuevas culturas y aventuras. ¡Únete a mis clases y comienza esta emocionante travesía lingüística hoy!',
   'I''ll guide you through effective, fun learning. Every word will bring you closer to new cultures and adventures. Join my lessons and start this exciting language journey today!',
   array['Profesora de español, psicóloga y viajera', 'Especialista en español para viajeros', 'Para estudiantes de habla portuguesa'],
   array['Spanish teacher, psychologist and traveller', 'Specialist in Spanish for travellers', 'For Portuguese-speaking students'],
   false);

select public.enable_audit('public.teacher_profiles');

-- ---------------------------------------------------------------------------
-- Lecturas públicas (RPC security definer: solo publicado, sin columnas internas)
-- ---------------------------------------------------------------------------
create function public.list_published_teachers()
returns table (
  slug text,
  name text,
  photo_path text,
  photo_position text,
  photo_alt_es text,
  photo_alt_en text,
  role_es text,
  role_en text,
  tagline_es text,
  tagline_en text,
  meta_description_es text,
  meta_description_en text,
  intro_es text,
  intro_en text,
  body_es text,
  body_en text,
  specialty_es text,
  specialty_en text,
  enrol_title_es text,
  enrol_title_en text,
  enrol_es text,
  enrol_en text,
  facts_es text[],
  facts_en text[],
  show_approach boolean,
  sort_order integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.slug, t.name, t.photo_path, t.photo_position, t.photo_alt_es, t.photo_alt_en,
    t.role_es, t.role_en, t.tagline_es, t.tagline_en, t.meta_description_es, t.meta_description_en,
    t.intro_es, t.intro_en, t.body_es, t.body_en, t.specialty_es, t.specialty_en,
    t.enrol_title_es, t.enrol_title_en, t.enrol_es, t.enrol_en, t.facts_es, t.facts_en,
    t.show_approach, t.sort_order
  from public.teacher_profiles t
  where t.status = 'published'
  order by t.sort_order, t.slug;
$$;

comment on function public.list_published_teachers() is
  'Perfiles de docentes publicados (sin columnas internas). Lectura de la web.';

-- ---------------------------------------------------------------------------
-- Orden manual (security invoker: la RLS de admin decide la escritura)
-- ---------------------------------------------------------------------------
create function public.move_teacher_profile(p_id uuid, p_direction text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_order integer;
  v_other_id uuid;
  v_other_order integer;
begin
  if not public.has_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_direction is null or p_direction not in ('up', 'down') then
    raise exception 'invalid_direction' using errcode = '22023';
  end if;

  select t.sort_order into v_order from public.teacher_profiles t where t.id = p_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if p_direction = 'up' then
    select t.id, t.sort_order into v_other_id, v_other_order
    from public.teacher_profiles t
    where (t.sort_order, t.id) < (v_order, p_id)
    order by t.sort_order desc, t.id desc
    limit 1
    for update;
  else
    select t.id, t.sort_order into v_other_id, v_other_order
    from public.teacher_profiles t
    where (t.sort_order, t.id) > (v_order, p_id)
    order by t.sort_order, t.id
    limit 1
    for update;
  end if;

  if v_other_id is null then
    return;
  end if;
  update public.teacher_profiles set sort_order = v_other_order where id = p_id;
  update public.teacher_profiles set sort_order = v_order where id = v_other_id;
end;
$$;

comment on function public.move_teacher_profile(uuid, text) is 'Sube o baja un perfil de docente en la lista (admin).';

revoke execute on function public.list_published_teachers() from public, anon, authenticated, service_role;
revoke execute on function public.move_teacher_profile(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.list_published_teachers() to anon, authenticated;
grant execute on function public.move_teacher_profile(uuid, text) to authenticated;

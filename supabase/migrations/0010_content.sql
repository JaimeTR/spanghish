-- 0010_content.sql
-- Contenido: recursos, lecciones de "Aprende ahora" y sus bloques, con niveles
-- de acceso public < account < enrolled.
--
-- Reglas:
--   * content_tier() calcula el nivel de quien llama: anónimo, sin perfil o
--     suspendido -> public; admin o docente -> enrolled; alumno activo (o tutor
--     de uno) -> enrolled (has_enrolled_access(), sustituto hasta las
--     matrículas); cualquier otra cuenta activa -> account.
--   * Lectura (authenticated): admin todo, incluidos borradores; el resto solo
--     lo publicado con access_level <= content_tier(). Escritura: solo admin.
--   * anon no tiene ningún privilegio de tabla: la web lee por las RPC
--     security definer de la segunda parte de esta migración.
--   * Los checks por tipo viven en la base; los guards (triggers) aplican las
--     reglas que dependen de otras filas (publicar sin origen o sin bloques,
--     lecciones interactivas inmutables).
--   * Auditoría con enable_audit() después de los datos reales iniciales.

-- ---------------------------------------------------------------------------
-- Tipos (el orden de declaración de access_level ES el orden de acceso)
-- ---------------------------------------------------------------------------
create type public.access_level as enum ('public', 'account', 'enrolled');
create type public.content_status as enum ('draft', 'published');
create type public.resource_kind as enum
  ('video', 'document', 'link', 'worksheet', 'vocabulary', 'recording', 'coursework');
create type public.learn_category as enum ('foundations', 'kids', 'adults', 'stories', 'games');
create type public.lesson_kind as enum ('interactive', 'article');
create type public.lesson_block_kind as enum ('text', 'image', 'video', 'quiz');

-- ---------------------------------------------------------------------------
-- Utilidad para checks: todos los elementos de un array con longitud en rango.
-- Pura (immutable, sin acceso a datos). Necesita EXECUTE para authenticated
-- porque Postgres comprueba el privilegio al evaluar el CHECK de un INSERT.
-- ---------------------------------------------------------------------------
create function public.text_items_within(p_items text[], p_min integer, p_max integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(x is not null and char_length(x) between p_min and p_max), true)
  from unnest(p_items) as u (x);
$$;

comment on function public.text_items_within(text[], integer, integer) is
  'true si todos los elementos del array tienen entre p_min y p_max caracteres (para CHECK).';

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  kind public.resource_kind not null,
  access_level public.access_level not null default 'public',
  status public.content_status not null default 'draft',
  title_es text not null check (char_length(title_es) between 1 and 120),
  title_en text not null check (char_length(title_en) between 1 and 120),
  title_lang text check (title_lang in ('es', 'en')),
  description_es text check (char_length(description_es) <= 500),
  description_en text check (char_length(description_en) <= 500),
  language_code text not null default 'es' references public.languages (code) on update cascade,
  level_id uuid references public.levels (id),
  audience public.audience_segment,
  sort_order integer not null,
  external_url text check (external_url ~ '^https://' and char_length(external_url) <= 500),
  youtube_id text check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  file_path text check (file_path ~ '^resources/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]{2,5}$'),
  file_mime text check (char_length(file_mime) <= 120),
  file_size_bytes integer check (file_size_bytes > 0),
  thumbnail_path text check (thumbnail_path ~ '^thumbnails/[0-9a-f-]{36}\.(png|jpg|webp)$'),
  teaser_public boolean not null default true,
  published_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_one_source check (num_nonnulls(external_url, youtube_id, file_path) <= 1),
  constraint resources_video_source check (kind <> 'video' or file_path is null),
  constraint resources_link_source check (kind <> 'link' or (youtube_id is null and file_path is null)),
  constraint resources_file_meta check (
    (file_path is null) = (file_mime is null) and (file_path is null) = (file_size_bytes is null)
  )
);

comment on table public.resources is
  'Recursos (videos, documentos, enlaces, fichas…) con nivel de acceso; sin datos personales.';

create index resources_status_access_sort_idx on public.resources (status, access_level, sort_order);
create index resources_level_id_idx on public.resources (level_id);
create index resources_created_by_idx on public.resources (created_by);
create index resources_file_path_idx on public.resources (file_path) where file_path is not null;

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  kind public.lesson_kind not null default 'article',
  component_key text unique check (component_key in ('alphabet', 'nouns')),
  category public.learn_category not null,
  level_id uuid references public.levels (id),
  language_code text not null default 'es' references public.languages (code) on update cascade,
  title_es text not null check (char_length(title_es) between 1 and 120),
  title_en text not null check (char_length(title_en) between 1 and 120),
  summary_es text check (char_length(summary_es) <= 300),
  summary_en text check (char_length(summary_en) <= 300),
  access_level public.access_level not null default 'public',
  status public.content_status not null default 'draft',
  teaser_public boolean not null default true,
  sort_order integer not null,
  published_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_slug_key unique (slug),
  constraint lessons_interactive_key check ((kind = 'interactive') = (component_key is not null)),
  constraint lessons_interactive_public check (kind <> 'interactive' or access_level = 'public'),
  constraint lessons_level_by_category check (category = 'foundations' or level_id is not null)
);

comment on table public.lessons is
  'Lecciones de "Aprende ahora": artículos con bloques o interactivas (componente de código).';

create index lessons_status_category_level_sort_idx on public.lessons (status, category, level_id, sort_order);
create index lessons_level_id_idx on public.lessons (level_id);
create index lessons_created_by_idx on public.lessons (created_by);

create table public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  position integer not null,
  kind public.lesson_block_kind not null,
  body_es text check (char_length(body_es) <= 5000),
  body_en text check (char_length(body_en) <= 5000),
  image_path text check (image_path ~ '^lessons/[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$'),
  image_width smallint check (image_width between 1 and 4000),
  image_height smallint check (image_height between 1 and 4000),
  alt_es text check (char_length(alt_es) <= 200),
  alt_en text check (char_length(alt_en) <= 200),
  youtube_id text check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  options_es text[],
  options_en text[],
  correct_option smallint,
  explanation_es text check (char_length(explanation_es) <= 500),
  explanation_en text check (char_length(explanation_en) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_blocks_position_unique unique (lesson_id, position) deferrable initially deferred,
  constraint lesson_blocks_text check (
    kind <> 'text' or (
      body_es is not null and body_en is not null
      and num_nonnulls(image_path, image_width, image_height, alt_es, alt_en, youtube_id,
                       options_es, options_en, correct_option, explanation_es, explanation_en) = 0
    )
  ),
  constraint lesson_blocks_image check (
    kind <> 'image' or (
      image_path is not null and alt_es is not null and alt_en is not null
      and image_width is not null and image_height is not null
    )
  ),
  constraint lesson_blocks_video check (kind <> 'video' or youtube_id is not null),
  constraint lesson_blocks_quiz check (
    kind <> 'quiz' or (
      body_es is not null and body_en is not null
      and options_es is not null and options_en is not null and correct_option is not null
      and cardinality(options_es) between 2 and 4
      and cardinality(options_en) = cardinality(options_es)
      and correct_option between 0 and cardinality(options_es) - 1
      and public.text_items_within(options_es, 1, 120)
      and public.text_items_within(options_en, 1, 120)
    )
  )
);

comment on table public.lesson_blocks is
  'Bloques ordenados de una lección artículo: texto, imagen, video o pregunta.';
-- lesson_blocks_position_unique sirve de índice para lesson_id.

-- ---------------------------------------------------------------------------
-- Niveles de acceso
-- ---------------------------------------------------------------------------
-- SUSTITUTO ETIQUETADO: hasta las matrículas (1B Task 13), "alumno" = ficha
-- students activa enlazada a la cuenta, o tutor de un alumno activo.
-- 1B Task 13 DEBE reemplazar esta función (create or replace) para exigir una
-- matrícula active|paused (y, más adelante, limitarla por nivel).
create function public.has_enrolled_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.students s
    where s.status = 'active'
      and (
        s.id in (select public.current_student_ids())
        or s.id in (select public.guarded_student_ids())
      )
  );
$$;

comment on function public.has_enrolled_access() is
  'SUSTITUTO hasta las matrículas (1B Task 13 la reemplaza): ficha de alumno activa propia o de un menor tutelado. Interna.';

create function public.content_tier()
returns public.access_level
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not public.is_active() then 'public'
    when public.has_role('admin') or public.has_role('teacher') then 'enrolled'
    when public.has_enrolled_access() then 'enrolled'
    else 'account'
  end::public.access_level;
$$;

comment on function public.content_tier() is
  'Nivel de acceso a contenido de quien llama: public (anónimo/suspendido), account o enrolled.';

-- ---------------------------------------------------------------------------
-- Orden automático: sort_order/position = max + 10 dentro del grupo.
-- security invoker: solo escribe la admin, que ve todas las filas.
-- ---------------------------------------------------------------------------
create function public.content_assign_order()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'resources' then
    if new.sort_order is null then
      select coalesce(max(r.sort_order), 0) + 10 into new.sort_order
      from public.resources r where r.access_level = new.access_level;
    end if;
  elsif tg_table_name = 'lessons' then
    if new.sort_order is null then
      select coalesce(max(l.sort_order), 0) + 10 into new.sort_order
      from public.lessons l
      where l.category = new.category and l.level_id is not distinct from new.level_id;
    end if;
  elsif tg_table_name = 'lesson_blocks' then
    if new.position is null then
      select coalesce(max(b.position), 0) + 10 into new.position
      from public.lesson_blocks b where b.lesson_id = new.lesson_id;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.content_assign_order() is
  'Trigger BEFORE INSERT: asigna sort_order/position = máximo del grupo + 10 si viene nulo.';

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------
create function public.resources_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' then
    if num_nonnulls(new.external_url, new.youtube_id, new.file_path) <> 1 then
      raise exception 'content_incomplete' using errcode = 'P0001';
    end if;
    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;

comment on function public.resources_guard() is
  'Trigger BEFORE INSERT/UPDATE: un recurso publicado tiene exactamente un origen; fija published_at.';

create function public.lessons_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.kind = 'interactive' then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.kind = 'interactive' and (
       new.kind is distinct from old.kind
       or new.component_key is distinct from old.component_key
       or new.slug is distinct from old.slug
     ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.kind is distinct from old.kind then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if new.status = 'published' then
    if new.kind = 'article'
       and not exists (select 1 from public.lesson_blocks b where b.lesson_id = new.id) then
      raise exception 'content_incomplete' using errcode = 'P0001';
    end if;
    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;

comment on function public.lessons_guard() is
  'Trigger BEFORE INSERT/UPDATE/DELETE: artículo publicado con bloques; interactivas inmutables y no borrables.';

create function public.lesson_blocks_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind public.lesson_kind;
  v_status public.content_status;
begin
  if tg_op = 'DELETE' then
    select l.kind, l.status into v_kind, v_status from public.lessons l where l.id = old.lesson_id;
    -- Borrado en cascada de la lección: ya no existe, no hay nada que proteger.
    if found and v_status = 'published'
       and not exists (
         select 1 from public.lesson_blocks b where b.lesson_id = old.lesson_id and b.id <> old.id
       ) then
      raise exception 'content_incomplete' using errcode = 'P0001';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and new.lesson_id is distinct from old.lesson_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select l.kind into v_kind from public.lessons l where l.id = new.lesson_id;
  if v_kind = 'interactive' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return new;
end;
$$;

comment on function public.lesson_blocks_guard() is
  'Trigger BEFORE INSERT/UPDATE/DELETE: sin bloques en interactivas; una lección publicada conserva al menos uno.';

create trigger resources_assign_order before insert on public.resources
  for each row execute function public.content_assign_order();
create trigger lessons_assign_order before insert on public.lessons
  for each row execute function public.content_assign_order();
create trigger lesson_blocks_assign_order before insert on public.lesson_blocks
  for each row execute function public.content_assign_order();

create trigger resources_guard before insert or update on public.resources
  for each row execute function public.resources_guard();
create trigger lessons_guard before insert or update or delete on public.lessons
  for each row execute function public.lessons_guard();
create trigger lesson_blocks_guard before insert or update or delete on public.lesson_blocks
  for each row execute function public.lesson_blocks_guard();

create trigger resources_touch_updated_at before update on public.resources
  for each row execute function public.touch_updated_at();
create trigger lessons_touch_updated_at before update on public.lessons
  for each row execute function public.touch_updated_at();
create trigger lesson_blocks_touch_updated_at before update on public.lesson_blocks
  for each row execute function public.touch_updated_at();

-- Las funciones nacen sin EXECUTE (0006); se fija explícitamente.
revoke execute on function public.text_items_within(text[], integer, integer)
  from public, anon, authenticated, service_role;
revoke execute on function public.has_enrolled_access() from public, anon, authenticated, service_role;
revoke execute on function public.content_tier() from public, anon, authenticated, service_role;
revoke execute on function public.content_assign_order() from public, anon, authenticated, service_role;
revoke execute on function public.resources_guard() from public, anon, authenticated, service_role;
revoke execute on function public.lessons_guard() from public, anon, authenticated, service_role;
revoke execute on function public.lesson_blocks_guard() from public, anon, authenticated, service_role;
grant execute on function public.text_items_within(text[], integer, integer) to authenticated, service_role;
grant execute on function public.content_tier() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS y privilegios
-- ---------------------------------------------------------------------------
alter table public.resources enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_blocks enable row level security;

grant select, insert, update, delete on table
  public.resources, public.lessons, public.lesson_blocks
  to authenticated;

create policy resources_select on public.resources for select to authenticated
  using (
    (select public.is_active())
    and ((select public.has_role('admin'))
         or (status = 'published' and access_level <= (select public.content_tier())))
  );
create policy resources_insert_admin on public.resources for insert to authenticated
  with check ((select public.has_role('admin')));
create policy resources_update_admin on public.resources for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy resources_delete_admin on public.resources for delete to authenticated
  using ((select public.has_role('admin')));

create policy lessons_select on public.lessons for select to authenticated
  using (
    (select public.is_active())
    and ((select public.has_role('admin'))
         or (status = 'published' and access_level <= (select public.content_tier())))
  );
create policy lessons_insert_admin on public.lessons for insert to authenticated
  with check ((select public.has_role('admin')));
create policy lessons_update_admin on public.lessons for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy lessons_delete_admin on public.lessons for delete to authenticated
  using ((select public.has_role('admin')));

create policy lesson_blocks_select on public.lesson_blocks for select to authenticated
  using (
    (select public.is_active())
    and (
      (select public.has_role('admin'))
      or exists (
        select 1 from public.lessons l
        where l.id = lesson_id
          and l.kind = 'article'
          and l.status = 'published'
          and l.access_level <= (select public.content_tier())
      )
    )
  );
create policy lesson_blocks_insert_admin on public.lesson_blocks for insert to authenticated
  with check ((select public.has_role('admin')));
create policy lesson_blocks_update_admin on public.lesson_blocks for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy lesson_blocks_delete_admin on public.lesson_blocks for delete to authenticated
  using ((select public.has_role('admin')));

-- ---------------------------------------------------------------------------
-- Datos reales iniciales (antes de la auditoría, como 0003)
-- ---------------------------------------------------------------------------
-- Las dos lecciones interactivas existentes de la web (componentes de código).
insert into public.lessons (slug, kind, component_key, category, title_es, title_en, access_level, status) values
  ('alphabet', 'interactive', 'alphabet', 'foundations', 'El alfabeto', 'The alphabet', 'public', 'published'),
  ('nouns-and-articles', 'interactive', 'nouns', 'foundations', 'Sustantivos y artículos', 'Nouns and articles',
   'public', 'published');

-- Los tres videos de Maribel de la web (títulos tal como están publicados, en inglés).
insert into public.resources (kind, access_level, status, title_es, title_en, title_lang, youtube_id) values
  ('video', 'public', 'published', 'Personal Pronouns in Spanish', 'Personal Pronouns in Spanish', 'en',
   'GilfeIjZm_g'),
  ('video', 'public', 'published', 'Learn the Regular Verbs in Spanish, Never Explained Better!',
   'Learn the Regular Verbs in Spanish, Never Explained Better!', 'en', 'VSpA7iGcArI'),
  ('video', 'public', 'published', 'Definite Articles in Spanish El, La, Los, Las and how to use them!',
   'Definite Articles in Spanish El, La, Los, Las and how to use them!', 'en', '4Wrww413fvA');

-- ---------------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------------
select public.enable_audit('public.resources');
select public.enable_audit('public.lessons');
select public.enable_audit('public.lesson_blocks');

-- ===========================================================================
-- Parte 2: lecturas públicas (RPC), orden y salud
-- ===========================================================================
-- La web no tiene privilegios de tabla: lee con la clave anon por estas RPC
-- security definer, que fijan columnas y filas. Solo devuelven lo publicado;
-- lo bloqueado para quien llama solo sale como "teaser" (si teaser_public) y
-- sin ningún origen (video, enlace ni archivo). Una cuenta suspendida cuenta
-- como anónima (content_tier() = 'public').

create function public.list_published_resources()
returns table (
  id uuid,
  kind public.resource_kind,
  access_level public.access_level,
  locked boolean,
  title_es text,
  title_en text,
  title_lang text,
  description_es text,
  description_en text,
  level_code text,
  audience public.audience_segment,
  sort_order integer,
  thumbnail_path text,
  youtube_id text,
  external_url text,
  has_file boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with t as (select public.content_tier() as tier)
  select
    r.id,
    r.kind,
    r.access_level,
    r.access_level > t.tier,
    r.title_es,
    r.title_en,
    r.title_lang,
    r.description_es,
    r.description_en,
    lv.code,
    r.audience,
    r.sort_order,
    r.thumbnail_path,
    case when r.access_level <= t.tier then r.youtube_id end,
    case when r.access_level <= t.tier then r.external_url end,
    r.access_level <= t.tier and r.file_path is not null
  from public.resources r
  cross join t
  left join public.levels lv on lv.id = r.level_id
  where r.status = 'published'
    and (r.access_level <= t.tier or r.teaser_public)
  order by r.access_level, r.sort_order, r.id;
$$;

comment on function public.list_published_resources() is
  'Recursos publicados para quien llama; lo bloqueado solo como teaser (sin origen). Lectura de la web.';

create function public.list_published_lessons()
returns table (
  id uuid,
  slug text,
  kind public.lesson_kind,
  component_key text,
  category public.learn_category,
  level_code text,
  access_level public.access_level,
  locked boolean,
  title_es text,
  title_en text,
  summary_es text,
  summary_en text,
  sort_order integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with t as (select public.content_tier() as tier)
  select
    l.id,
    l.slug,
    l.kind,
    l.component_key,
    l.category,
    lv.code,
    l.access_level,
    l.access_level > t.tier,
    l.title_es,
    l.title_en,
    l.summary_es,
    l.summary_en,
    l.sort_order
  from public.lessons l
  cross join t
  left join public.levels lv on lv.id = l.level_id
  where l.status = 'published'
    and (l.access_level <= t.tier or l.teaser_public)
  order by l.category, lv.code nulls first, l.sort_order, l.id;
$$;

comment on function public.list_published_lessons() is
  'Lecciones publicadas para quien llama; lo bloqueado solo como teaser. Lectura de la web.';

create function public.get_published_lesson(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'lesson', jsonb_build_object(
      'id', l.id,
      'slug', l.slug,
      'kind', l.kind,
      'component_key', l.component_key,
      'category', l.category,
      'level_code', lv.code,
      'access_level', l.access_level,
      'title_es', l.title_es,
      'title_en', l.title_en,
      'summary_es', l.summary_es,
      'summary_en', l.summary_en,
      'sort_order', l.sort_order
    ),
    'blocks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id,
        'position', b.position,
        'kind', b.kind,
        'body_es', b.body_es,
        'body_en', b.body_en,
        'image_path', b.image_path,
        'image_width', b.image_width,
        'image_height', b.image_height,
        'alt_es', b.alt_es,
        'alt_en', b.alt_en,
        'youtube_id', b.youtube_id,
        'options_es', b.options_es,
        'options_en', b.options_en,
        'correct_option', b.correct_option,
        'explanation_es', b.explanation_es,
        'explanation_en', b.explanation_en
      ) order by b.position)
      from public.lesson_blocks b
      where b.lesson_id = l.id
    ), '[]'::jsonb)
  )
  from public.lessons l
  left join public.levels lv on lv.id = l.level_id
  where l.slug = p_slug
    and l.status = 'published'
    and l.kind = 'article'
    and l.access_level <= public.content_tier();
$$;

comment on function public.get_published_lesson(text) is
  'Lección artículo publicada y accesible con sus bloques; null si no existe, es interactiva o está bloqueada.';

create function public.resource_file_path(p_resource_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.file_path
  from public.resources r
  where r.id = p_resource_id
    and r.status = 'published'
    and r.file_path is not null
    and r.access_level <= public.content_tier();
$$;

comment on function public.resource_file_path(uuid) is
  'Ruta del archivo de un recurso publicado y accesible para quien llama (para firmarla); si no, null.';

-- ---------------------------------------------------------------------------
-- Orden manual (security invoker: la RLS de admin decide la escritura).
-- Intercambian sort_order/position con el vecino del mismo grupo.
-- ---------------------------------------------------------------------------
create function public.move_resource(p_resource_id uuid, p_direction text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_level public.access_level;
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

  select r.access_level, r.sort_order into v_level, v_order
  from public.resources r where r.id = p_resource_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if p_direction = 'up' then
    select r.id, r.sort_order into v_other_id, v_other_order
    from public.resources r
    where r.access_level = v_level and (r.sort_order, r.id) < (v_order, p_resource_id)
    order by r.sort_order desc, r.id desc
    limit 1
    for update;
  else
    select r.id, r.sort_order into v_other_id, v_other_order
    from public.resources r
    where r.access_level = v_level and (r.sort_order, r.id) > (v_order, p_resource_id)
    order by r.sort_order, r.id
    limit 1
    for update;
  end if;

  if v_other_id is null then
    return;
  end if;
  update public.resources set sort_order = v_other_order where id = p_resource_id;
  update public.resources set sort_order = v_order where id = v_other_id;
end;
$$;

create function public.move_lesson(p_lesson_id uuid, p_direction text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_category public.learn_category;
  v_level_id uuid;
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

  select l.category, l.level_id, l.sort_order into v_category, v_level_id, v_order
  from public.lessons l where l.id = p_lesson_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if p_direction = 'up' then
    select l.id, l.sort_order into v_other_id, v_other_order
    from public.lessons l
    where l.category = v_category and l.level_id is not distinct from v_level_id
      and (l.sort_order, l.id) < (v_order, p_lesson_id)
    order by l.sort_order desc, l.id desc
    limit 1
    for update;
  else
    select l.id, l.sort_order into v_other_id, v_other_order
    from public.lessons l
    where l.category = v_category and l.level_id is not distinct from v_level_id
      and (l.sort_order, l.id) > (v_order, p_lesson_id)
    order by l.sort_order, l.id
    limit 1
    for update;
  end if;

  if v_other_id is null then
    return;
  end if;
  update public.lessons set sort_order = v_other_order where id = p_lesson_id;
  update public.lessons set sort_order = v_order where id = v_other_id;
end;
$$;

create function public.move_lesson_block(p_block_id uuid, p_direction text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_lesson_id uuid;
  v_position integer;
  v_other_id uuid;
  v_other_position integer;
begin
  if not public.has_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_direction is null or p_direction not in ('up', 'down') then
    raise exception 'invalid_direction' using errcode = '22023';
  end if;

  select b.lesson_id, b.position into v_lesson_id, v_position
  from public.lesson_blocks b where b.id = p_block_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if p_direction = 'up' then
    select b.id, b.position into v_other_id, v_other_position
    from public.lesson_blocks b
    where b.lesson_id = v_lesson_id and b.position < v_position
    order by b.position desc
    limit 1
    for update;
  else
    select b.id, b.position into v_other_id, v_other_position
    from public.lesson_blocks b
    where b.lesson_id = v_lesson_id and b.position > v_position
    order by b.position
    limit 1
    for update;
  end if;

  if v_other_id is null then
    return;
  end if;
  -- lesson_blocks_position_unique es diferible: el intercambio se comprueba al final.
  update public.lesson_blocks set position = v_other_position where id = p_block_id;
  update public.lesson_blocks set position = v_position where id = v_other_id;
end;
$$;

comment on function public.move_resource(uuid, text) is 'Sube o baja un recurso dentro de su nivel de acceso (admin).';
comment on function public.move_lesson(uuid, text) is 'Sube o baja una lección dentro de su categoría y nivel (admin).';
comment on function public.move_lesson_block(uuid, text) is 'Sube o baja un bloque dentro de su lección (admin).';

-- ---------------------------------------------------------------------------
-- Salud (la web y el entorno demo comprueban que la base responde)
-- ---------------------------------------------------------------------------
create function public.health_ping()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true;
$$;

comment on function public.health_ping() is 'Siempre true: comprueba que la API de la base responde.';

revoke execute on function public.list_published_resources() from public, anon, authenticated, service_role;
revoke execute on function public.list_published_lessons() from public, anon, authenticated, service_role;
revoke execute on function public.get_published_lesson(text) from public, anon, authenticated, service_role;
revoke execute on function public.resource_file_path(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.move_resource(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.move_lesson(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.move_lesson_block(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.health_ping() from public, anon, authenticated, service_role;

grant execute on function public.list_published_resources() to anon, authenticated;
grant execute on function public.list_published_lessons() to anon, authenticated;
grant execute on function public.get_published_lesson(text) to anon, authenticated;
grant execute on function public.resource_file_path(uuid) to anon, authenticated;
grant execute on function public.move_resource(uuid, text) to authenticated;
grant execute on function public.move_lesson(uuid, text) to authenticated;
grant execute on function public.move_lesson_block(uuid, text) to authenticated;
grant execute on function public.health_ping() to anon, authenticated;

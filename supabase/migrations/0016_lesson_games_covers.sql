-- 0016_lesson_games_covers.sql
-- Juegos dentro de las lecciones y portada de las lecciones.
--
--   * lesson_blocks.game_type: tipo de juego (parejas, completar, ordenar,
--     tarjetas, verdadero/falso). game_data: sus elementos, en el idioma que se
--     estudia (iguales en es/en); el enunciado va en body_es/body_en.
--     La forma de game_data la valida la app (zod, @spanglish/content); la base
--     exige objeto JSON de tamaño acotado y que solo los bloques 'game' lo lleven.
--   * lessons.cover_path: portada pequeña (bucket público content-media,
--     thumbnails/<uuid>.<ext>, la misma regla que las miniaturas de recursos).
--   * Las RPC públicas devuelven la portada y los campos del juego.

alter table public.lesson_blocks
  add column game_type text check (game_type in ('match', 'fill', 'order', 'flashcards', 'truefalse')),
  add column game_data jsonb check (jsonb_typeof(game_data) = 'object' and pg_column_size(game_data) <= 20000);

alter table public.lesson_blocks
  add constraint lesson_blocks_game check (
    (kind = 'game' and game_type is not null and game_data is not null
       and body_es is not null and body_en is not null)
    or (kind <> 'game' and game_type is null and game_data is null)
  );

alter table public.lessons
  add column cover_path text check (cover_path ~ '^thumbnails/[0-9a-f-]{36}\.(png|jpg|webp)$');

-- list_published_lessons: cambia el tipo de retorno, así que se recrea.
drop function public.list_published_lessons();

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
  sort_order integer,
  cover_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  with t as (select public.content_tier() as tier)
  select
    l.id, l.slug, l.kind, l.component_key, l.category, lv.code, l.access_level,
    l.access_level > t.tier, l.title_es, l.title_en, l.summary_es, l.summary_en,
    l.sort_order, l.cover_path
  from public.lessons l
  cross join t
  left join public.levels lv on lv.id = l.level_id
  where l.status = 'published'
    and (l.access_level <= t.tier or l.teaser_public)
  order by l.category, lv.code nulls first, l.sort_order, l.id;
$$;

comment on function public.list_published_lessons() is
  'Lecciones publicadas para quien llama (con portada); lo bloqueado solo como teaser. Lectura de la web.';

revoke execute on function public.list_published_lessons() from public, anon, authenticated, service_role;
grant execute on function public.list_published_lessons() to anon, authenticated;

create or replace function public.get_published_lesson(p_slug text)
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
      'sort_order', l.sort_order,
      'cover_path', l.cover_path
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
        'explanation_en', b.explanation_en,
        'game_type', b.game_type,
        'game_data', b.game_data
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

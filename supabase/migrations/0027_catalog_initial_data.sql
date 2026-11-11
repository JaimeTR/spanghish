-- 0027_catalog_initial_data.sql
-- Datos reales del catálogo, tomados de lo publicado en spanglish.com.au:
-- tres sedes, tres programas y sus ediciones con precios (AUD, en centavos).
-- Las dos ediciones de grupo para principiantes ya empezaron (21 y 27 de
-- octubre de 2026) y quedan cerradas; la conversación online (9 de diciembre)
-- queda abierta. Se pueden reabrir desde Administración > Catálogo.
-- Idempotente: no repite lo que ya existe (sedes por nombre, programas por código,
-- ediciones por programa y fecha de inicio).

insert into public.locations (name, kind, region, address)
select v.name, v.kind::public.location_kind, v.region, v.address
from (values
  ('Maroochydore Library', 'library', 'sunshine_coast', null),
  ('WOTSO Sippy Downs', 'office', 'sunshine_coast', null),
  ('Online', 'online', 'online', null)
) as v(name, kind, region, address)
where not exists (select 1 from public.locations x where x.name = v.name);

insert into public.programs (code, name_es, name_en, description_es, description_en, language_code, audience, format, level_id,
                             duration_weeks, lesson_minutes, active, is_public)
select v.code, v.name_es, v.name_en, v.desc_es, v.desc_en, 'es', 'adults'::public.audience_segment,
       'local_group'::public.lesson_format,
       (select l.id from public.levels l where l.code = v.level and l.language_code = 'es'),
       v.weeks, v.minutes, true, true
from (values
  ('beginner-group-9w', 'Grupo para principiantes (9 semanas)', 'Beginner group (9 weeks)',
   'Conoce gente de tu zona, aprende español y diviértete… ¡en español!',
   'Meet new local people, learn a new language, and have fun… in Spanish!', 'A1', 9::smallint, 70::smallint),
  ('beginner-group-6w', 'Grupo para principiantes (6 semanas)', 'Beginner group (6 weeks)',
   'Conoce gente de tu zona, aprende español y diviértete… ¡en español!',
   'Meet new local people, learn a new language, and have fun… in Spanish!', 'A1', 6::smallint, 70::smallint),
  ('online-conversation-10w', 'Conversación online (10 semanas)', 'Online Conversation (10 weeks)',
   'Toma un café, conoce gente y practica tu español con conversaciones guiadas y divertidas.',
   'Grab a cup of coffee, meet new people, and practice your Spanish with fun guided conversations!', 'B1', 10::smallint, 50::smallint)
) as v(code, name_es, name_en, desc_es, desc_en, level, weeks, minutes)
where not exists (select 1 from public.programs x where x.code = v.code);

insert into public.program_editions (program_id, starts_on, ends_on, status, location_id, schedule_es, schedule_en)
select (select id from public.programs where code = v.code),
       v.starts_on::date, v.ends_on::date, v.status::public.edition_status,
       (select id from public.locations where name = v.location),
       v.schedule_es, v.schedule_en
from (values
  ('beginner-group-9w', '2026-10-21', '2026-12-16', 'closed', 'Maroochydore Library',
   'Miércoles, 13:30–14:40', 'Wednesdays, 1:30–2:40pm'),
  ('beginner-group-6w', '2026-10-27', '2026-12-08', 'closed', 'WOTSO Sippy Downs',
   'Martes, 19:00–20:10 (sin clase el 3 de noviembre)', 'Tuesdays, 7:00–8:10pm (no lesson on 3 November)'),
  ('online-conversation-10w', '2026-12-09', '2027-02-17', 'open', 'Online',
   'Miércoles, 19:00–19:50 (sin clase el 23 de diciembre)', 'Wednesdays, 7:00–7:50pm (no lesson on 23 December)')
) as v(code, starts_on, ends_on, status, location, schedule_es, schedule_en)
where exists (select 1 from public.programs where code = v.code)
  and not exists (
    select 1 from public.program_editions e
    where e.program_id = (select id from public.programs where code = v.code) and e.starts_on = v.starts_on::date
  );

insert into public.program_prices (program_id, edition_id, kind, amount_cents, lessons_included)
select e.program_id, e.id, v.kind::public.price_kind, v.amount_cents, v.lessons
from (values
  ('beginner-group-9w', '2026-10-21', 'upfront', 31000, 9::smallint),
  ('beginner-group-9w', '2026-10-21', 'per_lesson', 3500, null::smallint),
  ('beginner-group-6w', '2026-10-27', 'upfront', 20500, 6::smallint),
  ('beginner-group-6w', '2026-10-27', 'per_lesson', 3500, null::smallint),
  ('online-conversation-10w', '2026-12-09', 'upfront', 24500, 10::smallint),
  ('online-conversation-10w', '2026-12-09', 'per_lesson', 2500, null::smallint)
) as v(code, starts_on, kind, amount_cents, lessons)
join public.programs p on p.code = v.code
join public.program_editions e on e.program_id = p.id and e.starts_on = v.starts_on::date
where not exists (
  select 1 from public.program_prices x
  where x.program_id = e.program_id and x.edition_id = e.id and x.kind = v.kind::public.price_kind
);

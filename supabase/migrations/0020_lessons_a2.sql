-- 0020_lessons_a2.sql
-- Tres lecciones de español para el nivel A2 (borrador) con texto, dos juegos y una pregunta.
-- Se publican desde Administración > Lecciones. Idempotente: si el identificador ya existe, no se repite.

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$a2-preterito-regular$q$, 'article', 'adults',
         (select id from public.levels where code = 'A2' and language_code = 'es'),
         $q$Pretérito indefinido: verbos regulares$q$, $q$Preterite tense: regular verbs$q$, $q$Cuenta acciones terminadas en el pasado.$q$, $q$Talk about completed actions in the past.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$a2-preterito-regular$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$Se usa para acciones **terminadas** en el pasado.

- **-ar**: -é, -aste, -ó, -amos, -aron (hablé, hablaste, habló…)
- **-er / -ir**: -í, -iste, -ió, -imos, -ieron (comí, comiste, comió…)

Marcadores: ayer, anoche, la semana pasada, el año pasado.$q$, $q$It is used for **completed** actions in the past.

- **-ar**: -é, -aste, -ó, -amos, -aron (hablé, hablaste, habló…)
- **-er / -ir**: -í, -iste, -ió, -imos, -ieron (comí, comiste, comió…)

Time markers: ayer, anoche, la semana pasada, el año pasado.$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Pon el verbo en pretérito$q$, $q$Put the verb in the preterite$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Ayer yo ___ con Ana. (hablar)", "answer": "hablé", "options": ["hablé", "hablo", "hablaba"]}, {"text": "Ella ___ paella. (comer)", "answer": "comió", "options": ["comió", "comía", "come"]}, {"text": "Nosotros ___ en Quito. (vivir)", "answer": "vivimos", "options": ["vivimos", "vivíamos", "vivían"]}, {"text": "Ellos ___ mucho. (trabajar)", "answer": "trabajaron", "options": ["trabajaron", "trabajaban", "trabajan"]}]}$q$::jsonb),
  (30, 'game', $q$Marcadores de tiempo$q$, $q$Time markers$q$, null, null, null, null, null, $q$match$q$, $q${"items": [{"a": "ayer", "b": "yesterday"}, {"a": "anoche", "b": "last night"}, {"a": "el año pasado", "b": "last year"}, {"a": "la semana pasada", "b": "last week"}]}$q$::jsonb),
  (40, 'game', $q$¿Verdadero o falso?$q$, $q$True or false?$q$, null, null, null, null, null, $q$truefalse$q$, $q${"items": [{"text": "«Hablé» es pretérito de «hablar».", "answer": true}, {"text": "En pretérito, «ella» de «comer» es «comía».", "answer": false, "explanation": "«Comió» es pretérito; «comía» es imperfecto."}]}$q$::jsonb),
  (50, 'quiz', $q$Ayer nosotros ___ al parque.$q$, $q$Ayer nosotros ___ al parque.$q$, array[$q$caminamos$q$, $q$caminábamos$q$, $q$caminaremos$q$], array[$q$caminamos$q$, $q$caminábamos$q$, $q$caminaremos$q$], 0, $q$Acción terminada ayer: pretérito.$q$, $q$Completed action yesterday: preterite.$q$, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$a2-ir-a-planes$q$, 'article', 'adults',
         (select id from public.levels where code = 'A2' and language_code = 'es'),
         $q$Ir a + infinitivo: planes$q$, $q$Ir a + infinitive: plans$q$, $q$Habla de tus planes y del futuro cercano.$q$, $q$Talk about your plans and the near future.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$a2-ir-a-planes$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$Para hablar del futuro cercano: **ir + a + infinitivo**.

- Voy a estudiar.
- Vas a viajar.
- Va a llover.
- Vamos a cocinar.
- Van a llegar tarde.

Marcadores: mañana, esta noche, el próximo año, el fin de semana, pronto.$q$, $q$To talk about the near future use **ir + a + infinitive**.

- Voy a estudiar. (I am going to study.)
- Vas a viajar.
- Va a llover.
- Vamos a cocinar.
- Van a llegar tarde.

Time markers: mañana, esta noche, el próximo año, el fin de semana, pronto.$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Ordena las frases$q$, $q$Put the sentences in order$q$, null, null, null, null, null, $q$order$q$, $q${"items": [{"sentence": "Voy a viajar a Perú", "translation": "I am going to travel to Peru"}, {"sentence": "Mañana vamos a comer en casa", "translation": "Tomorrow we are going to eat at home"}, {"sentence": "Ellos van a estudiar esta noche", "translation": "They are going to study tonight"}]}$q$::jsonb),
  (30, 'game', $q$Elige la forma de ir$q$, $q$Choose the form of ir$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Mañana yo ___ a estudiar.", "answer": "voy", "options": ["voy", "vas", "va"]}, {"text": "Ella ___ a viajar en verano.", "answer": "va", "options": ["va", "voy", "vamos"]}, {"text": "Nosotros ___ a cocinar.", "answer": "vamos", "options": ["vamos", "van", "vas"]}]}$q$::jsonb),
  (40, 'game', $q$Tarjetas: el futuro$q$, $q$Flashcards: the future$q$, null, null, null, null, null, $q$flashcards$q$, $q${"items": [{"a": "mañana", "b": "tomorrow"}, {"a": "esta noche", "b": "tonight"}, {"a": "el próximo año", "b": "next year"}, {"a": "el fin de semana", "b": "the weekend"}, {"a": "pronto", "b": "soon"}]}$q$::jsonb),
  (50, 'quiz', $q$¿Qué expresa «voy a comer»?$q$, $q$What does «voy a comer» express?$q$, array[$q$un plan futuro$q$, $q$una acción terminada$q$, $q$un hábito del pasado$q$], array[$q$un plan futuro$q$, $q$una acción terminada$q$, $q$un hábito del pasado$q$], 0, null, null, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$a2-pronombres-objeto-directo$q$, 'article', 'adults',
         (select id from public.levels where code = 'A2' and language_code = 'es'),
         $q$Pronombres de objeto directo$q$, $q$Direct object pronouns$q$, $q$Evita repetir: «Compro el libro» → «Lo compro».$q$, $q$Avoid repetition: «Compro el libro» → «Lo compro».$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$a2-pronombres-objeto-directo$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$Sustituyen al objeto directo y **concuerdan** con él:

- **lo**: el libro → Lo leo.
- **la**: la carta → La leo.
- **los**: los libros → Los leo.
- **las**: las cartas → Las leo.

Van **antes del verbo conjugado**: *Lo compro*, *No la veo*.$q$, $q$They replace the direct object and **agree** with it:

- **lo**: el libro → Lo leo.
- **la**: la carta → La leo.
- **los**: los libros → Los leo.
- **las**: las cartas → Las leo.

They go **before the conjugated verb**: *Lo compro*, *No la veo*.$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Completa con el pronombre$q$, $q$Complete with the pronoun$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Veo la película. → ___ veo.", "answer": "La", "options": ["La", "Lo", "Las"]}, {"text": "Tengo los libros. → ___ tengo.", "answer": "Los", "options": ["Los", "Las", "Lo"]}, {"text": "Como el pan. → ___ como.", "answer": "Lo", "options": ["Lo", "La", "Los"]}, {"text": "Visito a mis tías. → ___ visito.", "answer": "Las", "options": ["Las", "Los", "La"]}]}$q$::jsonb),
  (30, 'game', $q$¿Qué pronombre sustituye a…?$q$, $q$Which pronoun replaces…?$q$, null, null, null, null, null, $q$match$q$, $q${"items": [{"a": "el libro", "b": "lo"}, {"a": "la casa", "b": "la"}, {"a": "los zapatos", "b": "los"}, {"a": "las flores", "b": "las"}]}$q$::jsonb),
  (40, 'game', $q$¿Verdadero o falso?$q$, $q$True or false?$q$, null, null, null, null, null, $q$truefalse$q$, $q${"items": [{"text": "El pronombre «lo» va normalmente antes del verbo conjugado.", "answer": true}, {"text": "«La» sustituye a un sustantivo masculino.", "answer": false, "explanation": "«La» sustituye a un sustantivo femenino singular."}]}$q$::jsonb),
  (50, 'quiz', $q$Leo la carta. → ___ leo.$q$, $q$Leo la carta. → ___ leo.$q$, array[$q$La$q$, $q$Lo$q$, $q$Las$q$], array[$q$La$q$, $q$Lo$q$, $q$Las$q$], 0, null, null, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

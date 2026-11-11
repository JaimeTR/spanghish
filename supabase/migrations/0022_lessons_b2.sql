-- 0022_lessons_b2.sql
-- Tres lecciones de español para el nivel B2 (borrador) con texto, dos juegos y una pregunta.
-- Se publican desde Administración > Lecciones. Idempotente: si el identificador ya existe, no se repite.

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$b2-indefinido-imperfecto$q$, 'article', 'adults',
         (select id from public.levels where code = 'B2' and language_code = 'es'),
         $q$Contraste: indefinido e imperfecto$q$, $q$Contrast: preterite and imperfect$q$, $q$Cuenta historias combinando escenario y acción.$q$, $q$Tell stories combining setting and action.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$b2-indefinido-imperfecto$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$En una historia:

- **Imperfecto** → el escenario, lo que estaba pasando (*Llovía, yo leía*).
- **Indefinido** → las acciones que avanzan la historia o interrumpen (*Sonó el teléfono, salí*).

Ejemplo: *Mientras yo leía, sonó el teléfono.*$q$, $q$In a story:

- **Imperfect** → the setting, what was going on (*Llovía, yo leía*).
- **Preterite** → the actions that move the story forward or interrupt (*Sonó el teléfono, salí*).

Example: *Mientras yo leía, sonó el teléfono.* (While I was reading, the phone rang.)$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Elige la forma correcta$q$, $q$Choose the right form$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Mientras yo ___, sonó el teléfono. (leer)", "answer": "leía", "options": ["leía", "leí", "leeré"]}, {"text": "Cuando ___ a casa, llovía mucho. (llegar, yo)", "answer": "llegué", "options": ["llegué", "llegaba", "llegaría"]}, {"text": "Ayer ___ a Marta; llevaba un vestido rojo. (ver, yo)", "answer": "vi", "options": ["vi", "veía", "veré"]}, {"text": "___ las diez cuando salimos. (ser)", "answer": "Eran", "options": ["Eran", "Fueron", "Serán"]}]}$q$::jsonb),
  (30, 'game', $q$Ordena las frases$q$, $q$Put the sentences in order$q$, null, null, null, null, null, $q$order$q$, $q${"items": [{"sentence": "Mientras cocinaba, escuchaba música", "translation": "While cooking, I listened to music"}, {"sentence": "Cuando salí de casa, llovía", "translation": "When I left home, it was raining"}]}$q$::jsonb),
  (40, 'game', $q$¿Verdadero o falso?$q$, $q$True or false?$q$, null, null, null, null, null, $q$truefalse$q$, $q${"items": [{"text": "El imperfecto describe el escenario de una historia.", "answer": true}, {"text": "El indefinido sirve para acciones que interrumpen.", "answer": true}, {"text": "Se dice «mientras comí» para una acción en desarrollo.", "answer": false, "explanation": "Lo natural es «mientras comía»."}]}$q$::jsonb),
  (50, 'quiz', $q$Yo ___ la tele cuando ella ___.$q$, $q$Yo ___ la tele cuando ella ___.$q$, array[$q$veía / llegó$q$, $q$vi / llegaba$q$, $q$veía / llegaba$q$], array[$q$veía / llegó$q$, $q$vi / llegaba$q$, $q$veía / llegaba$q$], 0, $q$La acción en curso va en imperfecto y la que interrumpe en indefinido.$q$, $q$The ongoing action takes the imperfect and the interrupting one the preterite.$q$, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$b2-condicional-hipotesis$q$, 'article', 'adults',
         (select id from public.levels where code = 'B2' and language_code = 'es'),
         $q$Condicional e hipótesis$q$, $q$Conditional and hypotheses$q$, $q$Habla de situaciones irreales con «si» + imperfecto de subjuntivo.$q$, $q$Talk about unreal situations with «si» + imperfect subjunctive.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$b2-condicional-hipotesis$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$**Condicional** = infinitivo + -ía, -ías, -ía, -íamos, -ían (viajaría).

Irregulares: tendría, haría, diría, podría, saldría, pondría, vendría, sabría, querría.

**Hipótesis**: *Si tuviera dinero, viajaría.* (si + imperfecto de subjuntivo → condicional)$q$, $q$**Conditional** = infinitive + -ía, -ías, -ía, -íamos, -ían (viajaría).

Irregular: tendría, haría, diría, podría, saldría, pondría, vendría, sabría, querría.

**Hypotheses**: *Si tuviera dinero, viajaría.* (si + imperfect subjunctive → conditional)$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Condicionales irregulares$q$, $q$Irregular conditionals$q$, null, null, null, null, null, $q$match$q$, $q${"items": [{"a": "tener", "b": "tendría"}, {"a": "hacer", "b": "haría"}, {"a": "decir", "b": "diría"}, {"a": "poder", "b": "podría"}, {"a": "salir", "b": "saldría"}, {"a": "venir", "b": "vendría"}]}$q$::jsonb),
  (30, 'game', $q$Completa la hipótesis$q$, $q$Complete the hypothesis$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Si tuviera tiempo, ___. (viajar)", "answer": "viajaría", "options": ["viajaría", "viajo", "viajé"]}, {"text": "Si yo fuera tú, ___ la verdad. (decir)", "answer": "diría", "options": ["diría", "dije", "digo"]}, {"text": "Si ganáramos, ___ una fiesta. (hacer)", "answer": "haríamos", "options": ["haríamos", "hacemos", "hicimos"]}, {"text": "Si pudiera, ___ contigo. (venir)", "answer": "vendría", "options": ["vendría", "vengo", "vine"]}]}$q$::jsonb),
  (40, 'game', $q$Frases útiles$q$, $q$Useful phrases$q$, null, null, null, null, null, $q$flashcards$q$, $q${"items": [{"a": "ojalá", "b": "I wish / hopefully"}, {"a": "si yo fuera tú", "b": "if I were you"}, {"a": "en tu lugar", "b": "in your place"}, {"a": "sería mejor", "b": "it would be better"}]}$q$::jsonb),
  (50, 'quiz', $q$Si ___ rico, compraría una casa.$q$, $q$Si ___ rico, compraría una casa.$q$, array[$q$fuera$q$, $q$soy$q$, $q$seré$q$], array[$q$fuera$q$, $q$soy$q$, $q$seré$q$], 0, $q$Tras «si» irreal va imperfecto de subjuntivo.$q$, $q$After an unreal «si» comes the imperfect subjunctive.$q$, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$b2-estilo-indirecto$q$, 'article', 'adults',
         (select id from public.levels where code = 'B2' and language_code = 'es'),
         $q$El estilo indirecto$q$, $q$Reported speech$q$, $q$Cuenta lo que otros dijeron cambiando los tiempos.$q$, $q$Report what others said, shifting the tenses.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$b2-estilo-indirecto$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$Tras un verbo en pasado (*dijo, preguntó, pidió*) los tiempos retroceden:

- presente → **imperfecto**: «Estoy cansado» → Dijo que **estaba** cansado.
- futuro → **condicional**: «Iré» → Dijo que **iría**.
- pretérito → **pluscuamperfecto**: «Compré pan» → Dijo que **había comprado** pan.

También cambian: hoy → ese día, mañana → al día siguiente, aquí → allí.$q$, $q$After a past reporting verb (*dijo, preguntó, pidió*) tenses shift back:

- present → **imperfect**: «Estoy cansado» → Dijo que **estaba** cansado.
- future → **conditional**: «Iré» → Dijo que **iría**.
- preterite → **pluperfect**: «Compré pan» → Dijo que **había comprado** pan.

Also: hoy → ese día, mañana → al día siguiente, aquí → allí.$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Pasa a estilo indirecto$q$, $q$Turn into reported speech$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "«Estoy cansado.» → Dijo que ___ cansado.", "answer": "estaba", "options": ["estaba", "está", "estará"]}, {"text": "«Iré mañana.» → Dijo que ___ al día siguiente.", "answer": "iría", "options": ["iría", "iré", "va"]}, {"text": "«Compré pan.» → Dijo que ___ pan.", "answer": "había comprado", "options": ["había comprado", "compró", "compra"]}, {"text": "«¿Dónde vives?» → Me preguntó dónde ___.", "answer": "vivía", "options": ["vivía", "vivo", "vivirá"]}]}$q$::jsonb),
  (30, 'game', $q$¿Verdadero o falso?$q$, $q$True or false?$q$, null, null, null, null, null, $q$truefalse$q$, $q${"items": [{"text": "En estilo indirecto, «hoy» suele cambiar a «ese día».", "answer": true}, {"text": "El presente suele pasar a imperfecto tras un verbo en pasado.", "answer": true}, {"text": "El futuro pasa a presente.", "answer": false, "explanation": "El futuro pasa a condicional."}]}$q$::jsonb),
  (40, 'game', $q$Ordena la frase$q$, $q$Put the sentence in order$q$, null, null, null, null, null, $q$order$q$, $q${"items": [{"sentence": "Me dijo que vendría mañana", "translation": "He told me he would come tomorrow"}, {"sentence": "Preguntó si tenía hambre", "translation": "She asked if I was hungry"}]}$q$::jsonb),
  (50, 'quiz', $q$«Tengo hambre.» → Dijo que ___ hambre.$q$, $q$«Tengo hambre.» → Dijo que ___ hambre.$q$, array[$q$tenía$q$, $q$tiene$q$, $q$tendrá$q$], array[$q$tenía$q$, $q$tiene$q$, $q$tendrá$q$], 0, null, null, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

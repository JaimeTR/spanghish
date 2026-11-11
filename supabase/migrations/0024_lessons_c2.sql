-- 0024_lessons_c2.sql
-- Tres lecciones de español para el nivel C2 (borrador) con texto, dos juegos y una pregunta.
-- Se publican desde Administración > Lecciones. Idempotente: si el identificador ya existe, no se repite.

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$c2-subjuntivo-imperfecto$q$, 'article', 'adults',
         (select id from public.levels where code = 'C2' and language_code = 'es'),
         $q$Matices del imperfecto de subjuntivo$q$, $q$Nuances of the imperfect subjunctive$q$, $q$Expresa irrealidad, cortesía y condiciones pasadas.$q$, $q$Express unreality, politeness and past conditions.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$c2-subjuntivo-imperfecto$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$- **Como si + imperfecto de subjuntivo**: *Habla como si lo supiera todo.*
- **Ojalá + imperfecto**: deseo poco probable (*Ojalá tuviera más tiempo*).
- **Cortesía**: *Quisiera una mesa para dos.*
- **Condición pasada irreal**: *Si lo hubiera sabido, te habría avisado.* (pluscuamperfecto de subjuntivo + condicional compuesto)

Las formas en **-ra** y en **-se** (hablara / hablase) son equivalentes.$q$, $q$- **Como si + imperfect subjunctive**: *Habla como si lo supiera todo.* (He talks as if he knew it all.)
- **Ojalá + imperfect**: unlikely wish (*Ojalá tuviera más tiempo*).
- **Politeness**: *Quisiera una mesa para dos.*
- **Unreal past condition**: *Si lo hubiera sabido, te habría avisado.* (pluperfect subjunctive + conditional perfect)

The **-ra** and **-se** forms (hablara / hablase) are equivalent.$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Completa con la forma adecuada$q$, $q$Complete with the right form$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Habla como si ___ todo. (saber)", "answer": "supiera", "options": ["supiera", "sabe", "sabrá"]}, {"text": "Si lo hubiera sabido, te ___. (avisar)", "answer": "habría avisado", "options": ["habría avisado", "avisé", "aviso"]}, {"text": "Ojalá ___ más tiempo. (tener)", "answer": "tuviera", "options": ["tuviera", "tengo", "tendré"]}, {"text": "Me gustaría que ___ conmigo. (venir, tú)", "answer": "vinieras", "options": ["vinieras", "vienes", "vendrás"]}]}$q$::jsonb),
  (30, 'game', $q$¿Verdadero o falso?$q$, $q$True or false?$q$, null, null, null, null, null, $q$truefalse$q$, $q${"items": [{"text": "«Como si» exige imperfecto o pluscuamperfecto de subjuntivo.", "answer": true}, {"text": "«Quisiera» es una forma de cortesía.", "answer": true}, {"text": "«Si hubiera sabido» expresa una condición posible en el futuro.", "answer": false, "explanation": "Expresa una condición pasada irreal."}]}$q$::jsonb),
  (40, 'game', $q$Ordena la frase$q$, $q$Put the sentence in order$q$, null, null, null, null, null, $q$order$q$, $q${"items": [{"sentence": "Si hubiera sabido, habría venido", "translation": "If I had known, I would have come"}, {"sentence": "Habla como si fuera el dueño", "translation": "He speaks as if he were the owner"}]}$q$::jsonb),
  (50, 'quiz', $q$Se comporta como si ___ el dueño.$q$, $q$Se comporta como si ___ el dueño.$q$, array[$q$fuera$q$, $q$es$q$, $q$será$q$], array[$q$fuera$q$, $q$es$q$, $q$será$q$], 0, null, null, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$c2-modismos$q$, 'article', 'adults',
         (select id from public.levels where code = 'C2' and language_code = 'es'),
         $q$Modismos y expresiones idiomáticas$q$, $q$Idioms and set expressions$q$, $q$Suena más natural con expresiones que no se traducen palabra por palabra.$q$, $q$Sound more natural with expressions that cannot be translated word for word.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$c2-modismos$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$Los modismos no se entienden literalmente:

- **dar en el clavo**: acertar
- **estar en las nubes**: estar distraído
- **meter la pata**: cometer un error
- **costar un ojo de la cara**: ser carísimo
- **ponerse las pilas**: esforzarse, activarse
- **no tener pelos en la lengua**: hablar con franqueza$q$, $q$Idioms cannot be understood literally:

- **dar en el clavo**: to hit the nail on the head
- **estar en las nubes**: to be daydreaming
- **meter la pata**: to put your foot in it
- **costar un ojo de la cara**: to cost an arm and a leg
- **ponerse las pilas**: to get one's act together
- **no tener pelos en la lengua**: to speak bluntly$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Une el modismo con su significado$q$, $q$Match the idiom with its meaning$q$, null, null, null, null, null, $q$match$q$, $q${"items": [{"a": "dar en el clavo", "b": "to hit the nail on the head"}, {"a": "estar en las nubes", "b": "to be daydreaming"}, {"a": "meter la pata", "b": "to put your foot in it"}, {"a": "costar un ojo de la cara", "b": "to cost an arm and a leg"}, {"a": "ponerse las pilas", "b": "to get one's act together"}, {"a": "no tener pelos en la lengua", "b": "to speak bluntly"}]}$q$::jsonb),
  (30, 'game', $q$Completa el modismo$q$, $q$Complete the idiom$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Eso es caro: cuesta un ___ de la cara.", "answer": "ojo", "options": ["ojo", "dedo", "pie"]}, {"text": "Metí la ___ y ofendí a todos.", "answer": "pata", "options": ["pata", "mano", "boca"]}, {"text": "Dio en el ___: tenía razón.", "answer": "clavo", "options": ["clavo", "martillo", "punto"]}, {"text": "Ponte las ___ o no aprobarás.", "answer": "pilas", "options": ["pilas", "botas", "gafas"]}]}$q$::jsonb),
  (40, 'game', $q$¿Verdadero o falso?$q$, $q$True or false?$q$, null, null, null, null, null, $q$truefalse$q$, $q${"items": [{"text": "«Estar en las nubes» significa estar distraído.", "answer": true}, {"text": "«Meter la pata» significa acertar.", "answer": false, "explanation": "Significa equivocarse."}]}$q$::jsonb),
  (50, 'quiz', $q$«No tener pelos en la lengua» significa:$q$, $q$«No tener pelos en la lengua» means:$q$, array[$q$hablar con total franqueza$q$, $q$hablar muy poco$q$, $q$tener mala voz$q$], array[$q$hablar con total franqueza$q$, $q$hablar muy poco$q$, $q$tener mala voz$q$], 0, null, null, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$c2-conectores-discurso$q$, 'article', 'adults',
         (select id from public.levels where code = 'C2' and language_code = 'es'),
         $q$Conectores del discurso avanzados$q$, $q$Advanced discourse connectors$q$, $q$Estructura textos formales con conectores precisos.$q$, $q$Structure formal texts with precise connectors.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$c2-conectores-discurso$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$Los conectores organizan el discurso:

- **Contraste**: no obstante, sin embargo, en cambio
- **Consecuencia**: por ende, en consecuencia, por lo tanto, de modo que
- **Causa**: puesto que, dado que, ya que
- **Concesión**: a pesar de que, aunque
- **Reformulación**: es decir, o sea, así pues$q$, $q$Connectors organise discourse:

- **Contrast**: no obstante, sin embargo, en cambio
- **Consequence**: por ende, en consecuencia, por lo tanto, de modo que
- **Cause**: puesto que, dado que, ya que
- **Concession**: a pesar de que, aunque
- **Reformulation**: es decir, o sea, así pues$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Une cada conector con su significado$q$, $q$Match each connector with its meaning$q$, null, null, null, null, null, $q$match$q$, $q${"items": [{"a": "no obstante", "b": "nevertheless"}, {"a": "por ende", "b": "therefore"}, {"a": "puesto que", "b": "since"}, {"a": "a pesar de que", "b": "although"}, {"a": "en cambio", "b": "on the other hand"}, {"a": "es decir", "b": "that is"}]}$q$::jsonb),
  (30, 'game', $q$Elige el conector adecuado$q$, $q$Choose the right connector$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Llovía; ___, salimos.", "answer": "no obstante", "options": ["no obstante", "por ende", "puesto que"]}, {"text": "Estudió mucho; ___, aprobó.", "answer": "por ende", "options": ["por ende", "no obstante", "en cambio"]}, {"text": "___ no tengo tiempo, no iré.", "answer": "Puesto que", "options": ["Puesto que", "Sin embargo", "Es decir"]}, {"text": "Juan es puntual; ___, Pedro siempre llega tarde.", "answer": "en cambio", "options": ["en cambio", "por ende", "puesto que"]}]}$q$::jsonb),
  (40, 'game', $q$¿Verdadero o falso?$q$, $q$True or false?$q$, null, null, null, null, null, $q$truefalse$q$, $q${"items": [{"text": "«Por ende» introduce una consecuencia.", "answer": true}, {"text": "«No obstante» introduce una consecuencia.", "answer": false, "explanation": "Introduce un contraste."}]}$q$::jsonb),
  (50, 'quiz', $q$Conector de causa:$q$, $q$Cause connector:$q$, array[$q$puesto que$q$, $q$sin embargo$q$, $q$en cambio$q$], array[$q$puesto que$q$, $q$sin embargo$q$, $q$en cambio$q$], 0, null, null, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

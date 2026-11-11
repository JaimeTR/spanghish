-- 0023_lessons_c1.sql
-- Tres lecciones de español para el nivel C1 (borrador) con texto, dos juegos y una pregunta.
-- Se publican desde Administración > Lecciones. Idempotente: si el identificador ya existe, no se repite.

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$c1-subjuntivo-adverbial$q$, 'article', 'adults',
         (select id from public.levels where code = 'C1' and language_code = 'es'),
         $q$Subjuntivo en oraciones adverbiales$q$, $q$Subjunctive in adverbial clauses$q$, $q$Domina cuándo usar subjuntivo con conjunciones de tiempo, finalidad y condición.$q$, $q$Master when to use the subjunctive after time, purpose and condition conjunctions.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$c1-subjuntivo-adverbial$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$**Siempre subjuntivo**: antes de que, para que, a menos que, sin que, con tal de que, a fin de que.

**Subjuntivo si el momento es futuro o desconocido**: cuando, en cuanto, hasta que, después de que, tan pronto como.

- *Te llamaré en cuanto llegue.* (futuro)
- *Siempre te llamo cuando llego.* (hábito → indicativo)$q$, $q$**Always subjunctive**: antes de que, para que, a menos que, sin que, con tal de que, a fin de que.

**Subjunctive when the time is future or unknown**: cuando, en cuanto, hasta que, después de que, tan pronto como.

- *Te llamaré en cuanto llegue.* (future)
- *Siempre te llamo cuando llego.* (habit → indicative)$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Indicativo o subjuntivo$q$, $q$Indicative or subjunctive$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Te llamaré en cuanto ___. (llegar, yo)", "answer": "llegue", "options": ["llegue", "llego", "llegaré"]}, {"text": "Lo haré para que ___. (entender, tú)", "answer": "entiendas", "options": ["entiendas", "entiendes", "entenderás"]}, {"text": "No saldré a menos que ___ la lluvia. (parar)", "answer": "pare", "options": ["pare", "para", "parará"]}, {"text": "Espérame hasta que ___. (terminar, yo)", "answer": "termine", "options": ["termine", "termino", "terminaré"]}]}$q$::jsonb),
  (30, 'game', $q$Conjunciones$q$, $q$Conjunctions$q$, null, null, null, null, null, $q$match$q$, $q${"items": [{"a": "antes de que", "b": "before"}, {"a": "para que", "b": "so that"}, {"a": "a menos que", "b": "unless"}, {"a": "sin que", "b": "without"}, {"a": "con tal de que", "b": "provided that"}, {"a": "hasta que", "b": "until"}]}$q$::jsonb),
  (40, 'game', $q$¿Verdadero o falso?$q$, $q$True or false?$q$, null, null, null, null, null, $q$truefalse$q$, $q${"items": [{"text": "«Antes de que» siempre exige subjuntivo.", "answer": true}, {"text": "«Para que» exige indicativo.", "answer": false, "explanation": "Exige subjuntivo."}, {"text": "«Cuando llegarás» es correcto para el futuro.", "answer": false, "explanation": "Se dice «cuando llegues»."}]}$q$::jsonb),
  (50, 'quiz', $q$Voy a quedarme hasta que tú ___.$q$, $q$Voy a quedarme hasta que tú ___.$q$, array[$q$vuelvas$q$, $q$vuelves$q$, $q$volverás$q$], array[$q$vuelvas$q$, $q$vuelves$q$, $q$volverás$q$], 0, $q$Momento futuro tras «hasta que»: subjuntivo.$q$, $q$Future time after «hasta que»: subjunctive.$q$, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$c1-perifrasis-verbales$q$, 'article', 'adults',
         (select id from public.levels where code = 'C1' and language_code = 'es'),
         $q$Perífrasis verbales$q$, $q$Verbal periphrases$q$, $q$Matiza la acción con acabar de, volver a, dejar de, seguir, llevar…$q$, $q$Add nuance with acabar de, volver a, dejar de, seguir, llevar…$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$c1-perifrasis-verbales$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$Un verbo auxiliar + infinitivo, gerundio o participio aporta un matiz:

- **acabar de + infinitivo**: acción recién terminada (*Acabo de llegar*).
- **volver a + infinitivo**: repetición (*Volvió a llamar*).
- **dejar de + infinitivo**: interrupción (*Dejó de fumar*).
- **seguir + gerundio**: continuidad (*Sigue lloviendo*).
- **llevar + gerundio**: duración (*Llevo un año estudiando*).
- **empezar a + infinitivo**: inicio.$q$, $q$An auxiliary verb + infinitive, gerund or participle adds nuance:

- **acabar de + infinitive**: just finished (*Acabo de llegar*).
- **volver a + infinitive**: repetition (*Volvió a llamar*).
- **dejar de + infinitive**: stopping (*Dejó de fumar*).
- **seguir + gerund**: continuing (*Sigue lloviendo*).
- **llevar + gerund**: duration (*Llevo un año estudiando*).
- **empezar a + infinitive**: beginning.$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$¿Qué expresa cada perífrasis?$q$, $q$What does each periphrasis express?$q$, null, null, null, null, null, $q$match$q$, $q${"items": [{"a": "acabar de + infinitivo", "b": "to have just"}, {"a": "volver a + infinitivo", "b": "to do again"}, {"a": "dejar de + infinitivo", "b": "to stop"}, {"a": "seguir + gerundio", "b": "to keep on"}, {"a": "llevar + gerundio", "b": "to have been (doing)"}, {"a": "empezar a + infinitivo", "b": "to start"}]}$q$::jsonb),
  (30, 'game', $q$Completa la perífrasis$q$, $q$Complete the periphrasis$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Acabo de ___. (llegar)", "answer": "llegar", "options": ["llegar", "llegando", "llegado"]}, {"text": "Sigue ___. (llover)", "answer": "lloviendo", "options": ["lloviendo", "llover", "llovido"]}, {"text": "Dejó de ___. (fumar)", "answer": "fumar", "options": ["fumar", "fumando", "fumado"]}, {"text": "Llevo un año ___ alemán. (estudiar)", "answer": "estudiando", "options": ["estudiando", "estudiar", "estudiado"]}]}$q$::jsonb),
  (40, 'game', $q$¿Verdadero o falso?$q$, $q$True or false?$q$, null, null, null, null, null, $q$truefalse$q$, $q${"items": [{"text": "«Volver a + infinitivo» indica repetición.", "answer": true}, {"text": "«Dejar de + gerundio» es correcto.", "answer": false, "explanation": "Se dice «dejar de + infinitivo»."}]}$q$::jsonb),
  (50, 'quiz', $q$«Acabo de comer» significa:$q$, $q$«Acabo de comer» means:$q$, array[$q$Terminé de comer hace poco$q$, $q$Voy a comer$q$, $q$Siempre como$q$], array[$q$Terminé de comer hace poco$q$, $q$Voy a comer$q$, $q$Siempre como$q$], 0, null, null, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$c1-registro-formal$q$, 'article', 'adults',
         (select id from public.levels where code = 'C1' and language_code = 'es'),
         $q$Registro formal e informal$q$, $q$Formal and informal register$q$, $q$Adapta tu español a una carta, un correo o una conversación.$q$, $q$Adapt your Spanish to a letter, an email or a conversation.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$c1-registro-formal$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$**Formal**: usted, condicional de cortesía y fórmulas fijas.

- Estimado señor / Estimada señora
- ¿Podría ayudarme, por favor?
- Le agradecería que me enviara…
- Atentamente / Cordialmente

**Informal**: tú, tono cercano.

- Hola, ¿qué tal?
- ¿Me ayudas?
- Un abrazo / Besos$q$, $q$**Formal**: usted, polite conditional and fixed formulas.

- Estimado señor / Estimada señora (Dear Sir / Madam)
- ¿Podría ayudarme, por favor?
- Le agradecería que me enviara…
- Atentamente / Cordialmente (Sincerely)

**Informal**: tú, friendly tone.

- Hola, ¿qué tal?
- ¿Me ayudas?
- Un abrazo / Besos$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Tarjetas: fórmulas$q$, $q$Flashcards: formulas$q$, null, null, null, null, null, $q$flashcards$q$, $q${"items": [{"a": "Estimado señor", "b": "Dear Sir"}, {"a": "Atentamente", "b": "Sincerely"}, {"a": "Un abrazo", "b": "Best wishes (informal)"}, {"a": "Le agradecería que…", "b": "I would appreciate it if you…"}, {"a": "¿Podrías ayudarme?", "b": "Could you help me? (informal)"}, {"a": "¿Podría ayudarme?", "b": "Could you help me? (formal)"}]}$q$::jsonb),
  (30, 'game', $q$Elige el registro$q$, $q$Choose the register$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Correo formal: ___ señora López:", "answer": "Estimada", "options": ["Estimada", "Hola", "Ey"]}, {"text": "Despedida informal: ___", "answer": "Un abrazo", "options": ["Un abrazo", "Atentamente", "Cordialmente"]}, {"text": "Formal: ¿___ ayudarme, por favor?", "answer": "Podría", "options": ["Podría", "Puedes", "Podrías"]}]}$q$::jsonb),
  (40, 'game', $q$¿Verdadero o falso?$q$, $q$True or false?$q$, null, null, null, null, null, $q$truefalse$q$, $q${"items": [{"text": "«Atentamente» es una despedida formal.", "answer": true}, {"text": "«Un abrazo» es adecuado en una carta a un ministro.", "answer": false, "explanation": "Es informal."}, {"text": "«Usted» se usa para tratar con respeto.", "answer": true}]}$q$::jsonb),
  (50, 'quiz', $q$¿Qué saludo es más formal?$q$, $q$Which greeting is more formal?$q$, array[$q$Estimado Sr. Pérez$q$, $q$Hola Pérez$q$, $q$Ey, Pérez$q$], array[$q$Estimado Sr. Pérez$q$, $q$Hola Pérez$q$, $q$Ey, Pérez$q$], 0, null, null, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

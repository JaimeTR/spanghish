-- 0021_lessons_b1.sql
-- Tres lecciones de español para el nivel B1 (borrador) con texto, dos juegos y una pregunta.
-- Se publican desde Administración > Lecciones. Idempotente: si el identificador ya existe, no se repite.

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$b1-imperfecto$q$, 'article', 'adults',
         (select id from public.levels where code = 'B1' and language_code = 'es'),
         $q$El pretérito imperfecto$q$, $q$The imperfect tense$q$, $q$Describe hábitos y escenarios del pasado.$q$, $q$Describe habits and settings in the past.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$b1-imperfecto$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$**Formas**

- **-ar**: -aba, -abas, -aba, -ábamos, -aban (jugaba)
- **-er / -ir**: -ía, -ías, -ía, -íamos, -ían (vivía)
- Irregulares: **ser** (era), **ir** (iba), **ver** (veía)

**Usos**: hábitos del pasado (*Cuando era niño, jugaba en el parque*), descripciones y acciones en desarrollo.$q$, $q$**Forms**

- **-ar**: -aba, -abas, -aba, -ábamos, -aban (jugaba)
- **-er / -ir**: -ía, -ías, -ía, -íamos, -ían (vivía)
- Irregular: **ser** (era), **ir** (iba), **ver** (veía)

**Uses**: past habits (*Cuando era niño, jugaba en el parque*), descriptions and ongoing actions.$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Pon el verbo en imperfecto$q$, $q$Put the verb in the imperfect$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Cuando era niño, yo ___ en el parque. (jugar)", "answer": "jugaba", "options": ["jugaba", "jugué", "juego"]}, {"text": "Ella ___ en Madrid entonces. (vivir)", "answer": "vivía", "options": ["vivía", "vivió", "vive"]}, {"text": "Nosotros ___ a la playa cada verano. (ir)", "answer": "íbamos", "options": ["íbamos", "fuimos", "vamos"]}, {"text": "Antes yo ___ más tímido. (ser)", "answer": "era", "options": ["era", "fui", "soy"]}]}$q$::jsonb),
  (30, 'game', $q$¿Verdadero o falso?$q$, $q$True or false?$q$, null, null, null, null, null, $q$truefalse$q$, $q${"items": [{"text": "El imperfecto se usa para hábitos del pasado.", "answer": true}, {"text": "«Iba» es una forma del imperfecto de «ir».", "answer": true}, {"text": "El imperfecto expresa una acción puntual terminada.", "answer": false, "explanation": "Eso es el pretérito indefinido."}]}$q$::jsonb),
  (40, 'game', $q$Marcadores del imperfecto$q$, $q$Imperfect markers$q$, null, null, null, null, null, $q$flashcards$q$, $q${"items": [{"a": "siempre", "b": "always"}, {"a": "todos los días", "b": "every day"}, {"a": "a menudo", "b": "often"}, {"a": "mientras", "b": "while"}, {"a": "de niño", "b": "as a child"}]}$q$::jsonb),
  (50, 'quiz', $q$Cuando era joven, ___ mucho.$q$, $q$Cuando era joven, ___ mucho.$q$, array[$q$viajaba$q$, $q$viajé$q$, $q$viajaré$q$], array[$q$viajaba$q$, $q$viajé$q$, $q$viajaré$q$], 0, $q$Hábito del pasado: imperfecto.$q$, $q$Past habit: imperfect.$q$, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$b1-perfecto$q$, 'article', 'adults',
         (select id from public.levels where code = 'B1' and language_code = 'es'),
         $q$El pretérito perfecto$q$, $q$The present perfect$q$, $q$Habla de experiencias y de lo que ha pasado hoy o esta semana.$q$, $q$Talk about experiences and what has happened today or this week.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$b1-perfecto$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$**haber** (he, has, ha, hemos, han) + **participio**

- -ar → **-ado** (hablado)
- -er / -ir → **-ido** (comido, vivido)
- Irregulares: hecho, dicho, visto, escrito, puesto, vuelto, abierto, roto

Marcadores: hoy, esta semana, este año, ya, todavía no, alguna vez.$q$, $q$**haber** (he, has, ha, hemos, han) + **participle**

- -ar → **-ado** (hablado)
- -er / -ir → **-ido** (comido, vivido)
- Irregular: hecho, dicho, visto, escrito, puesto, vuelto, abierto, roto

Markers: hoy, esta semana, este año, ya, todavía no, alguna vez.$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Participios irregulares$q$, $q$Irregular participles$q$, null, null, null, null, null, $q$match$q$, $q${"items": [{"a": "hacer", "b": "hecho"}, {"a": "decir", "b": "dicho"}, {"a": "ver", "b": "visto"}, {"a": "escribir", "b": "escrito"}, {"a": "abrir", "b": "abierto"}, {"a": "romper", "b": "roto"}]}$q$::jsonb),
  (30, 'game', $q$Elige el tiempo correcto$q$, $q$Choose the right tense$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Hoy yo ___ temprano. (comer)", "answer": "he comido", "options": ["he comido", "comí", "comía"]}, {"text": "Esta semana ellos ___ mucho. (trabajar)", "answer": "han trabajado", "options": ["han trabajado", "trabajaron", "trabajaban"]}, {"text": "¿Alguna vez ___ a Chile? (tú, viajar)", "answer": "has viajado", "options": ["has viajado", "viajaste", "viajabas"]}, {"text": "Ya ___ la tarea. (nosotros, terminar)", "answer": "hemos terminado", "options": ["hemos terminado", "terminamos", "terminábamos"]}]}$q$::jsonb),
  (40, 'game', $q$Ordena la frase$q$, $q$Put the sentence in order$q$, null, null, null, null, null, $q$order$q$, $q${"items": [{"sentence": "Todavía no he visto esa película", "translation": "I haven't seen that movie yet"}, {"sentence": "Hoy hemos comido en casa", "translation": "Today we have eaten at home"}]}$q$::jsonb),
  (50, 'quiz', $q$El participio de «escribir» es:$q$, $q$The participle of «escribir» is:$q$, array[$q$escrito$q$, $q$escribido$q$, $q$escribado$q$], array[$q$escrito$q$, $q$escribido$q$, $q$escribado$q$], 0, null, null, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$b1-subjuntivo-intro$q$, 'article', 'adults',
         (select id from public.levels where code = 'B1' and language_code = 'es'),
         $q$Introducción al presente de subjuntivo$q$, $q$Introduction to the present subjunctive$q$, $q$Expresa deseo, duda y emoción con el subjuntivo.$q$, $q$Express wishes, doubt and emotion with the subjunctive.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$b1-subjuntivo-intro$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$**Formación** (parte de la forma «yo» del presente y cambia la vocal):

- **-ar** → -e, -es, -e, -emos, -en (hable)
- **-er / -ir** → -a, -as, -a, -amos, -an (coma, viva)

**Se usa con**: deseo (*quiero que*), esperanza (*espero que*), duda (*dudo que*), emoción (*me alegra que*) y recomendaciones (*es importante que*).$q$, $q$**Formation** (start from the «yo» form of the present and switch the vowel):

- **-ar** → -e, -es, -e, -emos, -en (hable)
- **-er / -ir** → -a, -as, -a, -amos, -an (coma, viva)

**Used with**: wishes (*quiero que*), hope (*espero que*), doubt (*dudo que*), emotion (*me alegra que*) and advice (*es importante que*).$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Pon el verbo en subjuntivo$q$, $q$Put the verb in the subjunctive$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Quiero que tú ___ conmigo. (hablar)", "answer": "hables", "options": ["hables", "hablas", "hablarás"]}, {"text": "Espero que ella ___. (venir)", "answer": "venga", "options": ["venga", "viene", "vendrá"]}, {"text": "Es importante que nosotros ___. (estudiar)", "answer": "estudiemos", "options": ["estudiemos", "estudiamos", "estudiaremos"]}, {"text": "Dudo que ellos ___ tiempo. (tener)", "answer": "tengan", "options": ["tengan", "tienen", "tendrán"]}]}$q$::jsonb),
  (30, 'game', $q$¿Verdadero o falso?$q$, $q$True or false?$q$, null, null, null, null, null, $q$truefalse$q$, $q${"items": [{"text": "Después de «quiero que» se usa subjuntivo.", "answer": true}, {"text": "«No creo que» pide indicativo.", "answer": false, "explanation": "«No creo que» pide subjuntivo."}, {"text": "«Es verdad que» pide subjuntivo.", "answer": false, "explanation": "«Es verdad que» va con indicativo."}]}$q$::jsonb),
  (40, 'game', $q$Expresiones con subjuntivo$q$, $q$Subjunctive triggers$q$, null, null, null, null, null, $q$match$q$, $q${"items": [{"a": "quiero que", "b": "I want you to"}, {"a": "espero que", "b": "I hope that"}, {"a": "dudo que", "b": "I doubt that"}, {"a": "me alegra que", "b": "I am glad that"}]}$q$::jsonb),
  (50, 'quiz', $q$Espero que (tú) ___ bien.$q$, $q$Espero que (tú) ___ bien.$q$, array[$q$estés$q$, $q$estás$q$, $q$estarás$q$], array[$q$estés$q$, $q$estás$q$, $q$estarás$q$], 0, $q$Después de «espero que» va subjuntivo.$q$, $q$After «espero que» comes the subjunctive.$q$, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

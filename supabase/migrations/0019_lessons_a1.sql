-- 0019_lessons_a1.sql
-- Tres lecciones de español para el nivel A1 (borrador) con texto, dos juegos y una pregunta.
-- Se publican desde Administración > Lecciones. Idempotente: si el identificador ya existe, no se repite.

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$a1-saludos-presentaciones$q$, 'article', 'adults',
         (select id from public.levels where code = 'A1' and language_code = 'es'),
         $q$Saludos y presentaciones$q$, $q$Greetings and introductions$q$, $q$Saluda, preséntate y despídete en español.$q$, $q$Greet people, introduce yourself and say goodbye in Spanish.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$a1-saludos-presentaciones$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$**Saludos**

- Hola
- Buenos días (por la mañana)
- Buenas tardes
- Buenas noches

**Presentarse**

- Me llamo Ana. / Soy Ana.
- ¿Cómo te llamas?
- Mucho gusto. / Encantado (si eres hombre) o encantada (si eres mujer).

**Despedirse**: Adiós, Hasta luego, Hasta mañana.$q$, $q$**Greetings**

- Hola (hello)
- Buenos días (morning)
- Buenas tardes (afternoon)
- Buenas noches (evening / night)

**Introducing yourself**

- Me llamo Ana. / Soy Ana.
- ¿Cómo te llamas? (What's your name?)
- Mucho gusto. / Encantado (men) or encantada (women).

**Saying goodbye**: Adiós, Hasta luego, Hasta mañana.$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Tarjetas: saludos$q$, $q$Flashcards: greetings$q$, null, null, null, null, null, $q$flashcards$q$, $q${"items": [{"a": "hola", "b": "hello"}, {"a": "buenos días", "b": "good morning"}, {"a": "buenas tardes", "b": "good afternoon"}, {"a": "buenas noches", "b": "good evening / good night"}, {"a": "adiós", "b": "goodbye"}, {"a": "hasta luego", "b": "see you later"}, {"a": "mucho gusto", "b": "nice to meet you"}, {"a": "por favor", "b": "please"}, {"a": "gracias", "b": "thank you"}]}$q$::jsonb),
  (30, 'game', $q$Ordena las frases$q$, $q$Put the sentences in order$q$, null, null, null, null, null, $q$order$q$, $q${"items": [{"sentence": "Me llamo Ana", "translation": "My name is Ana"}, {"sentence": "Mucho gusto en conocerte", "translation": "Nice to meet you"}, {"sentence": "¿Cómo te llamas?", "translation": "What is your name?"}, {"sentence": "Hasta luego mi amigo", "translation": "See you later, my friend"}]}$q$::jsonb),
  (40, 'quiz', $q$¿Qué dices por la mañana?$q$, $q$What do you say in the morning?$q$, array[$q$Buenos días$q$, $q$Buenas noches$q$, $q$Hasta luego$q$], array[$q$Buenos días$q$, $q$Buenas noches$q$, $q$Hasta luego$q$], 0, $q$«Buenos días» se usa hasta el mediodía.$q$, $q$«Buenos días» is used until noon.$q$, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$a1-articulos-genero$q$, 'article', 'adults',
         (select id from public.levels where code = 'A1' and language_code = 'es'),
         $q$Los artículos y el género$q$, $q$Articles and gender$q$, $q$Aprende el, la, los, las, un y una y cuándo una palabra es masculina o femenina.$q$, $q$Learn el, la, los, las, un and una, and when a word is masculine or feminine.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$a1-articulos-genero$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$En español todos los sustantivos tienen género.

- **Masculino**: el libro, un libro (suelen acabar en -o)
- **Femenino**: la casa, una casa (suelen acabar en -a)
- **Plural**: los libros, las casas, unos libros, unas casas

Excepciones útiles: *el día* (masculino), *la mano* (femenina). Las palabras terminadas en **-ción** son femeninas: la canción, la lección.$q$, $q$Every Spanish noun has a gender.

- **Masculine**: el libro, un libro (usually end in -o)
- **Feminine**: la casa, una casa (usually end in -a)
- **Plural**: los libros, las casas, unos libros, unas casas

Useful exceptions: *el día* (masculine), *la mano* (feminine). Words ending in **-ción** are feminine: la canción, la lección.$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Une cada frase con su traducción$q$, $q$Match each phrase with its translation$q$, null, null, null, null, null, $q$match$q$, $q${"items": [{"a": "el niño", "b": "the boy"}, {"a": "la niña", "b": "the girl"}, {"a": "los libros", "b": "the books"}, {"a": "las casas", "b": "the houses"}]}$q$::jsonb),
  (30, 'game', $q$Elige el artículo correcto$q$, $q$Choose the right article$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "___ casa es grande.", "answer": "La", "options": ["La", "El"]}, {"text": "___ libros son nuevos.", "answer": "Los", "options": ["Los", "Las"]}, {"text": "Tengo ___ amigo.", "answer": "un", "options": ["un", "una"]}, {"text": "Ella tiene ___ mesa.", "answer": "una", "options": ["una", "un"]}]}$q$::jsonb),
  (40, 'game', $q$¿Verdadero o falso?$q$, $q$True or false?$q$, null, null, null, null, null, $q$truefalse$q$, $q${"items": [{"text": "«Día» es masculino: el día.", "answer": true}, {"text": "Las palabras terminadas en -ción son femeninas.", "answer": true}, {"text": "«Mano» es masculino.", "answer": false, "explanation": "Es femenino: la mano."}]}$q$::jsonb),
  (50, 'quiz', $q$¿Cuál es correcto?$q$, $q$Which one is correct?$q$, array[$q$la problema$q$, $q$el problema$q$, $q$los problema$q$], array[$q$la problema$q$, $q$el problema$q$, $q$los problema$q$], 1, $q$«Problema» es masculino aunque termine en -a.$q$, $q$«Problema» is masculine even though it ends in -a.$q$, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

with l as (
  insert into public.lessons (slug, kind, category, level_id, title_es, title_en, summary_es, summary_en, access_level, status, teaser_public)
  select $q$a1-presente-ar$q$, 'article', 'adults',
         (select id from public.levels where code = 'A1' and language_code = 'es'),
         $q$El presente de los verbos en -ar$q$, $q$Present tense of -ar verbs$q$, $q$Conjuga hablar, trabajar o estudiar en presente.$q$, $q$Conjugate hablar, trabajar or estudiar in the present.$q$, 'enrolled', 'draft', true
  where not exists (select 1 from public.lessons x where x.slug = $q$a1-presente-ar$q$)
  returning id
)
insert into public.lesson_blocks (lesson_id, position, kind, body_es, body_en, options_es, options_en, correct_option,
                                  explanation_es, explanation_en, game_type, game_data)
select l.id, v.position, v.kind::public.lesson_block_kind, v.body_es, v.body_en, v.options_es, v.options_en,
       v.correct_option, v.explanation_es, v.explanation_en, v.game_type, v.game_data
from l
cross join (values
  (10, 'text', $q$Quita la terminación **-ar** y añade:

- yo → **-o** (hablo)
- tú → **-as** (hablas)
- él / ella / usted → **-a** (habla)
- nosotros → **-amos** (hablamos)
- ellos / ustedes → **-an** (hablan)

Verbos útiles: trabajar, estudiar, caminar, cantar, escuchar, comprar.$q$, $q$Drop the **-ar** ending and add:

- yo → **-o** (hablo)
- tú → **-as** (hablas)
- él / ella / usted → **-a** (habla)
- nosotros → **-amos** (hablamos)
- ellos / ustedes → **-an** (hablan)

Useful verbs: trabajar, estudiar, caminar, cantar, escuchar, comprar.$q$, null::text[], null::text[], null::smallint, null::text, null::text, null::text, null::jsonb),
  (20, 'game', $q$Completa con el verbo$q$, $q$Complete with the verb$q$, null, null, null, null, null, $q$fill$q$, $q${"items": [{"text": "Yo ___ español. (hablar)", "answer": "hablo", "options": ["hablo", "hablas", "habla"]}, {"text": "Tú ___ mucho. (trabajar)", "answer": "trabajas", "options": ["trabajas", "trabajo", "trabaja"]}, {"text": "Nosotros ___ en casa. (estudiar)", "answer": "estudiamos", "options": ["estudiamos", "estudian", "estudio"]}, {"text": "Ellos ___ música. (escuchar)", "answer": "escuchan", "options": ["escuchan", "escucha", "escuchamos"]}]}$q$::jsonb),
  (30, 'game', $q$Ordena las frases$q$, $q$Put the sentences in order$q$, null, null, null, null, null, $q$order$q$, $q${"items": [{"sentence": "Yo hablo español todos los días", "translation": "I speak Spanish every day"}, {"sentence": "Ella estudia en la biblioteca", "translation": "She studies at the library"}, {"sentence": "Nosotros compramos pan", "translation": "We buy bread"}]}$q$::jsonb),
  (40, 'quiz', $q$Nosotros ___ (cantar) en el coro.$q$, $q$Nosotros ___ (cantar) en el coro.$q$, array[$q$cantamos$q$, $q$cantan$q$, $q$canto$q$], array[$q$cantamos$q$, $q$cantan$q$, $q$canto$q$], 0, $q$Con «nosotros» el verbo acaba en -amos.$q$, $q$With «nosotros» the verb ends in -amos.$q$, null, null)
) as v(position, kind, body_es, body_en, options_es, options_en, correct_option, explanation_es, explanation_en, game_type, game_data);

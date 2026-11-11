-- 0018_tests_starter_content.sql
-- Cinco tests iniciales de español (como borrador, para revisarlos y publicarlos
-- desde Administración > Tests). Son un banco de preguntas por test: el de nivel
-- saca 10 al azar de 20 y el de saludos 8 de 12, el resto usa todas.
-- Idempotente a medias: si un slug ya existe, no se vuelve a crear.

create function pg_temp.mk_test(
  p_slug text, p_es text, p_en text, p_des text, p_den text, p_level text,
  p_per smallint, p_minutes smallint
) returns void language sql as $$
  insert into public.tests (slug, title_es, title_en, description_es, description_en, level_id,
                            visibility, access_level, status, pass_percent, grade_scale,
                            time_limit_minutes, questions_per_attempt, shuffle_questions, shuffle_options)
  select p_slug, p_es, p_en, p_des, p_den,
         (select l.id from public.levels l where l.code = p_level and l.language_code = 'es'),
         'portal', 'enrolled', 'draft', 60, 10, p_minutes, p_per, true, true
  where not exists (select 1 from public.tests t where t.slug = p_slug);
$$;

create function pg_temp.q(
  p_slug text, p_pos integer, p_kind public.test_question_kind,
  p_es text, p_en text, p_opts text[], p_corr smallint, p_bool boolean, p_acc text[],
  p_ees text, p_een text
) returns void language sql as $$
  insert into public.test_questions (test_id, position, kind, prompt_es, prompt_en, options, correct_option,
                                     correct_bool, accepted_answers, explanation_es, explanation_en)
  select t.id, p_pos, p_kind, p_es, p_en, p_opts, p_corr, p_bool, p_acc, p_ees, p_een
  from public.tests t
  where t.slug = p_slug
    and not exists (select 1 from public.test_questions q where q.test_id = t.id and q.position = p_pos);
$$;

-- ===========================================================================
-- 1. Test de nivel (A1–B1): 10 de 20 al azar, 20 minutos
-- ===========================================================================
select pg_temp.mk_test('test-de-nivel-a1-b1', 'Test de nivel de español (A1–B1)', 'Spanish level test (A1–B1)',
  'Descubre tu nivel. Cada intento mezcla 10 preguntas distintas de un banco de 20.',
  'Find your level. Each attempt mixes 10 different questions from a bank of 20.', null, 10::smallint, 20::smallint);

select pg_temp.q('test-de-nivel-a1-b1', 10, 'single', 'Yo ___ estudiante.', 'Yo ___ estudiante.', array['soy','eres','es','somos'], 0::smallint, null, null, 'Con «yo» el verbo ser es «soy».', 'With «yo» the verb ser is «soy».');
select pg_temp.q('test-de-nivel-a1-b1', 20, 'single', '¿Cómo ___ llamas?', 'What goes in the blank? ¿Cómo ___ llamas?', array['me','te','se'], 1::smallint, null, null, 'Con «tú»: «¿Cómo te llamas?».', 'With «tú»: «¿Cómo te llamas?».');
select pg_temp.q('test-de-nivel-a1-b1', 30, 'single', 'Ella ___ un libro.', 'Ella ___ un libro.', array['tiene','tienes','tengo'], 0::smallint, null, null, '«Ella» pide la tercera persona: «tiene».', '«Ella» takes the third person: «tiene».');
select pg_temp.q('test-de-nivel-a1-b1', 40, 'single', '¿Qué significa «siete»?', 'What does «siete» mean?', array['seven','six','eight'], 0::smallint, null, null, '«Siete» es 7.', '«Siete» is 7.');
select pg_temp.q('test-de-nivel-a1-b1', 50, 'truefalse', '«Buenos días» se usa por la noche.', '«Buenos días» is used at night.', null, null, false, null, 'Se usa por la mañana.', 'It is used in the morning.');
select pg_temp.q('test-de-nivel-a1-b1', 60, 'fill', 'Nosotros ___ en Madrid. (vivir)', 'Nosotros ___ en Madrid. (vivir)', null, null, null, array['vivimos'], 'Presente de «vivir»: vivimos.', 'Present of «vivir»: vivimos.');
select pg_temp.q('test-de-nivel-a1-b1', 70, 'single', 'Los libros ___ en la mesa.', 'Los libros ___ en la mesa.', array['están','está','es'], 0::smallint, null, null, 'Plural y lugar: «están».', 'Plural and location: «están».');
select pg_temp.q('test-de-nivel-a1-b1', 80, 'fill', 'Ayer yo ___ al cine. (ir)', 'Ayer yo ___ al cine. (ir)', null, null, null, array['fui'], 'Pretérito de «ir»: fui.', 'Preterite of «ir»: fui.');
select pg_temp.q('test-de-nivel-a1-b1', 90, 'single', 'Mañana ___ a mi abuela.', 'Mañana ___ a mi abuela.', array['visité','voy a visitar','visitaba'], 1::smallint, null, null, 'Futuro próximo: «voy a visitar».', 'Near future: «voy a visitar».');
select pg_temp.q('test-de-nivel-a1-b1', 100, 'single', 'Me gustan ___ películas.', 'Me gustan ___ películas.', array['las','los','la'], 0::smallint, null, null, '«Películas» es femenino plural.', '«Películas» is feminine plural.');
select pg_temp.q('test-de-nivel-a1-b1', 110, 'truefalse', '«Hay» se usa para decir que algo existe.', '«Hay» is used to say that something exists.', null, null, true, null, 'Ejemplo: «Hay un parque cerca».', 'Example: «Hay un parque cerca».');
select pg_temp.q('test-de-nivel-a1-b1', 120, 'single', '___ agua está fría.', '___ agua está fría.', array['El','La','Los'], 0::smallint, null, null, '«Agua» es femenino, pero lleva «el» por el sonido «a» tónica.', '«Agua» is feminine but takes «el» because of the stressed «a».');
select pg_temp.q('test-de-nivel-a1-b1', 130, 'single', 'Quiero que tú ___ conmigo.', 'Quiero que tú ___ conmigo.', array['vengas','vienes','vendrás'], 0::smallint, null, null, 'Después de «querer que» va subjuntivo.', 'After «querer que» comes the subjunctive.');
select pg_temp.q('test-de-nivel-a1-b1', 140, 'fill', 'Si tuviera tiempo, ___ a visitarte. (ir)', 'Si tuviera tiempo, ___ a visitarte. (ir)', null, null, null, array['iría'], 'Condicional de «ir»: iría.', 'Conditional of «ir»: iría.');
select pg_temp.q('test-de-nivel-a1-b1', 150, 'single', 'Ya ___ la tarea cuando llegó mi padre.', 'Ya ___ la tarea cuando llegó mi padre.', array['había terminado','terminé','termino'], 0::smallint, null, null, 'Acción anterior a otra en el pasado: pluscuamperfecto.', 'Action before another in the past: pluperfect.');
select pg_temp.q('test-de-nivel-a1-b1', 160, 'single', 'No creo que ___ razón.', 'No creo que ___ razón.', array['tiene','tenga','tendrá'], 1::smallint, null, null, '«No creo que» pide subjuntivo.', '«No creo que» takes the subjunctive.');
select pg_temp.q('test-de-nivel-a1-b1', 170, 'single', 'El libro ___ me prestaste es muy bueno.', 'El libro ___ me prestaste es muy bueno.', array['que','quien','cual'], 0::smallint, null, null, 'Pronombre relativo para cosas: «que».', 'Relative pronoun for things: «que».');
select pg_temp.q('test-de-nivel-a1-b1', 180, 'single', 'Llevo dos años ___ español.', 'Llevo dos años ___ español.', array['estudiando','estudiado','estudio'], 0::smallint, null, null, '«Llevar + tiempo + gerundio».', '«Llevar + time + gerund».');
select pg_temp.q('test-de-nivel-a1-b1', 190, 'truefalse', '«Por» y «para» siempre se pueden usar indistintamente.', '«Por» and «para» can always be used interchangeably.', null, null, false, null, 'Tienen usos distintos.', 'They have different uses.');
select pg_temp.q('test-de-nivel-a1-b1', 200, 'fill', 'Ojalá ___ buen tiempo mañana. (hacer)', 'Ojalá ___ buen tiempo mañana. (hacer)', null, null, null, array['haga'], '«Ojalá» pide subjuntivo: haga.', '«Ojalá» takes the subjunctive: haga.');

-- ===========================================================================
-- 2. A1 · Ser y estar
-- ===========================================================================
select pg_temp.mk_test('a1-ser-y-estar', 'A1 · Ser y estar', 'A1 · Ser and estar',
  'Practica cuándo usar «ser» y cuándo «estar».', 'Practise when to use «ser» and when to use «estar».', 'A1', null, 10::smallint);

select pg_temp.q('a1-ser-y-estar', 10, 'single', 'Mi hermana ___ doctora.', 'Mi hermana ___ doctora.', array['es','está'], 0::smallint, null, null, 'Las profesiones van con «ser».', 'Professions use «ser».');
select pg_temp.q('a1-ser-y-estar', 20, 'single', 'Hoy ___ cansado.', 'Hoy ___ cansado.', array['soy','estoy'], 1::smallint, null, null, 'Estados temporales: «estar».', 'Temporary states: «estar».');
select pg_temp.q('a1-ser-y-estar', 30, 'single', 'Ellos ___ de México.', 'Ellos ___ de México.', array['son','están'], 0::smallint, null, null, 'El origen va con «ser».', 'Origin uses «ser».');
select pg_temp.q('a1-ser-y-estar', 40, 'single', '¿Dónde ___ el baño?', '¿Dónde ___ el baño?', array['es','está'], 1::smallint, null, null, 'La ubicación va con «estar».', 'Location uses «estar».');
select pg_temp.q('a1-ser-y-estar', 50, 'single', 'La fiesta ___ en mi casa.', 'La fiesta ___ en mi casa.', array['es','está'], 0::smallint, null, null, 'Los eventos se ubican con «ser».', 'Events take place with «ser».');
select pg_temp.q('a1-ser-y-estar', 60, 'truefalse', 'Para decir la profesión se usa «ser».', 'To say your profession you use «ser».', null, null, true, null, 'Ejemplo: «Soy profesora».', 'Example: «Soy profesora».');
select pg_temp.q('a1-ser-y-estar', 70, 'truefalse', '«Estar» se usa para decir de dónde eres.', '«Estar» is used to say where you are from.', null, null, false, null, 'El origen se dice con «ser».', 'Origin is expressed with «ser».');
select pg_temp.q('a1-ser-y-estar', 80, 'fill', 'Nosotros ___ estudiantes. (ser)', 'Nosotros ___ estudiantes. (ser)', null, null, null, array['somos'], 'Presente de «ser»: somos.', 'Present of «ser»: somos.');
select pg_temp.q('a1-ser-y-estar', 90, 'fill', 'Yo ___ en casa. (estar)', 'Yo ___ en casa. (estar)', null, null, null, array['estoy'], 'Presente de «estar»: estoy.', 'Present of «estar»: estoy.');
select pg_temp.q('a1-ser-y-estar', 100, 'single', 'El café ___ caliente ahora mismo.', 'El café ___ caliente ahora mismo.', array['es','está'], 1::smallint, null, null, 'Estado en este momento: «estar».', 'State right now: «estar».');

-- ===========================================================================
-- 3. A1 · Saludos, números y colores: 8 de 12 al azar
-- ===========================================================================
select pg_temp.mk_test('a1-saludos-numeros-colores', 'A1 · Saludos, números y colores', 'A1 · Greetings, numbers and colours',
  'Vocabulario básico. Cada intento mezcla 8 preguntas de un banco de 12.', 'Basic vocabulary. Each attempt mixes 8 questions from a bank of 12.', 'A1', 8::smallint, 8::smallint);

select pg_temp.q('a1-saludos-numeros-colores', 10, 'single', '¿Cómo se dice «good morning»?', 'How do you say «good morning»?', array['Buenos días','Buenas noches','Hasta luego'], 0::smallint, null, null, null, null);
select pg_temp.q('a1-saludos-numeros-colores', 20, 'single', '¿Cómo se escribe el número 5?', 'How do you write the number 5?', array['cuatro','cinco','seis'], 1::smallint, null, null, null, null);
select pg_temp.q('a1-saludos-numeros-colores', 30, 'single', '¿Qué significa «azul»?', 'What does «azul» mean?', array['blue','red','green'], 0::smallint, null, null, null, null);
select pg_temp.q('a1-saludos-numeros-colores', 40, 'single', '¿Qué significa «rojo»?', 'What does «rojo» mean?', array['yellow','red','white'], 1::smallint, null, null, null, null);
select pg_temp.q('a1-saludos-numeros-colores', 50, 'fill', 'Escribe en español el número 10.', 'Write the number 10 in Spanish.', null, null, null, array['diez'], null, null);
select pg_temp.q('a1-saludos-numeros-colores', 60, 'fill', 'Escribe en español: «thank you».', 'Write in Spanish: «thank you».', null, null, null, array['gracias'], null, null);
select pg_temp.q('a1-saludos-numeros-colores', 70, 'truefalse', '«Adiós» significa «goodbye».', '«Adiós» means «goodbye».', null, null, true, null, null, null);
select pg_temp.q('a1-saludos-numeros-colores', 80, 'truefalse', '«Verde» es el color del cielo.', '«Verde» is the colour of the sky.', null, null, false, null, 'El cielo es azul; «verde» es green.', 'The sky is blue; «verde» is green.');
select pg_temp.q('a1-saludos-numeros-colores', 90, 'single', '¿Cuál es el número 20?', 'Which one is the number 20?', array['veinte','doce','treinta'], 0::smallint, null, null, null, null);
select pg_temp.q('a1-saludos-numeros-colores', 100, 'single', '«Por favor» significa:', '«Por favor» means:', array['please','sorry','thanks'], 0::smallint, null, null, null, null);
select pg_temp.q('a1-saludos-numeros-colores', 110, 'fill', 'Escribe en español el color «yellow».', 'Write the colour «yellow» in Spanish.', null, null, null, array['amarillo'], null, null);
select pg_temp.q('a1-saludos-numeros-colores', 120, 'single', '¿Cómo respondes a «¿Cómo estás?»?', 'How do you answer «¿Cómo estás?»?', array['Bien, gracias','Me llamo Ana','Tengo diez años'], 0::smallint, null, null, null, null);

-- ===========================================================================
-- 4. A2 · Pretérito indefinido
-- ===========================================================================
select pg_temp.mk_test('a2-preterito-indefinido', 'A2 · Pretérito indefinido', 'A2 · Preterite tense',
  'Acciones terminadas en el pasado: verbos regulares e irregulares frecuentes.', 'Completed past actions: regular and common irregular verbs.', 'A2', null, 12::smallint);

select pg_temp.q('a2-preterito-indefinido', 10, 'single', 'Ayer yo ___ pizza. (comer)', 'Ayer yo ___ pizza. (comer)', array['comí','comía','comeré'], 0::smallint, null, null, 'Acción terminada: pretérito «comí».', 'Completed action: preterite «comí».');
select pg_temp.q('a2-preterito-indefinido', 20, 'single', 'Ella ___ ayer. (llegar)', 'Ella ___ ayer. (llegar)', array['llegó','llegaba','llegará'], 0::smallint, null, null, null, null);
select pg_temp.q('a2-preterito-indefinido', 30, 'fill', 'Nosotros ___ al parque. (ir)', 'Nosotros ___ al parque. (ir)', null, null, null, array['fuimos'], null, null);
select pg_temp.q('a2-preterito-indefinido', 40, 'fill', 'Tú ___ la puerta. (abrir)', 'Tú ___ la puerta. (abrir)', null, null, null, array['abriste'], null, null);
select pg_temp.q('a2-preterito-indefinido', 50, 'single', 'Ellos ___ una carta. (escribir)', 'Ellos ___ una carta. (escribir)', array['escribieron','escribían','escribirán'], 0::smallint, null, null, null, null);
select pg_temp.q('a2-preterito-indefinido', 60, 'truefalse', '«Fui» puede ser de «ser» y de «ir».', '«Fui» can come from «ser» and from «ir».', null, null, true, null, 'Son iguales en pretérito: el contexto decide.', 'They are identical in the preterite: context decides.');
select pg_temp.q('a2-preterito-indefinido', 70, 'single', 'El año pasado ___ en Chile. (vivir, yo)', 'El año pasado ___ en Chile. (vivir, yo)', array['viví','vivía','viviré'], 0::smallint, null, null, null, null);
select pg_temp.q('a2-preterito-indefinido', 80, 'fill', 'Ella ___ una película. (ver)', 'Ella ___ una película. (ver)', null, null, null, array['vio'], 'Sin tilde: «vio».', 'No accent mark: «vio».');
select pg_temp.q('a2-preterito-indefinido', 90, 'single', '«Anoche» se usa con:', '«Anoche» is used with:', array['pretérito indefinido','futuro','presente'], 0::smallint, null, null, null, null);
select pg_temp.q('a2-preterito-indefinido', 100, 'fill', 'Yo ___ la verdad. (decir)', 'Yo ___ la verdad. (decir)', null, null, null, array['dije'], null, null);

-- ===========================================================================
-- 5. B1 · Subjuntivo y conectores
-- ===========================================================================
select pg_temp.mk_test('b1-subjuntivo-conectores', 'B1 · Subjuntivo y conectores', 'B1 · Subjunctive and connectors',
  'Subjuntivo con deseo, duda y tiempo, y conectores de contraste y consecuencia.', 'Subjunctive with wishes, doubt and time, plus contrast and consequence connectors.', 'B1', null, 15::smallint);

select pg_temp.q('b1-subjuntivo-conectores', 10, 'fill', 'Espero que ___ buen viaje. (tener, tú)', 'Espero que ___ buen viaje. (tener, tú)', null, null, null, array['tengas'], null, null);
select pg_temp.q('b1-subjuntivo-conectores', 20, 'single', 'Es importante que ___ temprano.', 'Es importante que ___ temprano.', array['llegues','llegas','llegarás'], 0::smallint, null, null, null, null);
select pg_temp.q('b1-subjuntivo-conectores', 30, 'single', 'Cuando ___ a casa, te llamo. (llegar, yo)', 'Cuando ___ a casa, te llamo. (llegar, yo)', array['llegue','llego','llegaré'], 0::smallint, null, null, 'Con «cuando» y futuro: subjuntivo.', 'With «cuando» and a future meaning: subjunctive.');
select pg_temp.q('b1-subjuntivo-conectores', 40, 'fill', 'Dudo que él ___ la verdad. (saber)', 'Dudo que él ___ la verdad. (saber)', null, null, null, array['sepa'], null, null);
select pg_temp.q('b1-subjuntivo-conectores', 50, 'single', 'Aunque ___ mucho, no me mojé. (hecho pasado)', 'Aunque ___ mucho, no me mojé. (past fact)', array['llovió','lloviera','lloverá'], 0::smallint, null, null, 'Un hecho conocido pide indicativo.', 'A known fact takes the indicative.');
select pg_temp.q('b1-subjuntivo-conectores', 60, 'single', 'Conector de contraste:', 'Contrast connector:', array['sin embargo','por lo tanto','además'], 0::smallint, null, null, null, null);
select pg_temp.q('b1-subjuntivo-conectores', 70, 'single', 'Conector de consecuencia:', 'Consequence connector:', array['por lo tanto','pero','aunque'], 0::smallint, null, null, null, null);
select pg_temp.q('b1-subjuntivo-conectores', 80, 'truefalse', 'Después de «es verdad que» se usa subjuntivo.', 'After «es verdad que» the subjunctive is used.', null, null, false, null, 'Se usa indicativo.', 'The indicative is used.');
select pg_temp.q('b1-subjuntivo-conectores', 90, 'fill', 'Quiero que ellos ___ aquí. (estar)', 'Quiero que ellos ___ aquí. (estar)', null, null, null, array['estén'], null, null);
select pg_temp.q('b1-subjuntivo-conectores', 100, 'single', 'Busco un libro que ___ fácil. (ser)', 'Busco un libro que ___ fácil. (ser)', array['sea','es','será'], 0::smallint, null, null, 'Algo que se busca y no se conoce: subjuntivo.', 'Something sought but unknown: subjunctive.');

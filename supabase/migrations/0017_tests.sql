-- 0017_tests.sql
-- Módulo de Tests: pruebas dinámicas que la administración crea y comparte, y
-- que el alumnado hace en el portal.
--
-- Qué lo hace dinámico:
--   * Cada test es un banco de preguntas. Con questions_per_attempt el test
--     saca esa cantidad AL AZAR en cada intento, y con shuffle_questions /
--     shuffle_options baraja el orden de preguntas y de opciones.
--   * start_test() crea el intento y fija las preguntas servidas; submit_test()
--     solo corrige esas, así cada intento es distinto y no se puede responder
--     fuera de lo servido.
--
-- Compartir (tests.visibility):
--   * private: solo las personas de test_shares (y admin).
--   * portal:  lo ve quien tenga content_tier() >= access_level (listado).
--   * link:    no sale en listas; lo hace cualquier cuenta activa que tenga el
--              enlace (el id es un uuid no adivinable).
--   * in_resources: además aparece en la sección Recursos del alumnado.
--
-- Seguridad:
--   * tests, test_questions y test_shares: solo admin. Las respuestas correctas
--     NUNCA llegan al navegador antes de enviar (el alumno lee por RPC sin ellas).
--   * test_attempts: cada persona lee los suyos; admin todos. Solo se escribe
--     desde start_test()/submit_test().
--   * Publicar exige al menos una pregunta. Auditoría con enable_audit().

create type public.test_question_kind as enum ('single', 'truefalse', 'fill');

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title_es text not null check (char_length(title_es) between 1 and 120),
  title_en text not null check (char_length(title_en) between 1 and 120),
  description_es text check (char_length(description_es) <= 500),
  description_en text check (char_length(description_en) <= 500),
  level_id uuid references public.levels (id),
  audience public.audience_segment,
  access_level public.access_level not null default 'enrolled',
  visibility text not null default 'portal' check (visibility in ('private', 'portal', 'link')),
  in_resources boolean not null default false,
  status public.content_status not null default 'draft',
  pass_percent smallint not null default 60 check (pass_percent between 1 and 100),
  grade_scale smallint not null default 10 check (grade_scale in (10, 20, 100)),
  time_limit_minutes smallint check (time_limit_minutes between 1 and 240),
  max_attempts smallint check (max_attempts between 1 and 20),
  questions_per_attempt smallint check (questions_per_attempt between 1 and 100),
  shuffle_questions boolean not null default false,
  shuffle_options boolean not null default false,
  published_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tests_slug_key unique (slug)
);

comment on table public.tests is 'Tests dinámicos (banco de preguntas) por nivel, con visibilidad y notas; sin datos personales.';
create index tests_level_id_idx on public.tests (level_id);
create index tests_created_by_idx on public.tests (created_by);

create table public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  position integer not null,
  kind public.test_question_kind not null,
  prompt_es text not null check (char_length(prompt_es) between 1 and 600),
  prompt_en text not null check (char_length(prompt_en) between 1 and 600),
  options text[],
  correct_option smallint,
  correct_bool boolean,
  accepted_answers text[],
  explanation_es text check (char_length(explanation_es) <= 500),
  explanation_en text check (char_length(explanation_en) <= 500),
  points smallint not null default 1 check (points between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint test_questions_position_unique unique (test_id, position) deferrable initially deferred,
  constraint test_questions_single check (
    kind <> 'single' or (
      options is not null and cardinality(options) between 2 and 5
      and public.text_items_within(options, 1, 120)
      and correct_option is not null and correct_option between 0 and cardinality(options) - 1
      and correct_bool is null and accepted_answers is null
    )
  ),
  constraint test_questions_truefalse check (
    kind <> 'truefalse' or (
      correct_bool is not null and options is null and correct_option is null and accepted_answers is null
    )
  ),
  constraint test_questions_fill check (
    kind <> 'fill' or (
      accepted_answers is not null and cardinality(accepted_answers) between 1 and 6
      and public.text_items_within(accepted_answers, 1, 80)
      and options is null and correct_option is null and correct_bool is null
    )
  )
);

comment on table public.test_questions is 'Preguntas de un test con su respuesta correcta (solo admin las lee).';
-- test_questions_position_unique sirve de índice para test_id.

create table public.test_shares (
  test_id uuid not null references public.tests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (test_id, user_id)
);

comment on table public.test_shares is 'Personas con las que se comparte un test privado.';
create index test_shares_user_id_idx on public.test_shares (user_id);

create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  question_ids uuid[] not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score integer check (score >= 0),
  max_score integer check (max_score > 0),
  percent smallint check (percent between 0 and 100),
  grade numeric(5, 1),
  passed boolean,
  answers jsonb,
  constraint test_attempts_submitted_all check (
    (submitted_at is null and score is null and max_score is null and percent is null
       and grade is null and passed is null and answers is null)
    or (submitted_at is not null and score is not null and max_score is not null
       and percent is not null and grade is not null and passed is not null and answers is not null)
  )
);

comment on table public.test_attempts is 'Intentos de test (la nota queda en el intento): cada persona lee los suyos; admin todos.';
create index test_attempts_user_test_idx on public.test_attempts (user_id, test_id);
create index test_attempts_test_id_idx on public.test_attempts (test_id);

-- ---------------------------------------------------------------------------
-- Guard: publicar exige al menos una pregunta; fija published_at.
-- ---------------------------------------------------------------------------
create function public.tests_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' then
    if tg_op = 'INSERT' or not exists (select 1 from public.test_questions q where q.test_id = new.id) then
      raise exception 'content_incomplete' using errcode = 'P0001';
    end if;
    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger tests_guard before insert or update on public.tests
  for each row execute function public.tests_guard();
create trigger tests_touch_updated_at before update on public.tests
  for each row execute function public.touch_updated_at();
create trigger test_questions_touch_updated_at before update on public.test_questions
  for each row execute function public.touch_updated_at();

revoke execute on function public.tests_guard() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS y privilegios
-- ---------------------------------------------------------------------------
alter table public.tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_shares enable row level security;
alter table public.test_attempts enable row level security;

grant select, insert, update, delete on table public.tests, public.test_questions, public.test_shares to authenticated;
grant select on table public.test_attempts to authenticated;

create policy tests_admin_all on public.tests for all to authenticated
  using ((select public.is_active()) and (select public.has_role('admin')))
  with check ((select public.is_active()) and (select public.has_role('admin')));

create policy test_questions_admin_all on public.test_questions for all to authenticated
  using ((select public.is_active()) and (select public.has_role('admin')))
  with check ((select public.is_active()) and (select public.has_role('admin')));

create policy test_shares_admin_all on public.test_shares for all to authenticated
  using ((select public.is_active()) and (select public.has_role('admin')))
  with check ((select public.is_active()) and (select public.has_role('admin')));

create policy test_attempts_select_own_or_admin on public.test_attempts for select to authenticated
  using (
    (select public.is_active())
    and (user_id = (select auth.uid()) or (select public.has_role('admin')))
  );

-- ---------------------------------------------------------------------------
-- Orden de preguntas
-- ---------------------------------------------------------------------------
create function public.move_test_question(p_question_id uuid, p_direction text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_test_id uuid;
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

  select q.test_id, q.position into v_test_id, v_position
  from public.test_questions q where q.id = p_question_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if p_direction = 'up' then
    select q.id, q.position into v_other_id, v_other_position
    from public.test_questions q
    where q.test_id = v_test_id and q.position < v_position
    order by q.position desc limit 1 for update;
  else
    select q.id, q.position into v_other_id, v_other_position
    from public.test_questions q
    where q.test_id = v_test_id and q.position > v_position
    order by q.position limit 1 for update;
  end if;

  if v_other_id is null then
    return;
  end if;

  update public.test_questions set position = v_other_position where id = p_question_id;
  update public.test_questions set position = v_position where id = v_other_id;
end;
$$;

revoke execute on function public.move_test_question(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.move_test_question(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- ¿Puede la persona actual hacer este test? (interna)
-- ---------------------------------------------------------------------------
create function public.can_take_test(p_test_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active() and exists (
    select 1 from public.tests t
    where t.id = p_test_id
      and t.status = 'published'
      and (
        public.has_role('admin')
        or (t.visibility = 'portal' and t.access_level <= public.content_tier())
        or t.visibility = 'link'
        or (t.visibility = 'private' and exists (
              select 1 from public.test_shares s
              where s.test_id = t.id and s.user_id = (select auth.uid())))
      )
  );
$$;

revoke execute on function public.can_take_test(uuid) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Lectura para el alumnado (nunca devuelve respuestas correctas)
-- ---------------------------------------------------------------------------
create function public.list_available_tests()
returns table (
  id uuid,
  slug text,
  title_es text,
  title_en text,
  description_es text,
  description_en text,
  level_code text,
  audience public.audience_segment,
  visibility text,
  in_resources boolean,
  pass_percent smallint,
  grade_scale smallint,
  time_limit_minutes smallint,
  max_attempts smallint,
  question_count integer,
  attempts integer,
  best_percent smallint,
  best_grade numeric,
  passed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id, t.slug, t.title_es, t.title_en, t.description_es, t.description_en,
    lv.code, t.audience, t.visibility, t.in_resources, t.pass_percent, t.grade_scale,
    t.time_limit_minutes, t.max_attempts,
    least(
      (select count(*)::integer from public.test_questions q where q.test_id = t.id),
      coalesce(t.questions_per_attempt, 100000)
    ),
    (select count(*)::integer from public.test_attempts a
       where a.test_id = t.id and a.user_id = (select auth.uid()) and a.submitted_at is not null),
    (select max(a.percent) from public.test_attempts a
       where a.test_id = t.id and a.user_id = (select auth.uid()) and a.submitted_at is not null),
    (select max(a.grade) from public.test_attempts a
       where a.test_id = t.id and a.user_id = (select auth.uid()) and a.submitted_at is not null),
    coalesce((select bool_or(a.passed) from public.test_attempts a
       where a.test_id = t.id and a.user_id = (select auth.uid()) and a.submitted_at is not null), false)
  from public.tests t
  left join public.levels lv on lv.id = t.level_id
  where public.is_active()
    and t.status = 'published'
    and (
      (t.visibility = 'portal' and t.access_level <= public.content_tier())
      or (t.visibility = 'private' and exists (
            select 1 from public.test_shares s
            where s.test_id = t.id and s.user_id = (select auth.uid())))
    )
  order by lv.code nulls first, t.title_es, t.id;
$$;

-- Ficha del test + mis intentos (para la página previa a empezar).
create function public.get_test_info(p_test_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id,
    'title_es', t.title_es,
    'title_en', t.title_en,
    'description_es', t.description_es,
    'description_en', t.description_en,
    'level_code', lv.code,
    'pass_percent', t.pass_percent,
    'grade_scale', t.grade_scale,
    'time_limit_minutes', t.time_limit_minutes,
    'max_attempts', t.max_attempts,
    'question_count', least(
      (select count(*)::integer from public.test_questions q where q.test_id = t.id),
      coalesce(t.questions_per_attempt, 100000)),
    'attempts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'percent', a.percent, 'grade', a.grade, 'passed', a.passed,
        'submitted_at', a.submitted_at) order by a.submitted_at desc)
      from public.test_attempts a
      where a.test_id = t.id and a.user_id = (select auth.uid()) and a.submitted_at is not null
    ), '[]'::jsonb)
  )
  from public.tests t
  left join public.levels lv on lv.id = t.level_id
  where t.id = p_test_id and public.can_take_test(t.id);
$$;

-- Mis notas: todos mis intentos enviados.
create function public.list_my_test_results()
returns table (
  attempt_id uuid,
  test_id uuid,
  title_es text,
  title_en text,
  level_code text,
  percent smallint,
  grade numeric,
  grade_scale smallint,
  passed boolean,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, t.id, t.title_es, t.title_en, lv.code, a.percent, a.grade, t.grade_scale, a.passed, a.submitted_at
  from public.test_attempts a
  join public.tests t on t.id = a.test_id
  left join public.levels lv on lv.id = t.level_id
  where public.is_active() and a.user_id = (select auth.uid()) and a.submitted_at is not null
  order by a.submitted_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Intento: carga de las preguntas servidas (interna) y arranque
-- ---------------------------------------------------------------------------
create function public.test_attempt_payload(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'attempt_id', a.id,
    'started_at', a.started_at,
    'expires_at', case when t.time_limit_minutes is null then null
                       else a.started_at + make_interval(mins => t.time_limit_minutes) end,
    'test', jsonb_build_object(
      'id', t.id,
      'title_es', t.title_es,
      'title_en', t.title_en,
      'description_es', t.description_es,
      'description_en', t.description_en,
      'pass_percent', t.pass_percent,
      'grade_scale', t.grade_scale,
      'time_limit_minutes', t.time_limit_minutes
    ),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'kind', q.kind,
        'prompt_es', q.prompt_es,
        'prompt_en', q.prompt_en,
        'points', q.points,
        'options', case when q.kind = 'single' then (
          select jsonb_agg(jsonb_build_object('i', o.i - 1, 'text', o.txt)
                           order by case when t.shuffle_options then random() else (o.i)::double precision end)
          from unnest(q.options) with ordinality as o(txt, i)
        ) end
      ) order by u.ord)
      from unnest(a.question_ids) with ordinality as u(qid, ord)
      join public.test_questions q on q.id = u.qid
    ), '[]'::jsonb)
  )
  from public.test_attempts a
  join public.tests t on t.id = a.test_id
  where a.id = p_attempt_id;
$$;

revoke execute on function public.test_attempt_payload(uuid) from public, anon, authenticated, service_role;

create function public.start_test(p_test_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_test public.tests%rowtype;
  v_attempt public.test_attempts%rowtype;
  v_ids uuid[];
  v_done integer;
begin
  if v_uid is null or not public.can_take_test(p_test_id) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  select * into v_test from public.tests t where t.id = p_test_id;

  -- Intento abierto y vigente: se retoma (mismas preguntas).
  select * into v_attempt from public.test_attempts a
  where a.test_id = p_test_id and a.user_id = v_uid and a.submitted_at is null
  order by a.started_at desc limit 1;
  if found and (v_test.time_limit_minutes is null
                or now() <= v_attempt.started_at + make_interval(mins => v_test.time_limit_minutes + 1)) then
    return public.test_attempt_payload(v_attempt.id);
  end if;

  if v_test.max_attempts is not null then
    select count(*) into v_done from public.test_attempts a
    where a.test_id = p_test_id and a.user_id = v_uid and a.submitted_at is not null;
    if v_done >= v_test.max_attempts then
      raise exception 'attempts_exhausted' using errcode = 'P0001';
    end if;
  end if;

  -- Selección dinámica: al azar si hay límite por intento o si se barajan.
  select coalesce(array_agg(s.id order by s.ord), '{}') into v_ids
  from (
    select q.id,
           row_number() over (
             order by case when v_test.shuffle_questions or v_test.questions_per_attempt is not null
                           then random() else q.position::double precision end
           ) as ord
    from public.test_questions q where q.test_id = p_test_id
  ) s
  where s.ord <= coalesce(v_test.questions_per_attempt, 100000);

  if cardinality(v_ids) = 0 then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  insert into public.test_attempts (test_id, user_id, question_ids)
  values (p_test_id, v_uid, v_ids)
  returning * into v_attempt;

  return public.test_attempt_payload(v_attempt.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Envío y corrección. p_answers = { "<question_id>": valor } con valor número
-- (opción elegida, desde 0 sobre las opciones ORIGINALES), booleano o texto.
-- Solo se corrigen las preguntas servidas en el intento. Pasado el tiempo
-- (con un minuto de margen) las respuestas no cuentan.
-- ---------------------------------------------------------------------------
create function public.submit_test(p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_attempt public.test_attempts%rowtype;
  v_test public.tests%rowtype;
  v_q public.test_questions%rowtype;
  v_qid uuid;
  v_given jsonb;
  v_ok boolean;
  v_correct jsonb;
  v_score integer := 0;
  v_max integer := 0;
  v_percent integer;
  v_grade numeric;
  v_passed boolean;
  v_review jsonb := '[]'::jsonb;
  v_late boolean;
begin
  if v_uid is null or not public.is_active() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'invalid' using errcode = 'P0001';
  end if;

  select * into v_attempt from public.test_attempts a
  where a.id = p_attempt_id and a.user_id = v_uid and a.submitted_at is null
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  select * into v_test from public.tests t where t.id = v_attempt.test_id;

  v_late := v_test.time_limit_minutes is not null
            and now() > v_attempt.started_at + make_interval(mins => v_test.time_limit_minutes + 1);
  if v_late then
    p_answers := '{}'::jsonb;
  end if;

  foreach v_qid in array v_attempt.question_ids loop
    select * into v_q from public.test_questions q where q.id = v_qid;
    if not found then
      continue;
    end if;
    v_given := p_answers -> v_q.id::text;
    v_max := v_max + v_q.points;
    v_ok := false;

    if v_q.kind = 'single' then
      v_correct := to_jsonb(v_q.correct_option);
      if jsonb_typeof(v_given) = 'number' and (v_given #>> '{}') ~ '^[0-9]+$' then
        v_ok := (v_given #>> '{}')::integer = v_q.correct_option;
      end if;
    elsif v_q.kind = 'truefalse' then
      v_correct := to_jsonb(v_q.correct_bool);
      if jsonb_typeof(v_given) = 'boolean' then
        v_ok := (v_given #>> '{}')::boolean = v_q.correct_bool;
      end if;
    else
      v_correct := to_jsonb(v_q.accepted_answers[1]);
      if jsonb_typeof(v_given) = 'string' then
        v_ok := exists (
          select 1 from unnest(v_q.accepted_answers) as a
          where lower(btrim(regexp_replace(a, '\s+', ' ', 'g')))
              = lower(btrim(regexp_replace(v_given #>> '{}', '\s+', ' ', 'g')))
        );
      end if;
    end if;

    if v_ok then
      v_score := v_score + v_q.points;
    end if;

    v_review := v_review || jsonb_build_array(jsonb_build_object(
      'question_id', v_q.id,
      'correct', v_ok,
      'given', v_given,
      'answer', v_correct,
      'explanation_es', v_q.explanation_es,
      'explanation_en', v_q.explanation_en
    ));
  end loop;

  if v_max = 0 then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  v_percent := round(100.0 * v_score / v_max);
  v_grade := round(v_percent * v_test.grade_scale / 100.0, 1);
  v_passed := v_percent >= v_test.pass_percent;

  update public.test_attempts
  set submitted_at = now(), score = v_score, max_score = v_max, percent = v_percent,
      grade = v_grade, passed = v_passed, answers = p_answers
  where id = p_attempt_id;

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'score', v_score,
    'max_score', v_max,
    'percent', v_percent,
    'grade', v_grade,
    'grade_scale', v_test.grade_scale,
    'passed', v_passed,
    'late', v_late,
    'review', v_review
  );
end;
$$;

revoke execute on function public.list_available_tests() from public, anon, authenticated, service_role;
revoke execute on function public.get_test_info(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.list_my_test_results() from public, anon, authenticated, service_role;
revoke execute on function public.start_test(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.submit_test(uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.list_available_tests() to authenticated;
grant execute on function public.get_test_info(uuid) to authenticated;
grant execute on function public.list_my_test_results() to authenticated;
grant execute on function public.start_test(uuid) to authenticated;
grant execute on function public.submit_test(uuid, jsonb) to authenticated;

select public.enable_audit('public.tests');
select public.enable_audit('public.test_questions');

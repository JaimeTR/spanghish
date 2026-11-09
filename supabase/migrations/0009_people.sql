-- 0009_people.sql
-- Personas: alumnos, datos privados, tutores, vínculos y consentimientos.
--
-- Reglas:
--   * Alumno ≠ cuenta: students.profile_id es opcional. Un menor (segmento
--     'kids') nunca tiene cuenta; su ficha cuelga de uno o más tutores.
--   * Contacto, año de nacimiento y notas viven en student_private, que las
--     docentes nunca ven (respuesta aprobada 6). Lo mismo los datos de guardians.
--   * Lectura: admin todo; alumno su fila; tutor sus menores. La lectura de
--     docente sobre students llega con las matrículas (0011).
--   * Escritura: solo admin (create_student() para el alta completa).
--   * consent_texts: versionados e inmutables (solo insert de admin); ningún
--     texto legal en migraciones (el seed trae uno de desarrollo).
--   * consents: append-only (reject_mutation), con fecha y versión del texto;
--     el de un menor exige un tutor vinculado a ese menor.
--   * Auditoría con enable_audit() en todas las tablas (guarda copias de datos
--     personales: el borrado por privacidad purgará audit_logs, hito 3).

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.student_status as enum ('active', 'inactive');
create type public.consent_kind as enum ('enrolment_terms', 'privacy', 'minor_data', 'recordings', 'photos');
create type public.consent_method as enum ('portal', 'paper', 'email', 'web_form');

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  audience public.audience_segment not null,
  is_minor boolean generated always as (audience = 'kids') stored,
  level_id uuid references public.levels (id),
  preferred_locale text not null default 'es' check (preferred_locale in ('es', 'en')),
  status public.student_status not null default 'active',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_minor_without_account check (not is_minor or profile_id is null)
);

comment on table public.students is 'Alumnos (con o sin cuenta); los menores nunca tienen cuenta propia.';

create index students_level_id_idx on public.students (level_id);
create index students_created_by_idx on public.students (created_by);
-- profile_id ya tiene índice por su restricción unique.

create table public.student_private (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students (id) on delete cascade,
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 30),
  birth_year smallint check (birth_year between 1900 and 2100),
  admin_notes text check (char_length(admin_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.student_private is
  'Contacto y notas de un alumno: solo admin, el propio alumno y sus tutores (nunca docentes).';

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (char_length(phone) <= 30),
  preferred_locale text not null default 'es' check (preferred_locale in ('es', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.guardians is 'Tutores de menores, con cuenta opcional (portal de tutores: hito 2).';

create table public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  guardian_id uuid not null references public.guardians (id) on delete cascade,
  relationship text not null check (relationship in ('parent', 'legal_guardian', 'other')),
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_guardians_unique unique (student_id, guardian_id)
);

comment on table public.student_guardians is 'Vínculo alumno (menor) ↔ tutor.';

create index student_guardians_guardian_id_idx on public.student_guardians (guardian_id);
-- student_guardians_unique sirve de índice para student_id.

create table public.consent_texts (
  id text primary key check (id ~ '^[a-z_]+-v[0-9]+$'),
  kind public.consent_kind not null,
  body_es text not null check (char_length(body_es) between 1 and 20000),
  body_en text not null check (char_length(body_en) between 1 and 20000),
  effective_from date not null,
  created_at timestamptz not null default now(),
  -- Destino de la FK compuesta de consents (el tipo del consentimiento = el del texto).
  constraint consent_texts_id_kind_unique unique (id, kind)
);

comment on table public.consent_texts is 'Textos de consentimiento versionados (id = <tipo>-v<n>); inmutables.';

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  -- Sin cascada: un consentimiento es un registro legal; el alumno pasa a
  -- inactivo en vez de borrarse (borrado por privacidad: procedimiento, hito 3).
  student_id uuid not null references public.students (id),
  guardian_id uuid references public.guardians (id),
  text_id text not null,
  kind public.consent_kind not null,
  granted boolean not null,
  method public.consent_method not null,
  recorded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  recorded_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default now(),
  constraint consents_text_kind_fk foreign key (text_id, kind) references public.consent_texts (id, kind)
);

comment on table public.consents is 'Consentimientos (append-only): el último registro de cada tipo manda.';

create index consents_student_kind_idx on public.consents (student_id, kind, recorded_at desc);
create index consents_guardian_id_idx on public.consents (guardian_id);
create index consents_text_id_kind_idx on public.consents (text_id, kind);
create index consents_recorded_by_idx on public.consents (recorded_by);

-- ---------------------------------------------------------------------------
-- Triggers de integridad
-- ---------------------------------------------------------------------------
create trigger students_touch_updated_at
  before update on public.students
  for each row execute function public.touch_updated_at();
create trigger student_private_touch_updated_at
  before update on public.student_private
  for each row execute function public.touch_updated_at();
create trigger guardians_touch_updated_at
  before update on public.guardians
  for each row execute function public.touch_updated_at();
create trigger student_guardians_touch_updated_at
  before update on public.student_guardians
  for each row execute function public.touch_updated_at();

-- Una cuenta enlazada a un alumno debe tener rol student, y a un tutor rol
-- guardian (cuenta activa). Solo se comprueba al enlazar (insert o cambio de
-- profile_id): suspender después la cuenta no rompe la ficha.
create function public.check_linked_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role := tg_argv[0]::public.app_role;
begin
  if new.profile_id is not null
     and (tg_op = 'INSERT' or new.profile_id is distinct from old.profile_id)
     and not public.user_has_role(new.profile_id, v_role) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

comment on function public.check_linked_profile() is
  'Trigger: el profile_id enlazado debe tener el rol del argumento (P0001 forbidden).';

create trigger students_check_profile
  before insert or update of profile_id on public.students
  for each row execute function public.check_linked_profile('student');
create trigger guardians_check_profile
  before insert or update of profile_id on public.guardians
  for each row execute function public.check_linked_profile('guardian');

-- Consentimiento: quién y cuándo lo pone la base de datos (no se puede
-- antedatar ni atribuir a otra persona desde la API); el de un menor exige un
-- tutor vinculado a ese menor.
create function public.consents_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- clock_timestamp(): dos registros en la misma transacción quedan ordenados.
  new.recorded_at := clock_timestamp();
  -- Con JWT de usuario manda auth.uid(); sin él (postgres, service_role) se
  -- conserva el valor dado.
  new.recorded_by := coalesce((select auth.uid()), new.recorded_by);

  if new.guardian_id is not null and not exists (
    select 1 from public.student_guardians sg
    where sg.student_id = new.student_id and sg.guardian_id = new.guardian_id
  ) then
    raise exception 'guardian_required' using errcode = 'P0001';
  end if;

  if new.guardian_id is null
     and (select s.is_minor from public.students s where s.id = new.student_id) then
    raise exception 'guardian_required' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger consents_before_insert
  before insert on public.consents
  for each row execute function public.consents_before_insert();

create trigger consents_append_only
  before update or delete on public.consents
  for each row execute function public.reject_mutation();
create trigger consent_texts_immutable
  before update or delete on public.consent_texts
  for each row execute function public.reject_mutation();

revoke execute on function public.check_linked_profile() from public, anon, authenticated, service_role;
revoke execute on function public.consents_before_insert() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Funciones de acceso (security definer: leen sin pasar por RLS y evitan
-- recursión entre políticas). Siempre referidas al usuario que llama.
-- ---------------------------------------------------------------------------
create function public.current_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.students s
  where s.profile_id = (select auth.uid())
    and public.has_role('student');
$$;

comment on function public.current_student_ids() is 'Fichas de alumno de la cuenta actual (rol student activo).';

create function public.current_guardian_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select g.id
  from public.guardians g
  where g.profile_id = (select auth.uid())
    and public.has_role('guardian');
$$;

comment on function public.current_guardian_ids() is 'Fichas de tutor de la cuenta actual (rol guardian activo).';

create function public.guarded_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select sg.student_id
  from public.student_guardians sg
  join public.guardians g on g.id = sg.guardian_id
  where g.profile_id = (select auth.uid())
    and public.has_role('guardian');
$$;

comment on function public.guarded_student_ids() is 'Alumnos de los que la cuenta actual es tutor (rol guardian activo).';

create function public.can_view_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin')
      or p_student_id in (select public.current_student_ids())
      or p_student_id in (select public.guarded_student_ids());
$$;

comment on function public.can_view_student(uuid) is
  'admin, el propio alumno o su tutor (las matrículas de 0011 añaden a la docente).';

-- Interna: para triggers (matrículas) y funciones definer.
create function public.has_current_consent(p_student_id uuid, p_kind public.consent_kind)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select c.granted
    from public.consents c
    where c.student_id = p_student_id and c.kind = p_kind
    order by c.recorded_at desc, c.created_at desc
    limit 1
  ), false);
$$;

comment on function public.has_current_consent(uuid, public.consent_kind) is
  'true si el último consentimiento registrado de ese tipo está concedido. Interna.';

revoke execute on function public.current_student_ids() from public, anon, authenticated, service_role;
revoke execute on function public.current_guardian_ids() from public, anon, authenticated, service_role;
revoke execute on function public.guarded_student_ids() from public, anon, authenticated, service_role;
revoke execute on function public.can_view_student(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.has_current_consent(uuid, public.consent_kind)
  from public, anon, authenticated, service_role;
grant execute on function public.current_student_ids() to authenticated;
grant execute on function public.current_guardian_ids() to authenticated;
grant execute on function public.guarded_student_ids() to authenticated;
grant execute on function public.can_view_student(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS y privilegios
-- ---------------------------------------------------------------------------
alter table public.students enable row level security;
alter table public.student_private enable row level security;
alter table public.guardians enable row level security;
alter table public.student_guardians enable row level security;
alter table public.consent_texts enable row level security;
alter table public.consents enable row level security;

grant select, insert, update, delete on table
  public.students, public.student_private, public.guardians, public.student_guardians
  to authenticated;
grant select, insert on table public.consent_texts, public.consents to authenticated;

-- students: admin RW; alumno su fila; tutor sus menores.
create policy students_select on public.students for select to authenticated
  using (
    (select public.has_role('admin'))
    or id in (select public.current_student_ids())
    or id in (select public.guarded_student_ids())
  );
create policy students_insert_admin on public.students for insert to authenticated
  with check ((select public.has_role('admin')));
create policy students_update_admin on public.students for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy students_delete_admin on public.students for delete to authenticated
  using ((select public.has_role('admin')));

-- student_private: admin RW; alumno la propia; tutor la de sus menores. Nunca docentes.
create policy student_private_select on public.student_private for select to authenticated
  using (
    (select public.has_role('admin'))
    or student_id in (select public.current_student_ids())
    or student_id in (select public.guarded_student_ids())
  );
create policy student_private_insert_admin on public.student_private for insert to authenticated
  with check ((select public.has_role('admin')));
create policy student_private_update_admin on public.student_private for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy student_private_delete_admin on public.student_private for delete to authenticated
  using ((select public.has_role('admin')));

-- guardians: admin RW; tutor su fila.
create policy guardians_select on public.guardians for select to authenticated
  using (
    (select public.has_role('admin'))
    or id in (select public.current_guardian_ids())
  );
create policy guardians_insert_admin on public.guardians for insert to authenticated
  with check ((select public.has_role('admin')));
create policy guardians_update_admin on public.guardians for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy guardians_delete_admin on public.guardians for delete to authenticated
  using ((select public.has_role('admin')));

-- student_guardians: admin RW; alumno y tutor los propios.
create policy student_guardians_select on public.student_guardians for select to authenticated
  using (
    (select public.has_role('admin'))
    or student_id in (select public.current_student_ids())
    or guardian_id in (select public.current_guardian_ids())
  );
create policy student_guardians_insert_admin on public.student_guardians for insert to authenticated
  with check ((select public.has_role('admin')));
create policy student_guardians_update_admin on public.student_guardians for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy student_guardians_delete_admin on public.student_guardians for delete to authenticated
  using ((select public.has_role('admin')));

-- consent_texts: lectura para cuentas activas; admin solo inserta.
create policy consent_texts_select_active on public.consent_texts for select to authenticated
  using ((select public.is_active()));
create policy consent_texts_insert_admin on public.consent_texts for insert to authenticated
  with check ((select public.has_role('admin')));

-- consents: admin lee e inserta; alumno los propios; tutor los de sus menores.
create policy consents_select on public.consents for select to authenticated
  using (
    (select public.has_role('admin'))
    or student_id in (select public.current_student_ids())
    or student_id in (select public.guarded_student_ids())
  );
create policy consents_insert_admin on public.consents for insert to authenticated
  with check ((select public.has_role('admin')));

-- ---------------------------------------------------------------------------
-- create_student: alta completa en una transacción (admin).
-- p_payload: full_name, audience, level_id, preferred_locale, email, phone,
--   birth_year, admin_notes, guardian: { id | full_name, email, phone,
--   relationship }, consent: { text_id, method }.
-- Para un menor ('kids') exige tutor (guardian_required) y un texto de
-- consentimiento 'minor_data' con método (consent_required); registra el
-- consentimiento concedido. Para adultos se ignoran guardian y consent.
-- ---------------------------------------------------------------------------
create function public.create_student(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid;
  v_audience public.audience_segment;
  v_guardian jsonb := p_payload -> 'guardian';
  v_consent jsonb := p_payload -> 'consent';
  v_guardian_id uuid;
  v_text_id text;
begin
  if not public.has_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_audience := (p_payload ->> 'audience')::public.audience_segment;

  insert into public.students (full_name, audience, level_id, preferred_locale)
  values (
    btrim(p_payload ->> 'full_name'),
    v_audience,
    nullif(p_payload ->> 'level_id', '')::uuid,
    coalesce(nullif(p_payload ->> 'preferred_locale', ''), 'es')
  )
  returning id into v_student_id;

  insert into public.student_private (student_id, email, phone, birth_year, admin_notes)
  values (
    v_student_id,
    nullif(btrim(p_payload ->> 'email'), ''),
    nullif(btrim(p_payload ->> 'phone'), ''),
    nullif(p_payload ->> 'birth_year', '')::smallint,
    nullif(btrim(p_payload ->> 'admin_notes'), '')
  );

  if v_audience <> 'kids' then
    return v_student_id;
  end if;

  -- Menor: tutor existente (por id) o nuevo (nombre + email).
  if jsonb_typeof(v_guardian) = 'object' and nullif(v_guardian ->> 'id', '') is not null then
    select g.id into v_guardian_id from public.guardians g where g.id = (v_guardian ->> 'id')::uuid;
    if v_guardian_id is null then
      raise exception 'not_found' using errcode = 'P0001';
    end if;
  elsif jsonb_typeof(v_guardian) = 'object'
        and nullif(btrim(v_guardian ->> 'full_name'), '') is not null
        and nullif(btrim(v_guardian ->> 'email'), '') is not null then
    insert into public.guardians (full_name, email, phone, preferred_locale)
    values (
      btrim(v_guardian ->> 'full_name'),
      btrim(v_guardian ->> 'email'),
      nullif(btrim(v_guardian ->> 'phone'), ''),
      coalesce(nullif(v_guardian ->> 'preferred_locale', ''), 'es')
    )
    returning id into v_guardian_id;
  else
    raise exception 'guardian_required' using errcode = 'P0001';
  end if;

  v_text_id := case when jsonb_typeof(v_consent) = 'object' then nullif(v_consent ->> 'text_id', '') end;
  if v_text_id is null
     or nullif(v_consent ->> 'method', '') is null
     or not exists (select 1 from public.consent_texts t where t.id = v_text_id and t.kind = 'minor_data') then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;

  insert into public.student_guardians (student_id, guardian_id, relationship)
  values (v_student_id, v_guardian_id, coalesce(nullif(v_guardian ->> 'relationship', ''), 'parent'));

  insert into public.consents (student_id, guardian_id, text_id, kind, granted, method)
  values (v_student_id, v_guardian_id, v_text_id, 'minor_data', true,
          (v_consent ->> 'method')::public.consent_method);

  return v_student_id;
end;
$$;

comment on function public.create_student(jsonb) is
  'Alta de alumno (admin) con datos privados y, si es menor, tutor y consentimiento minor_data.';

revoke execute on function public.create_student(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.create_student(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------------
select public.enable_audit('public.students');
select public.enable_audit('public.student_private');
select public.enable_audit('public.guardians');
select public.enable_audit('public.student_guardians');
select public.enable_audit('public.consent_texts');
select public.enable_audit('public.consents');

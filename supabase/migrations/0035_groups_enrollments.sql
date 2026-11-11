-- 0035_groups_enrollments.sql
-- Matrícula de punta a punta: grupos, prematrículas (reserva de plaza desde la web),
-- matrículas y pagos de matrícula.
--
--   * groups: el grupo real de una edición (docente, sede, cupo). Solo los grupos
--     activos y públicos de ediciones abiertas admiten reservas desde la web.
--   * enrollment_requests (prematrículas): lo que envía la web con la clave anónima,
--     SOLO por submit_enrollment_request(). Retiene una plaza mientras no caduque
--     (30 min con tarjeta, 5 días con transferencia) o queda en lista de espera si
--     el grupo está lleno. El importe sale SIEMPRE de program_prices, nunca del navegador.
--   * confirm_enrollment_request(): convierte una prematrícula pagada en alumno (+ tutor
--     y consentimiento si es menor), matrícula activa y pago. Solo service_role (el
--     servidor del portal, tras comprobar el pago con Stripe); la administradora usa
--     admin_confirm_request() para los pagos manuales (transferencia, efectivo…).
--   * enrollments: plaza de un alumno en un grupo; el cupo lo vigila un trigger que
--     bloquea el grupo (sin carreras). Un menor necesita tutor y consentimiento vigente.
--   * enrollment_payments: cobros de matrículas (Stripe o manuales). No se borran.
--   * has_enrolled_access() deja de ser un sustituto: exige una matrícula activa o en pausa.
--   * Lectura: admin todo; docente sus grupos y sus alumnos; alumno y tutor lo suyo.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.group_status as enum ('draft', 'active', 'completed', 'cancelled');
create type public.enrollment_status as enum ('pending', 'active', 'paused', 'completed', 'cancelled');
create type public.billing_mode as enum ('upfront', 'pack', 'payg', 'free');
create type public.enrollment_request_status as enum ('pending_payment', 'waitlist', 'converted', 'expired', 'cancelled');
create type public.payment_method as enum ('stripe', 'transfer', 'cash', 'eventbrite', 'other');

-- Fecha de hoy en la escuela (Queensland no usa horario de verano).
create function public.school_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Australia/Brisbane')::date;
$$;

comment on function public.school_today() is 'Fecha actual en Australia/Brisbane.';
revoke execute on function public.school_today() from public, anon, service_role;
grant execute on function public.school_today() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Grupos
-- ---------------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{3,30}$'),
  name text not null check (char_length(name) between 1 and 120),
  program_id uuid not null references public.programs (id),
  edition_id uuid,
  teacher_id uuid references public.profiles (id) on delete set null,
  location_id uuid references public.locations (id),
  location_note text check (char_length(location_note) <= 300),
  meeting_url text check (meeting_url ~ '^https://' and char_length(meeting_url) <= 500),
  format public.lesson_format not null,
  capacity smallint not null,
  status public.group_status not null default 'draft',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint groups_edition_fk foreign key (edition_id, program_id)
    references public.program_editions (id, program_id),
  constraint groups_capacity_format check (
    (format = 'individual' and capacity = 1)
    or (format = 'own_group' and capacity between 1 and 2)
    or (format = 'local_group' and capacity between 1 and 30)
  )
);

comment on table public.groups is 'Grupos: la clase real de una edición, con docente, sede y cupo.';
create index groups_program_id_idx on public.groups (program_id);
create index groups_edition_id_idx on public.groups (edition_id);
create index groups_teacher_id_idx on public.groups (teacher_id);
create index groups_location_id_idx on public.groups (location_id);

create trigger groups_touch_updated_at before update on public.groups
  for each row execute function public.touch_updated_at();

-- La docente asignada debe tener el rol teacher (cuenta activa).
create function public.groups_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.teacher_id is not null
     and (tg_op = 'INSERT' or new.teacher_id is distinct from old.teacher_id)
     and not public.user_has_role(new.teacher_id, 'teacher') then
    raise exception 'teacher_required' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.groups_guard() from public, anon, authenticated, service_role;
create trigger groups_guard before insert or update of teacher_id on public.groups
  for each row execute function public.groups_guard();

-- ---------------------------------------------------------------------------
-- Matrículas
-- ---------------------------------------------------------------------------
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id),
  group_id uuid not null references public.groups (id),
  status public.enrollment_status not null default 'active',
  billing_mode public.billing_mode not null,
  price_id uuid references public.program_prices (id) on delete set null,
  agreed_amount_cents integer check (agreed_amount_cents >= 0),
  starts_on date not null default public.school_today(),
  ends_on date,
  cancelled_at timestamptz,
  notes text check (char_length(notes) <= 1000),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollments_dates check (ends_on is null or ends_on >= starts_on)
);

comment on table public.enrollments is 'Matrículas: plaza de un alumno en un grupo (pending, active y paused ocupan plaza).';
create unique index enrollments_seat_unique on public.enrollments (student_id, group_id)
  where status in ('pending', 'active', 'paused');
create index enrollments_group_id_idx on public.enrollments (group_id);
create index enrollments_student_id_idx on public.enrollments (student_id);
create index enrollments_price_id_idx on public.enrollments (price_id);
create index enrollments_created_by_idx on public.enrollments (created_by);

create trigger enrollments_touch_updated_at before update on public.enrollments
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Prematrículas (reservas de la web)
-- ---------------------------------------------------------------------------
create table public.enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  -- Secreto del enlace de pago de la persona (largo y aleatorio).
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  group_id uuid not null references public.groups (id),
  price_id uuid references public.program_prices (id) on delete set null,
  price_kind public.price_kind not null,
  amount_cents integer not null check (amount_cents >= 0),
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (char_length(phone) <= 30),
  birth_date date check (birth_date between date '1900-01-01' and current_date),
  is_minor boolean not null default false,
  guardian_name text check (char_length(guardian_name) <= 120),
  guardian_relationship text check (guardian_relationship in ('parent', 'legal_guardian', 'other')),
  consent_text_id text references public.consent_texts (id),
  terms_accepted_at timestamptz not null default now(),
  message text check (char_length(message) <= 1000),
  site_locale text not null default 'es' check (site_locale in ('es', 'en')),
  payment_method public.payment_method not null default 'stripe' check (payment_method in ('stripe', 'transfer')),
  status public.enrollment_request_status not null default 'pending_payment',
  hold_started_at timestamptz not null default now(),
  expires_at timestamptz,
  student_id uuid references public.students (id) on delete set null,
  enrollment_id uuid references public.enrollments (id) on delete set null,
  admin_notes text check (char_length(admin_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un menor se inscribe con los datos de su tutor (el correo y el teléfono son del tutor).
  constraint enrollment_requests_minor_guardian check (not is_minor or (guardian_name is not null and consent_text_id is not null))
);

comment on table public.enrollment_requests is
  'Prematrículas de la web: reserva de plaza con pago pendiente, lista de espera y su conversión en matrícula.';
create index enrollment_requests_group_status_idx on public.enrollment_requests (group_id, status);
create index enrollment_requests_created_idx on public.enrollment_requests (created_at desc);
create index enrollment_requests_email_idx on public.enrollment_requests (email);
create index enrollment_requests_student_id_idx on public.enrollment_requests (student_id);
create index enrollment_requests_enrollment_id_idx on public.enrollment_requests (enrollment_id);
create index enrollment_requests_price_id_idx on public.enrollment_requests (price_id);
create index enrollment_requests_consent_text_idx on public.enrollment_requests (consent_text_id);

create trigger enrollment_requests_touch_updated_at before update on public.enrollment_requests
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Pagos de matrículas
-- ---------------------------------------------------------------------------
create table public.enrollment_payments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id),
  student_id uuid not null references public.students (id),
  method public.payment_method not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'aud' check (char_length(currency) = 3),
  reference text check (char_length(reference) <= 200),
  stripe_session_id text unique check (char_length(stripe_session_id) between 10 and 255),
  payment_intent_id text unique check (char_length(payment_intent_id) between 5 and 255),
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  refunded_at timestamptz,
  note text check (char_length(note) <= 500),
  paid_at timestamptz not null default now(),
  recorded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollment_payments_refund_le_amount check (refunded_cents <= amount_cents),
  constraint enrollment_payments_stripe_ids check (method = 'stripe' or (stripe_session_id is null and payment_intent_id is null))
);

comment on table public.enrollment_payments is 'Cobros de matrículas: Stripe (los registra el servidor) o manuales (la administradora).';
create index enrollment_payments_enrollment_idx on public.enrollment_payments (enrollment_id);
create index enrollment_payments_student_idx on public.enrollment_payments (student_id);
create index enrollment_payments_paid_at_idx on public.enrollment_payments (paid_at desc);
create index enrollment_payments_recorded_by_idx on public.enrollment_payments (recorded_by);

create trigger enrollment_payments_touch_updated_at before update on public.enrollment_payments
  for each row execute function public.touch_updated_at();

-- El pago es de la matrícula: el alumno se copia de ella (no se puede atribuir a otro).
create function public.enrollment_payments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select e.student_id into new.student_id from public.enrollments e where e.id = new.enrollment_id;
  if new.student_id is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  new.recorded_by := coalesce((select auth.uid()), new.recorded_by);
  return new;
end;
$$;

revoke execute on function public.enrollment_payments_before_insert() from public, anon, authenticated, service_role;
create trigger enrollment_payments_before_insert before insert on public.enrollment_payments
  for each row execute function public.enrollment_payments_before_insert();

-- ---------------------------------------------------------------------------
-- Cupo
-- ---------------------------------------------------------------------------
-- Plazas ocupadas: matrículas que ocupan plaza + reservas vivas (sin contar p_except_request).
create function public.group_seats_taken(p_group_id uuid, p_except_request uuid default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (
    (select count(*) from public.enrollments e
      where e.group_id = p_group_id and e.status in ('pending', 'active', 'paused'))
    + (select count(*) from public.enrollment_requests r
      where r.group_id = p_group_id and r.status = 'pending_payment' and r.expires_at > now()
        and (p_except_request is null or r.id <> p_except_request))
  )::integer;
$$;

comment on function public.group_seats_taken(uuid, uuid) is 'Plazas ocupadas de un grupo: matrículas vigentes y reservas sin caducar. Interna.';
revoke execute on function public.group_seats_taken(uuid, uuid) from public, anon, authenticated, service_role;

create function public.enrollments_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group public.groups%rowtype;
  v_student public.students%rowtype;
  v_takes_seat boolean := new.status in ('pending', 'active', 'paused');
  v_took_seat boolean := tg_op = 'UPDATE' and old.status in ('pending', 'active', 'paused')
    and old.group_id = new.group_id and old.student_id = new.student_id;
  v_request uuid := nullif(current_setting('spanglish.confirming_request', true), '')::uuid;
begin
  if new.status = 'cancelled' and new.cancelled_at is null then
    new.cancelled_at := now();
  elsif new.status <> 'cancelled' then
    new.cancelled_at := null;
  end if;

  if not v_takes_seat or v_took_seat then
    return new;
  end if;

  -- Bloquea el grupo: dos altas simultáneas no pueden superar el cupo.
  select * into v_group from public.groups g where g.id = new.group_id for update;
  if v_group.status not in ('draft', 'active') then
    raise exception 'group_closed' using errcode = 'P0001';
  end if;

  select * into v_student from public.students s where s.id = new.student_id;
  if v_student.status <> 'active' then
    raise exception 'student_inactive' using errcode = 'P0001';
  end if;

  -- La reserva que se está confirmando ya contaba su plaza; un pago de tarjeta confirmado no se rechaza.
  if current_setting('spanglish.skip_capacity', true) is distinct from 'on'
     and public.group_seats_taken(new.group_id, v_request) >= v_group.capacity then
    raise exception 'group_full' using errcode = 'P0001';
  end if;

  if v_student.is_minor then
    if not exists (select 1 from public.student_guardians sg where sg.student_id = new.student_id) then
      raise exception 'guardian_required' using errcode = 'P0001';
    end if;
    if not public.has_current_consent(new.student_id, 'minor_data') then
      raise exception 'consent_required' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.enrollments_guard() from public, anon, authenticated, service_role;
create trigger enrollments_guard before insert or update of status, group_id, student_id on public.enrollments
  for each row execute function public.enrollments_guard();

-- ---------------------------------------------------------------------------
-- Funciones de acceso
-- ---------------------------------------------------------------------------
create function public.teaches_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('teacher')
     and exists (select 1 from public.groups g where g.id = p_group_id and g.teacher_id = (select auth.uid()));
$$;

create function public.taught_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.student_id
  from public.enrollments e
  join public.groups g on g.id = e.group_id
  where e.status <> 'cancelled'
    and g.teacher_id = (select auth.uid())
    and public.has_role('teacher');
$$;

create function public.my_group_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.group_id
  from public.enrollments e
  where e.status <> 'cancelled'
    and (e.student_id in (select public.current_student_ids())
      or e.student_id in (select public.guarded_student_ids()));
$$;

revoke execute on function public.teaches_group(uuid) from public, anon, service_role;
revoke execute on function public.taught_student_ids() from public, anon, service_role;
revoke execute on function public.my_group_ids() from public, anon, service_role;
grant execute on function public.teaches_group(uuid) to authenticated;
grant execute on function public.taught_student_ids() to authenticated;
grant execute on function public.my_group_ids() to authenticated;

-- La docente ve la ficha (no el contacto) de los alumnos de sus grupos.
create or replace function public.can_view_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin')
      or p_student_id in (select public.current_student_ids())
      or p_student_id in (select public.guarded_student_ids())
      or p_student_id in (select public.taught_student_ids());
$$;

-- Contenido "enrolled": matrícula activa o en pausa, propia o de un menor tutelado.
create or replace function public.has_enrolled_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.status in ('active', 'paused')
      and s.status = 'active'
      and (
        s.id in (select public.current_student_ids())
        or s.id in (select public.guarded_student_ids())
      )
  );
$$;

comment on function public.has_enrolled_access() is
  'Matrícula activa o en pausa, propia o de un menor tutelado. Interna (content_tier y políticas de contenido).';

-- ---------------------------------------------------------------------------
-- RLS y privilegios
-- ---------------------------------------------------------------------------
alter table public.groups enable row level security;
alter table public.enrollments enable row level security;
alter table public.enrollment_requests enable row level security;
alter table public.enrollment_payments enable row level security;

revoke all on table public.groups, public.enrollments, public.enrollment_requests, public.enrollment_payments
  from anon, authenticated;
grant select, insert, update, delete on table public.groups to authenticated;
grant select, insert on table public.enrollments to authenticated;
grant update (status, billing_mode, price_id, agreed_amount_cents, starts_on, ends_on, notes) on table public.enrollments to authenticated;
-- Prematrículas: se leen; solo cambian por las funciones (y las notas internas).
grant select on table public.enrollment_requests to authenticated;
grant update (admin_notes) on table public.enrollment_requests to authenticated;
grant select, insert on table public.enrollment_payments to authenticated;
grant update (refunded_cents, refunded_at, note, reference) on table public.enrollment_payments to authenticated;

create policy groups_select on public.groups for select to authenticated
  using (
    (select public.has_role('admin'))
    or ((select public.has_role('teacher')) and teacher_id = (select auth.uid()))
    or ((select public.is_active()) and id in (select public.my_group_ids()))
  );
create policy groups_insert_admin on public.groups for insert to authenticated
  with check ((select public.has_role('admin')));
create policy groups_update_admin on public.groups for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
create policy groups_delete_admin on public.groups for delete to authenticated
  using ((select public.has_role('admin')));

create policy enrollments_select on public.enrollments for select to authenticated
  using (
    (select public.has_role('admin'))
    or (select public.teaches_group(group_id))
    or ((select public.is_active()) and (
      student_id in (select public.current_student_ids())
      or student_id in (select public.guarded_student_ids())
    ))
  );
create policy enrollments_insert_admin on public.enrollments for insert to authenticated
  with check ((select public.has_role('admin')));
create policy enrollments_update_admin on public.enrollments for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));

create policy enrollment_requests_select_admin on public.enrollment_requests for select to authenticated
  using ((select public.has_role('admin')));
create policy enrollment_requests_update_admin on public.enrollment_requests for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));

-- Pagos: la administradora lee todo y registra los manuales; alumno y tutor leen los suyos.
create policy enrollment_payments_select on public.enrollment_payments for select to authenticated
  using (
    (select public.has_role('admin'))
    or ((select public.is_active()) and (
      student_id in (select public.current_student_ids())
      or student_id in (select public.guarded_student_ids())
    ))
  );
create policy enrollment_payments_insert_admin on public.enrollment_payments for insert to authenticated
  with check ((select public.has_role('admin')) and method <> 'stripe');
create policy enrollment_payments_update_admin on public.enrollment_payments for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));

-- ---------------------------------------------------------------------------
-- Web pública: grupos con plazas
-- ---------------------------------------------------------------------------
-- Precios que valen para un grupo: los de su edición y, si falta un tipo, los del programa.
create function public.group_prices(p_group_id uuid)
returns table (id uuid, kind public.price_kind, amount_cents integer, lessons_included smallint, label_es text, label_en text)
language sql
stable
security definer
set search_path = ''
as $$
  select x.id, x.kind, x.amount_cents, x.lessons_included, x.label_es, x.label_en
  from (
    select distinct on (pp.kind, pp.lessons_included)
      pp.id, pp.kind, pp.amount_cents, pp.lessons_included, pp.label_es, pp.label_en
    from public.groups g
    left join public.program_editions e on e.id = g.edition_id
    join public.program_prices pp on pp.program_id = g.program_id
    where g.id = p_group_id
      and pp.active
      and (pp.edition_id is null or pp.edition_id = g.edition_id)
      and (pp.location_id is null or pp.location_id = coalesce(g.location_id, e.location_id))
    order by pp.kind, pp.lessons_included nulls first, (pp.edition_id is null), (pp.location_id is null)
  ) x
  order by x.kind, x.lessons_included nulls first;
$$;

revoke execute on function public.group_prices(uuid) from public, anon, authenticated, service_role;

-- ¿Admite reservas desde la web? Grupo activo y público de una edición abierta de un programa público.
create function public.group_is_bookable(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.groups g
    join public.programs p on p.id = g.program_id
    join public.program_editions e on e.id = g.edition_id
    where g.id = p_group_id
      and g.status = 'active' and g.is_public
      and p.is_public and p.active
      and e.status = 'open' and e.ends_on >= public.school_today()
  );
$$;

revoke execute on function public.group_is_bookable(uuid) from public, anon, authenticated, service_role;

create function public.list_public_groups()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(row order by row ->> 'starts_on', row ->> 'name'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'group_id', g.id,
      'edition_id', e.id,
      'name', g.name,
      'program_code', p.code,
      'program_name_es', p.name_es,
      'program_name_en', p.name_en,
      'audience', p.audience,
      'format', g.format,
      'level_code', lv.code,
      'lesson_minutes', p.lesson_minutes,
      'duration_weeks', p.duration_weeks,
      'label_es', e.label_es,
      'label_en', e.label_en,
      'starts_on', e.starts_on,
      'ends_on', e.ends_on,
      'schedule_es', e.schedule_es,
      'schedule_en', e.schedule_en,
      'capacity', g.capacity,
      'seats_left', greatest(g.capacity - public.group_seats_taken(g.id), 0),
      'location', case when l.id is null then null else jsonb_build_object(
        'name', l.name, 'kind', l.kind, 'region', l.region, 'address', l.address, 'map_url', l.map_url
      ) end,
      'prices', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', gp.id, 'kind', gp.kind, 'amount_cents', gp.amount_cents,
          'lessons_included', gp.lessons_included, 'label_es', gp.label_es, 'label_en', gp.label_en
        ) order by gp.kind, gp.lessons_included nulls first)
        from public.group_prices(g.id) gp
      ), '[]'::jsonb)
    ) as row
    from public.groups g
    join public.programs p on p.id = g.program_id
    join public.program_editions e on e.id = g.edition_id
    left join public.levels lv on lv.id = p.level_id
    left join public.locations l on l.id = coalesce(g.location_id, e.location_id) and l.active
    where public.group_is_bookable(g.id)
  ) q;
$$;

comment on function public.list_public_groups() is
  'Grupos que admiten reservas desde la web, con plazas libres, sede (sin direcciones privadas) y precios.';
revoke execute on function public.list_public_groups() from public, anon, authenticated, service_role;
grant execute on function public.list_public_groups() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Web pública: enviar una prematrícula
-- ---------------------------------------------------------------------------
-- p_payload: group_id, price_id, full_name, email, phone, birth_date, guardian_name,
--   guardian_relationship, consent (bool, menores), terms (bool), payment_method
--   ('stripe' | 'transfer'), message, locale.
-- Devuelve { token, status }. Errores (P0001): invalid, not_available, price_invalid,
--   guardian_required, consent_required, consent_text_missing, terms_required, rate_limited.
create function public.submit_enrollment_request(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group public.groups%rowtype;
  v_audience public.audience_segment;
  v_minor boolean;
  v_price record;
  v_name text := btrim(p_payload ->> 'full_name');
  v_email text := lower(btrim(p_payload ->> 'email'));
  v_method public.payment_method;
  v_guardian text := nullif(btrim(p_payload ->> 'guardian_name'), '');
  v_consent_text text;
  v_existing public.enrollment_requests%rowtype;
  v_status public.enrollment_request_status;
  v_expires timestamptz;
  v_token text;
begin
  if jsonb_typeof(p_payload) is distinct from 'object'
     or (p_payload ->> 'group_id') is null
     or (p_payload ->> 'group_id') !~ '^[0-9a-f-]{36}$'
     or (p_payload ->> 'price_id') is null
     or (p_payload ->> 'price_id') !~ '^[0-9a-f-]{36}$' then
    raise exception 'invalid' using errcode = 'P0001';
  end if;
  if v_name is null or char_length(v_name) not between 1 and 120
     or v_email is null or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or char_length(v_email) > 254
     or coalesce(p_payload ->> 'payment_method', 'stripe') not in ('stripe', 'transfer') then
    raise exception 'invalid' using errcode = 'P0001';
  end if;
  if coalesce((p_payload ->> 'terms')::boolean, false) is not true then
    raise exception 'terms_required' using errcode = 'P0001';
  end if;
  v_method := coalesce(p_payload ->> 'payment_method', 'stripe')::public.payment_method;

  -- Bloquea el grupo: la última plaza no se reserva dos veces.
  select * into v_group from public.groups g where g.id = (p_payload ->> 'group_id')::uuid for update;
  if v_group.id is null or not public.group_is_bookable(v_group.id) then
    raise exception 'not_available' using errcode = 'P0001';
  end if;

  select gp.id, gp.kind, gp.amount_cents into v_price
  from public.group_prices(v_group.id) gp where gp.id = (p_payload ->> 'price_id')::uuid;
  if v_price.id is null or v_price.amount_cents <= 0 then
    raise exception 'price_invalid' using errcode = 'P0001';
  end if;

  select p.audience into v_audience from public.programs p where p.id = v_group.program_id;
  v_minor := v_audience = 'kids';
  if v_minor then
    if v_guardian is null then
      raise exception 'guardian_required' using errcode = 'P0001';
    end if;
    if coalesce((p_payload ->> 'consent')::boolean, false) is not true then
      raise exception 'consent_required' using errcode = 'P0001';
    end if;
    select t.id into v_consent_text from public.consent_texts t
    where t.kind = 'minor_data' and t.effective_from <= public.school_today()
    order by t.effective_from desc, t.created_at desc limit 1;
    if v_consent_text is null then
      raise exception 'consent_text_missing' using errcode = 'P0001';
    end if;
  end if;

  -- La misma persona con una reserva viva (o en lista de espera) en el grupo: se devuelve esa.
  select * into v_existing from public.enrollment_requests r
  where r.group_id = v_group.id and r.email = v_email and lower(r.full_name) = lower(v_name)
    and (r.status = 'waitlist' or (r.status = 'pending_payment' and r.expires_at > now()))
  order by r.created_at desc limit 1;
  if v_existing.id is not null then
    return jsonb_build_object('token', v_existing.token, 'status', v_existing.status);
  end if;

  if (select count(*) from public.enrollment_requests r where r.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if public.group_seats_taken(v_group.id) >= v_group.capacity then
    v_status := 'waitlist';
    v_expires := null;
  else
    v_status := 'pending_payment';
    v_expires := now() + case when v_method = 'transfer' then interval '5 days' else interval '30 minutes' end;
  end if;

  insert into public.enrollment_requests (
    group_id, price_id, price_kind, amount_cents, full_name, email, phone, birth_date, is_minor,
    guardian_name, guardian_relationship, consent_text_id, message, site_locale, payment_method, status, expires_at
  ) values (
    v_group.id, v_price.id, v_price.kind, v_price.amount_cents, v_name, v_email,
    nullif(btrim(p_payload ->> 'phone'), ''),
    nullif(p_payload ->> 'birth_date', '')::date,
    v_minor,
    case when v_minor then v_guardian end,
    case when v_minor then coalesce(nullif(p_payload ->> 'guardian_relationship', ''), 'parent') end,
    v_consent_text,
    nullif(btrim(p_payload ->> 'message'), ''),
    coalesce(nullif(p_payload ->> 'locale', ''), 'es'),
    v_method, v_status, v_expires
  )
  returning token into v_token;

  return jsonb_build_object('token', v_token, 'status', v_status);
end;
$$;

comment on function public.submit_enrollment_request(jsonb) is
  'Entrada de prematrículas desde la web (anon): valida, toma el precio de la base, reserva plaza o apunta en lista de espera.';
revoke execute on function public.submit_enrollment_request(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.submit_enrollment_request(jsonb) to anon, authenticated;

-- Estado de una prematrícula por su token (página de pago de la web).
create function public.get_enrollment_request(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'reference', 'SP-' || upper(substr(replace(r.id::text, '-', ''), 1, 8)),
    'status', case when r.status = 'pending_payment' and r.expires_at <= now() then 'expired' else r.status::text end,
    'payment_method', r.payment_method,
    'amount_cents', r.amount_cents,
    'price_kind', r.price_kind,
    'expires_at', r.expires_at,
    'full_name', r.full_name,
    'email', r.email,
    'is_minor', r.is_minor,
    'locale', r.site_locale,
    'group_id', g.id,
    'edition_id', g.edition_id,
    'group_name', g.name,
    'program_name_es', p.name_es,
    'program_name_en', p.name_en,
    'starts_on', e.starts_on,
    'schedule_es', e.schedule_es,
    'schedule_en', e.schedule_en
  )
  from public.enrollment_requests r
  join public.groups g on g.id = r.group_id
  join public.programs p on p.id = g.program_id
  left join public.program_editions e on e.id = g.edition_id
  where p_token ~ '^[0-9a-f]{64}$' and r.token = p_token;
$$;

comment on function public.get_enrollment_request(text) is 'Resumen de una prematrícula por su token secreto (página de pago de la web).';
revoke execute on function public.get_enrollment_request(text) from public, anon, authenticated, service_role;
grant execute on function public.get_enrollment_request(text) to anon, authenticated;

-- La persona cambia la forma de pago de su reserva viva (tarjeta ↔ transferencia). La reserva
-- nunca dura más de 2 horas (tarjeta) o 5 días (transferencia) desde que se hizo.
create function public.set_enrollment_request_method(p_token text, p_method text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.enrollment_requests%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' or p_method is null or p_method not in ('stripe', 'transfer') then
    raise exception 'invalid' using errcode = 'P0001';
  end if;
  select * into v_req from public.enrollment_requests r where r.token = p_token for update;
  if v_req.id is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_req.status <> 'pending_payment' or v_req.expires_at <= now() then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  update public.enrollment_requests r
  set payment_method = p_method::public.payment_method,
      expires_at = case
        when p_method = 'transfer' then v_req.hold_started_at + interval '5 days'
        -- Tarjeta: margen para terminar el pago ya empezado, con tope.
        else least(greatest(v_req.expires_at, now() + interval '35 minutes'), v_req.hold_started_at + interval '2 hours')
      end
  where r.id = v_req.id;
  return public.get_enrollment_request(p_token);
end;
$$;

revoke execute on function public.set_enrollment_request_method(text, text) from public, anon, authenticated, service_role;
grant execute on function public.set_enrollment_request_method(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Confirmar una prematrícula pagada
-- ---------------------------------------------------------------------------
-- p_payment: method, amount_cents, currency, reference, stripe_session_id, payment_intent_id, note.
-- Idempotente: confirmar dos veces devuelve la misma matrícula y no duplica el pago.
create function public.confirm_enrollment_request_internal(p_request_id uuid, p_payment jsonb, p_skip_capacity boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.enrollment_requests%rowtype;
  v_group public.groups%rowtype;
  v_audience public.audience_segment;
  v_student_id uuid;
  v_guardian_id uuid;
  v_enrollment_id uuid;
  v_method public.payment_method := coalesce(nullif(p_payment ->> 'method', ''), 'stripe')::public.payment_method;
  v_amount integer := coalesce(nullif(p_payment ->> 'amount_cents', '')::integer, 0);
  v_terms text;
  v_new_student boolean;
begin
  select * into v_req from public.enrollment_requests r where r.id = p_request_id for update;
  if v_req.id is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if v_req.status = 'converted' then
    return jsonb_build_object(
      'enrollment_id', v_req.enrollment_id, 'student_id', v_req.student_id, 'already', true,
      'email', v_req.email, 'full_name', v_req.full_name, 'is_minor', v_req.is_minor, 'locale', v_req.site_locale);
  end if;
  if v_req.status = 'cancelled' and not p_skip_capacity then
    raise exception 'not_available' using errcode = 'P0001';
  end if;

  select * into v_group from public.groups g where g.id = v_req.group_id for update;
  select p.audience into v_audience from public.programs p where p.id = v_group.program_id;

  -- Alumno adulto que ya existe (misma cuenta por correo, o misma ficha por correo y nombre): se reutiliza.
  if not v_req.is_minor then
    select s.id into v_student_id
    from public.students s
    left join public.profiles pr on pr.id = s.profile_id
    left join public.student_private sp on sp.student_id = s.id
    where s.status = 'active' and not s.is_minor
      and (lower(pr.email) = v_req.email
        or (lower(sp.email) = v_req.email and lower(s.full_name) = lower(v_req.full_name)))
    order by (pr.id is null), s.created_at
    limit 1;
  end if;
  v_new_student := v_student_id is null;

  -- Si no, se crea la ficha (la cuenta, si procede, la enlaza después el servidor del portal).
  if v_new_student then
    insert into public.students (full_name, audience, preferred_locale, created_by)
    values (v_req.full_name, v_audience, v_req.site_locale, (select auth.uid()))
    returning id into v_student_id;

    insert into public.student_private (student_id, email, phone, birth_year, birth_date)
    values (
      v_student_id,
      case when v_req.is_minor then null else v_req.email end,
      case when v_req.is_minor then null else v_req.phone end,
      extract(year from v_req.birth_date)::smallint,
      v_req.birth_date
    );
  end if;

  if v_req.is_minor then
    select g.id into v_guardian_id from public.guardians g where lower(g.email) = v_req.email order by g.created_at limit 1;
    if v_guardian_id is null then
      insert into public.guardians (full_name, email, phone, preferred_locale)
      values (v_req.guardian_name, v_req.email, v_req.phone, v_req.site_locale)
      returning id into v_guardian_id;
    end if;
    insert into public.student_guardians (student_id, guardian_id, relationship)
    values (v_student_id, v_guardian_id, coalesce(v_req.guardian_relationship, 'parent'));
    insert into public.consents (student_id, guardian_id, text_id, kind, granted, method)
    values (v_student_id, v_guardian_id, v_req.consent_text_id, 'minor_data', true, 'web_form');
  end if;

  -- Términos de matrícula: se registra la aceptación si hay un texto vigente de ese tipo.
  select t.id into v_terms from public.consent_texts t
  where t.kind = 'enrolment_terms' and t.effective_from <= public.school_today()
  order by t.effective_from desc, t.created_at desc limit 1;
  if v_terms is not null then
    insert into public.consents (student_id, guardian_id, text_id, kind, granted, method)
    values (v_student_id, v_guardian_id, v_terms, 'enrolment_terms', true, 'web_form');
  end if;

  -- Si ya tiene plaza en este grupo (pagó dos veces o se matriculó a mano), el pago va a esa matrícula.
  select e.id into v_enrollment_id from public.enrollments e
  where e.student_id = v_student_id and e.group_id = v_req.group_id and e.status in ('pending', 'active', 'paused');
  if v_enrollment_id is null then
    perform set_config('spanglish.confirming_request', v_req.id::text, true);
    perform set_config('spanglish.skip_capacity', case when p_skip_capacity then 'on' else 'off' end, true);
    insert into public.enrollments (student_id, group_id, status, billing_mode, price_id, agreed_amount_cents, starts_on)
    values (
      v_student_id, v_req.group_id, 'active',
      case v_req.price_kind when 'upfront' then 'upfront' when 'pack' then 'pack' else 'payg' end::public.billing_mode,
      v_req.price_id, v_req.amount_cents, public.school_today()
    )
    returning id into v_enrollment_id;
    perform set_config('spanglish.confirming_request', '', true);
    perform set_config('spanglish.skip_capacity', 'off', true);
  end if;

  if v_amount > 0 then
    insert into public.enrollment_payments (
      enrollment_id, student_id, method, amount_cents, currency, reference, stripe_session_id, payment_intent_id, note
    ) values (
      v_enrollment_id, v_student_id, v_method, v_amount,
      lower(coalesce(nullif(p_payment ->> 'currency', ''), 'aud')),
      nullif(btrim(p_payment ->> 'reference'), ''),
      case when v_method = 'stripe' then nullif(p_payment ->> 'stripe_session_id', '') end,
      case when v_method = 'stripe' then nullif(p_payment ->> 'payment_intent_id', '') end,
      nullif(btrim(p_payment ->> 'note'), '')
    );
  end if;

  update public.enrollment_requests r
  set status = 'converted', student_id = v_student_id, enrollment_id = v_enrollment_id, payment_method = case when v_method = 'stripe' then 'stripe' else 'transfer' end::public.payment_method
  where r.id = v_req.id;

  return jsonb_build_object(
    'enrollment_id', v_enrollment_id, 'student_id', v_student_id, 'already', false,
    'email', v_req.email, 'full_name', v_req.full_name, 'is_minor', v_req.is_minor, 'locale', v_req.site_locale);
end;
$$;

revoke execute on function public.confirm_enrollment_request_internal(uuid, jsonb, boolean) from public, anon, authenticated, service_role;

-- Servidor del portal (service_role), tras comprobar el pago con Stripe: el pago ya está hecho, no se rechaza por cupo.
create function public.confirm_enrollment_request(p_request_id uuid, p_payment jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.confirm_enrollment_request_internal(p_request_id, p_payment || jsonb_build_object('method', 'stripe'), true);
$$;

revoke execute on function public.confirm_enrollment_request(uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.confirm_enrollment_request(uuid, jsonb) to service_role;

-- Administradora: confirma con un pago manual (o sin pago: amount_cents = 0). Respeta el cupo.
create function public.admin_confirm_request(p_request_id uuid, p_payment jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if coalesce(p_payment ->> 'method', 'transfer') not in ('transfer', 'cash', 'eventbrite', 'other') then
    raise exception 'invalid' using errcode = 'P0001';
  end if;
  return public.confirm_enrollment_request_internal(
    p_request_id, jsonb_build_object('method', 'transfer') || coalesce(p_payment, '{}'::jsonb), false);
end;
$$;

revoke execute on function public.admin_confirm_request(uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.admin_confirm_request(uuid, jsonb) to authenticated;

-- Administradora: 'cancel' (libera la plaza) u 'offer' (lista de espera o caducada → plaza reservada 5 días).
create function public.admin_update_request(p_request_id uuid, p_action text)
returns public.enrollment_request_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.enrollment_requests%rowtype;
  v_group public.groups%rowtype;
begin
  if not public.has_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_req from public.enrollment_requests r where r.id = p_request_id for update;
  if v_req.id is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_req.status = 'converted' then
    raise exception 'not_available' using errcode = 'P0001';
  end if;

  if p_action = 'cancel' then
    update public.enrollment_requests r set status = 'cancelled', expires_at = null where r.id = v_req.id;
    return 'cancelled';
  elsif p_action = 'offer' then
    select * into v_group from public.groups g where g.id = v_req.group_id for update;
    if v_group.status not in ('draft', 'active') then
      raise exception 'group_closed' using errcode = 'P0001';
    end if;
    if public.group_seats_taken(v_group.id, v_req.id) >= v_group.capacity then
      raise exception 'group_full' using errcode = 'P0001';
    end if;
    update public.enrollment_requests r
    set status = 'pending_payment', hold_started_at = now(), expires_at = now() + interval '5 days', payment_method = 'transfer'
    where r.id = v_req.id;
    return 'pending_payment';
  end if;
  raise exception 'invalid' using errcode = 'P0001';
end;
$$;

revoke execute on function public.admin_update_request(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.admin_update_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Auditoría (las prematrículas no: el registro copiaría el token del enlace de pago)
-- ---------------------------------------------------------------------------
select public.enable_audit('public.groups');
select public.enable_audit('public.enrollments');
select public.enable_audit('public.enrollment_payments');

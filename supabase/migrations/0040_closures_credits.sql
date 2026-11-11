-- 0040_closures_credits.sql
-- Cierres (festivos y días sin clase) y packs de clases con saldo.
--
-- Cierres
--   * closures: rango de fechas, global o de una sede. generate_sessions() salta esos días y
--     add_closure() cancela, además, las clases futuras ya creadas que caen dentro (sin asistencia).
--   * Cualquier cuenta activa los lee (el calendario los muestra); solo administración los escribe.
--
-- Packs de clases
--   * credit_packs: N clases de un alumno (de un programa o de cualquiera), con inicio y caducidad
--     opcional. Una matrícula "pack" con precio de pack crea su pack sola (trigger).
--   * credit_movements: libro de movimientos, solo se agrega (nunca se edita ni se borra). El saldo
--     de un pack es lessons_total + suma de movimientos (vista credit_pack_balances).
--   * Asistencia: marcar presente, tarde o falta a un alumno con matrícula "pack" descuenta una clase
--     del pack que caduque antes (sin pack con saldo queda "sin cobertura" y la asistencia se guarda igual).
--     Cambiar a justificada, o quitar la marca, devuelve la clase.

-- ---------------------------------------------------------------------------
-- Cierres
-- ---------------------------------------------------------------------------
create table public.closures (
  id uuid primary key default gen_random_uuid(),
  starts_on date not null,
  ends_on date not null,
  location_id uuid references public.locations (id) on delete cascade,
  reason_es text check (char_length(reason_es) <= 200),
  reason_en text check (char_length(reason_en) <= 200),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint closures_dates check (ends_on >= starts_on)
);

comment on table public.closures is 'Cierres de la escuela (festivos): global o de una sede; no se generan clases esos días.';
create index closures_dates_idx on public.closures (starts_on, ends_on);
create index closures_location_id_idx on public.closures (location_id);
create index closures_created_by_idx on public.closures (created_by);

alter table public.closures enable row level security;
revoke all on table public.closures from anon, authenticated;
grant select, insert, update, delete on table public.closures to authenticated;
create policy closures_select on public.closures for select to authenticated using ((select public.is_active()));
create policy closures_write_admin on public.closures for all to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));
select public.enable_audit('public.closures');

-- Crea el cierre y cancela las clases futuras (sin asistencia) que caen dentro. Devuelve cuántas canceló.
create function public.add_closure(p_starts_on date, p_ends_on date, p_location_id uuid, p_reason_es text, p_reason_en text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cancelled integer;
begin
  if not public.has_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_starts_on is null or p_ends_on is null or p_ends_on < p_starts_on then
    raise exception 'invalid_range' using errcode = 'P0001';
  end if;

  insert into public.closures (starts_on, ends_on, location_id, reason_es, reason_en)
  values (p_starts_on, p_ends_on, p_location_id, nullif(btrim(p_reason_es), ''), nullif(btrim(p_reason_en), ''));

  update public.sessions s
  set status = 'cancelled',
      cancel_reason = left(coalesce(nullif(btrim(p_reason_es), ''), nullif(btrim(p_reason_en), ''), 'Cierre'), 300)
  from public.groups g
  where g.id = s.group_id
    and s.status = 'scheduled'
    and s.starts_at > now()
    and (s.starts_at at time zone 'Australia/Brisbane')::date between p_starts_on and p_ends_on
    and (p_location_id is null or g.location_id = p_location_id)
    and not exists (select 1 from public.attendance a where a.session_id = s.id);
  get diagnostics v_cancelled = row_count;
  return v_cancelled;
end;
$$;

revoke execute on function public.add_closure(date, date, uuid, text, text) from public, anon, service_role;
grant execute on function public.add_closure(date, date, uuid, text, text) to authenticated;

-- generate_sessions: ahora salta los días de cierre (globales o de la sede del grupo).
create or replace function public.generate_sessions(p_group_id uuid, p_until date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group public.groups%rowtype;
  v_edition_end date;
  v_rule public.schedule_rules%rowtype;
  v_day date;
  v_last date;
  v_added integer := 0;
  v_rows integer;
begin
  if not public.has_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_group from public.groups g where g.id = p_group_id;
  if v_group.id is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_group.status not in ('draft', 'active') then
    raise exception 'group_closed' using errcode = 'P0001';
  end if;
  if p_until is null or p_until > public.school_today() + 366 then
    raise exception 'horizon_too_far' using errcode = 'P0001';
  end if;
  select e.ends_on into v_edition_end from public.program_editions e where e.id = v_group.edition_id;

  for v_rule in select * from public.schedule_rules r where r.group_id = p_group_id and r.active loop
    v_last := least(p_until, coalesce(v_rule.ends_on, p_until), coalesce(v_edition_end, p_until));
    v_day := greatest(v_rule.starts_on, public.school_today());
    v_day := v_day + ((v_rule.weekday - extract(isodow from v_day)::int + 7) % 7);
    while v_day <= v_last loop
      if not exists (
        select 1 from public.closures c
        where v_day between c.starts_on and c.ends_on
          and (c.location_id is null or c.location_id = v_group.location_id)
      ) then
        insert into public.sessions (group_id, rule_id, starts_at, ends_at, teacher_id)
        values (
          p_group_id, v_rule.id,
          public.school_ts(v_day, v_rule.start_time),
          public.school_ts(v_day, v_rule.start_time) + make_interval(mins => v_rule.duration_minutes),
          v_group.teacher_id
        )
        on conflict on constraint sessions_group_starts_unique do nothing;
        get diagnostics v_rows = row_count;
        v_added := v_added + v_rows;
      end if;
      v_day := v_day + 7 * v_rule.interval_weeks;
    end loop;
  end loop;
  return v_added;
end;
$$;

-- ---------------------------------------------------------------------------
-- Packs de clases
-- ---------------------------------------------------------------------------
create type public.credit_reason as enum ('attendance', 'attendance_reversal', 'adjustment');

create table public.credit_packs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id),
  program_id uuid references public.programs (id),
  enrollment_id uuid references public.enrollments (id) on delete set null,
  lessons_total smallint not null check (lessons_total between 1 and 200),
  starts_on date not null default public.school_today(),
  expires_on date,
  amount_cents integer check (amount_cents >= 0),
  note text check (char_length(note) <= 300),
  voided_at timestamptz,
  voided_reason text check (char_length(voided_reason) <= 300),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_packs_dates check (expires_on is null or expires_on >= starts_on)
);

comment on table public.credit_packs is 'Packs de clases de un alumno (de un programa o de cualquiera); el saldo sale del libro de movimientos.';
create index credit_packs_student_idx on public.credit_packs (student_id);
create index credit_packs_program_idx on public.credit_packs (program_id);
create index credit_packs_enrollment_idx on public.credit_packs (enrollment_id);
create index credit_packs_created_by_idx on public.credit_packs (created_by);
create trigger credit_packs_touch_updated_at before update on public.credit_packs
  for each row execute function public.touch_updated_at();

create table public.credit_movements (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.credit_packs (id),
  student_id uuid not null references public.students (id),
  delta smallint not null check (delta <> 0 and delta between -100 and 100),
  reason public.credit_reason not null,
  -- Sin clave foránea a propósito: el libro es de solo agregar y una FK con "set null" lo editaría.
  attendance_id uuid,
  note text check (char_length(note) <= 300),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

comment on table public.credit_movements is 'Libro de movimientos de packs (solo se agrega): asistencia, devoluciones y ajustes.';
create index credit_movements_pack_idx on public.credit_movements (pack_id);
create index credit_movements_student_idx on public.credit_movements (student_id);
create index credit_movements_created_by_idx on public.credit_movements (created_by);
create trigger credit_movements_append_only before update or delete on public.credit_movements
  for each row execute function public.reject_mutation();

create view public.credit_pack_balances with (security_invoker = true) as
  select
    p.id as pack_id,
    p.student_id,
    p.program_id,
    p.lessons_total,
    p.starts_on,
    p.expires_on,
    p.voided_at,
    p.note,
    (p.lessons_total + coalesce(sum(m.delta), 0))::integer as remaining,
    (p.expires_on is not null and p.expires_on < public.school_today()) as is_expired
  from public.credit_packs p
  left join public.credit_movements m on m.pack_id = p.id
  group by p.id;

alter table public.credit_packs enable row level security;
alter table public.credit_movements enable row level security;
revoke all on table public.credit_packs, public.credit_movements from anon, authenticated;
revoke all on table public.credit_pack_balances from anon, authenticated;
grant select, insert, update on table public.credit_packs to authenticated;
grant select, insert on table public.credit_movements to authenticated;
grant select on table public.credit_pack_balances to authenticated;

create policy credit_packs_select on public.credit_packs for select to authenticated
  using (
    (select public.has_role('admin'))
    or ((select public.is_active()) and (
      student_id in (select public.current_student_ids()) or student_id in (select public.guarded_student_ids())
    ))
  );
create policy credit_packs_write_admin on public.credit_packs for insert to authenticated
  with check ((select public.has_role('admin')));
create policy credit_packs_update_admin on public.credit_packs for update to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));

create policy credit_movements_select on public.credit_movements for select to authenticated
  using (
    (select public.has_role('admin'))
    or ((select public.is_active()) and (
      student_id in (select public.current_student_ids()) or student_id in (select public.guarded_student_ids())
    ))
  );
-- Administración solo agrega ajustes; los movimientos de asistencia los escribe la base.
create policy credit_movements_insert_admin on public.credit_movements for insert to authenticated
  with check ((select public.has_role('admin')) and reason = 'adjustment');

select public.enable_audit('public.credit_packs');
select public.enable_audit('public.credit_movements');

-- Una matrícula "pack" con un precio de pack crea su pack de clases.
create function public.enrollments_create_pack()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.billing_mode = 'pack' and new.price_id is not null then
    insert into public.credit_packs (student_id, program_id, enrollment_id, lessons_total, amount_cents, created_by)
    select new.student_id, g.program_id, new.id, pp.lessons_included, new.agreed_amount_cents, new.created_by
    from public.program_prices pp
    join public.groups g on g.id = new.group_id
    where pp.id = new.price_id and pp.lessons_included is not null;
  end if;
  return null;
end;
$$;

revoke execute on function public.enrollments_create_pack() from public, anon, authenticated, service_role;
create trigger enrollments_create_pack after insert on public.enrollments
  for each row execute function public.enrollments_create_pack();

-- ---------------------------------------------------------------------------
-- Asistencia: cobro del pack
-- ---------------------------------------------------------------------------
alter table public.attendance
  add column charge_status text not null default 'not_applicable' check (charge_status in ('not_applicable', 'charged', 'uncovered')),
  add column credit_pack_id uuid references public.credit_packs (id);
create index attendance_credit_pack_idx on public.attendance (credit_pack_id);

create function public.attendance_charge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.attendance%rowtype;
  v_chargeable boolean;
  v_pack uuid;
  v_day date;
  v_program uuid;
begin
  -- Devolución: la marca se quitó, o pasó a justificada, y tenía cargo.
  if tg_op = 'DELETE' then
    if old.charge_status = 'charged' and old.credit_pack_id is not null then
      insert into public.credit_movements (pack_id, student_id, delta, reason, attendance_id, created_by)
      values (old.credit_pack_id, old.student_id, 1, 'attendance_reversal', old.id, null);
    end if;
    return null;
  end if;

  v_row := new;
  v_chargeable := v_row.status in ('present', 'late', 'absent')
    and exists (
      select 1 from public.sessions s
      join public.enrollments e on e.group_id = s.group_id and e.student_id = v_row.student_id
        and e.billing_mode = 'pack' and e.status in ('active', 'paused', 'completed')
      where s.id = v_row.session_id
    );

  if v_row.charge_status = 'charged' and not v_chargeable then
    insert into public.credit_movements (pack_id, student_id, delta, reason, attendance_id, created_by)
    values (v_row.credit_pack_id, v_row.student_id, 1, 'attendance_reversal', v_row.id, null);
    update public.attendance set charge_status = 'not_applicable', credit_pack_id = null where id = v_row.id;
    return null;
  end if;

  if v_chargeable and v_row.charge_status <> 'charged' then
    select (s.starts_at at time zone 'Australia/Brisbane')::date, g.program_id into v_day, v_program
    from public.sessions s join public.groups g on g.id = s.group_id where s.id = v_row.session_id;

    select b.pack_id into v_pack
    from public.credit_pack_balances_internal(v_row.student_id) b
    where b.voided_at is null
      and b.starts_on <= v_day
      and (b.expires_on is null or b.expires_on >= v_day)
      and b.remaining > 0
      and (b.program_id is null or b.program_id = v_program)
    order by b.expires_on nulls last, b.created_at
    limit 1;

    if v_pack is null then
      update public.attendance set charge_status = 'uncovered', credit_pack_id = null where id = v_row.id;
    else
      insert into public.credit_movements (pack_id, student_id, delta, reason, attendance_id, created_by)
      values (v_pack, v_row.student_id, -1, 'attendance', v_row.id, null);
      update public.attendance set charge_status = 'charged', credit_pack_id = v_pack where id = v_row.id;
    end if;
  end if;
  return null;
end;
$$;

-- Packs de un alumno con su saldo, sin pasar por RLS (para el trigger); el más antiguo primero a igual caducidad.
create function public.credit_pack_balances_internal(p_student_id uuid)
returns table (pack_id uuid, program_id uuid, starts_on date, expires_on date, voided_at timestamptz, created_at timestamptz, remaining integer)
language sql
volatile
security definer
set search_path = ''
as $$
  select p.id, p.program_id, p.starts_on, p.expires_on, p.voided_at, p.created_at,
         (p.lessons_total + coalesce((select sum(m.delta) from public.credit_movements m where m.pack_id = p.id), 0))::integer
  from public.credit_packs p
  where p.student_id = p_student_id
  for update of p;
$$;

revoke execute on function public.attendance_charge() from public, anon, authenticated, service_role;
revoke execute on function public.credit_pack_balances_internal(uuid) from public, anon, authenticated, service_role;
create trigger attendance_charge after insert or update of status or delete on public.attendance
  for each row execute function public.attendance_charge();

-- La lista de la clase ahora dice también si la marca quedó sin cobertura (alumno con pack sin saldo).
drop function public.session_roster(uuid);
create function public.session_roster(p_session_id uuid)
returns table (student_id uuid, full_name text, attendance_id uuid, status public.attendance_status, note text, charge_status text)
language sql
stable
security invoker
set search_path = ''
as $$
  select st.id, st.full_name, a.id, a.status, a.note, a.charge_status
  from public.sessions s
  join public.enrollments e on e.group_id = s.group_id
    and e.status in ('active', 'paused', 'completed')
    and e.starts_on <= (s.starts_at at time zone 'Australia/Brisbane')::date
    and (e.ends_on is null or e.ends_on >= (s.starts_at at time zone 'Australia/Brisbane')::date)
  join public.students st on st.id = e.student_id
  left join public.attendance a on a.session_id = s.id and a.student_id = st.id
  where s.id = p_session_id
  order by st.full_name;
$$;

revoke execute on function public.session_roster(uuid) from public, anon, service_role;
grant execute on function public.session_roster(uuid) to authenticated;

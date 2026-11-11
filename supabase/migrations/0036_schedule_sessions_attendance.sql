-- 0036_schedule_sessions_attendance.sql
-- Clases: reglas de horario que generan sesiones concretas, y asistencia por sesión.
--
--   * schedule_rules: día de la semana + hora + duración de un grupo (hora de Australia/Brisbane,
--     que no usa horario de verano: 18:00 son siempre las 08:00 UTC).
--   * sessions: cada clase concreta. generate_sessions() las crea desde las reglas (administración);
--     repetirla no duplica nada (unique group_id + starts_at). Cancelar una clase la conserva.
--   * attendance: marca por alumno y sesión. La docente marca desde 30 minutos antes de la clase
--     hasta 14 días después; administración, sin límite. Marcar completa la sesión.
--   * Lectura: administración todo; docente sus grupos; alumno y tutor los grupos donde están matriculados.

create type public.session_status as enum ('scheduled', 'completed', 'cancelled');
create type public.attendance_status as enum ('present', 'late', 'absent', 'excused');

create function public.school_ts(p_date date, p_time time)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select (p_date + p_time) at time zone 'Australia/Brisbane';
$$;

revoke execute on function public.school_ts(date, time) from public, anon, service_role;
grant execute on function public.school_ts(date, time) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table public.schedule_rules (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  duration_minutes smallint not null default 70 check (duration_minutes between 15 and 240),
  interval_weeks smallint not null default 1 check (interval_weeks between 1 and 4),
  starts_on date not null,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_rules_dates check (ends_on is null or ends_on >= starts_on)
);

comment on table public.schedule_rules is 'Horario semanal de un grupo (ISO: 1 lunes … 7 domingo); genera sesiones.';
create index schedule_rules_group_id_idx on public.schedule_rules (group_id);
create trigger schedule_rules_touch_updated_at before update on public.schedule_rules
  for each row execute function public.touch_updated_at();

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  rule_id uuid references public.schedule_rules (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  teacher_id uuid references public.profiles (id) on delete set null,
  status public.session_status not null default 'scheduled',
  topic text check (char_length(topic) <= 200),
  teacher_notes text check (char_length(teacher_notes) <= 2000),
  cancel_reason text check (char_length(cancel_reason) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_group_starts_unique unique (group_id, starts_at),
  constraint sessions_times check (ends_at > starts_at and ends_at <= starts_at + interval '6 hours')
);

comment on table public.sessions is 'Clases concretas de un grupo (generadas desde las reglas o sueltas).';
create index sessions_rule_id_idx on public.sessions (rule_id);
create index sessions_teacher_id_idx on public.sessions (teacher_id, starts_at);
create index sessions_starts_at_idx on public.sessions (starts_at);
create trigger sessions_touch_updated_at before update on public.sessions
  for each row execute function public.touch_updated_at();

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  student_id uuid not null references public.students (id),
  status public.attendance_status not null,
  note text check (char_length(note) <= 500),
  marked_by uuid references public.profiles (id) on delete set null default auth.uid(),
  marked_at timestamptz not null default now(),
  constraint attendance_session_student_unique unique (session_id, student_id)
);

comment on table public.attendance is 'Asistencia por alumno y sesión.';
create index attendance_student_id_idx on public.attendance (student_id);
create index attendance_marked_by_idx on public.attendance (marked_by);

-- ---------------------------------------------------------------------------
-- Acceso
-- ---------------------------------------------------------------------------
create function public.teaches_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('teacher')
     and exists (
       select 1 from public.sessions s join public.groups g on g.id = s.group_id
       where s.id = p_session_id
         and (s.teacher_id = (select auth.uid()) or g.teacher_id = (select auth.uid()))
     );
$$;

revoke execute on function public.teaches_session(uuid) from public, anon, service_role;
grant execute on function public.teaches_session(uuid) to authenticated;

-- Lista de la clase: matriculadas (pending no cuenta) con su marca, si la hay.
create function public.session_roster(p_session_id uuid)
returns table (student_id uuid, full_name text, attendance_id uuid, status public.attendance_status, note text)
language sql
stable
security invoker
set search_path = ''
as $$
  select st.id, st.full_name, a.id, a.status, a.note
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

-- ---------------------------------------------------------------------------
-- Asistencia: ventana, lista y sesión completada
-- ---------------------------------------------------------------------------
create function public.attendance_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.sessions%rowtype;
  -- Sin usuario (postgres, service_role) o administración: sin ventana.
  v_is_admin boolean := (select auth.uid()) is null or public.user_has_role((select auth.uid()), 'admin');
begin
  select * into v_session from public.sessions s where s.id = new.session_id;
  if v_session.id is null or v_session.status = 'cancelled' then
    raise exception 'session_not_editable' using errcode = 'P0001';
  end if;
  if not v_is_admin and not (now() between v_session.starts_at - interval '30 minutes' and v_session.starts_at + interval '14 days') then
    raise exception 'outside_attendance_window' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' and not exists (
    select 1 from public.session_roster_internal(new.session_id) r where r = new.student_id
  ) then
    raise exception 'not_in_roster' using errcode = 'P0001';
  end if;
  new.marked_by := coalesce((select auth.uid()), new.marked_by);
  new.marked_at := now();
  return new;
end;
$$;

-- Versión interna (sin RLS) de la lista: solo los ids, para el trigger.
create function public.session_roster_internal(p_session_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.student_id
  from public.sessions s
  join public.enrollments e on e.group_id = s.group_id
    and e.status in ('active', 'paused', 'completed')
    and e.starts_on <= (s.starts_at at time zone 'Australia/Brisbane')::date
    and (e.ends_on is null or e.ends_on >= (s.starts_at at time zone 'Australia/Brisbane')::date)
  where s.id = p_session_id;
$$;

revoke execute on function public.session_roster_internal(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.attendance_before_write() from public, anon, authenticated, service_role;
create trigger attendance_before_write before insert or update of status on public.attendance
  for each row execute function public.attendance_before_write();

create function public.attendance_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sessions set status = 'completed' where id = new.session_id and status = 'scheduled';
  return null;
end;
$$;

revoke execute on function public.attendance_after_write() from public, anon, authenticated, service_role;
create trigger attendance_after_write after insert on public.attendance
  for each row execute function public.attendance_after_write();

-- ---------------------------------------------------------------------------
-- Generar sesiones desde las reglas (administración)
-- ---------------------------------------------------------------------------
create function public.generate_sessions(p_group_id uuid, p_until date)
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
      v_day := v_day + 7 * v_rule.interval_weeks;
    end loop;
  end loop;
  return v_added;
end;
$$;

revoke execute on function public.generate_sessions(uuid, date) from public, anon, service_role;
grant execute on function public.generate_sessions(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS y privilegios
-- ---------------------------------------------------------------------------
alter table public.schedule_rules enable row level security;
alter table public.sessions enable row level security;
alter table public.attendance enable row level security;

revoke all on table public.schedule_rules, public.sessions, public.attendance from anon, authenticated;
grant select, insert, update, delete on table public.schedule_rules to authenticated;
grant select, insert, delete on table public.sessions to authenticated;
grant update (rule_id, starts_at, ends_at, teacher_id, status, topic, teacher_notes, cancel_reason) on table public.sessions to authenticated;
grant select, insert, delete on table public.attendance to authenticated;
grant update (status, note) on table public.attendance to authenticated;

create policy schedule_rules_select on public.schedule_rules for select to authenticated
  using ((select public.has_role('admin')) or (select public.teaches_group(group_id)) or ((select public.is_active()) and group_id in (select public.my_group_ids())));
create policy schedule_rules_write_admin on public.schedule_rules for all to authenticated
  using ((select public.has_role('admin'))) with check ((select public.has_role('admin')));

create policy sessions_select on public.sessions for select to authenticated
  using ((select public.has_role('admin')) or (select public.teaches_session(id)) or ((select public.is_active()) and group_id in (select public.my_group_ids())));
create policy sessions_insert_admin on public.sessions for insert to authenticated
  with check ((select public.has_role('admin')));
create policy sessions_update on public.sessions for update to authenticated
  using ((select public.has_role('admin')) or (select public.teaches_session(id)))
  with check ((select public.has_role('admin')) or (select public.teaches_session(id)));
create policy sessions_delete_admin on public.sessions for delete to authenticated
  using ((select public.has_role('admin')));

create policy attendance_select on public.attendance for select to authenticated
  using (
    (select public.has_role('admin'))
    or (select public.teaches_session(session_id))
    or ((select public.is_active()) and (
      student_id in (select public.current_student_ids()) or student_id in (select public.guarded_student_ids())
    ))
  );
create policy attendance_insert on public.attendance for insert to authenticated
  with check ((select public.has_role('admin')) or (select public.teaches_session(session_id)));
create policy attendance_update on public.attendance for update to authenticated
  using ((select public.has_role('admin')) or (select public.teaches_session(session_id)))
  with check ((select public.has_role('admin')) or (select public.teaches_session(session_id)));
create policy attendance_delete on public.attendance for delete to authenticated
  using ((select public.has_role('admin')) or (select public.teaches_session(session_id)));

-- La docente lee la ficha (nombre y nivel; nunca el contacto) de los alumnos de sus grupos.
drop policy students_select on public.students;
create policy students_select on public.students for select to authenticated
  using (
    (select public.has_role('admin'))
    or id in (select public.current_student_ids())
    or id in (select public.guarded_student_ids())
    or id in (select public.taught_student_ids())
  );

select public.enable_audit('public.schedule_rules');
select public.enable_audit('public.sessions');
select public.enable_audit('public.attendance');

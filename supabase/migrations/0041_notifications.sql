-- Avisos dentro del portal y recordatorios automáticos.
--
-- Cada aviso es una fila de `notifications` dirigida a UN perfil (alumno, tutor, docente o admin).
-- Los avisos los crean disparadores (cambio de clase, tareas, notas, clase cancelada) y una función
-- de recordatorios (`generate_reminders`) que se programa cada hora con pg_cron. La persona solo
-- puede leerlos y marcarlos como leídos; nadie crea avisos desde el navegador.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 40),
  title_es text not null check (char_length(title_es) between 1 and 160),
  title_en text not null check (char_length(title_en) between 1 and 160),
  body_es text check (char_length(body_es) <= 400),
  body_en text check (char_length(body_en) <= 400),
  -- Ruta dentro de la zona de quien lo recibe, sin idioma: "student/assignments".
  link text check (char_length(link) <= 200),
  dedupe_key text check (char_length(dedupe_key) <= 120),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'Avisos del portal para un perfil. Solo lectura y marcar como leído desde el navegador.';
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;
create unique index notifications_dedupe_unique on public.notifications (user_id, dedupe_key) where dedupe_key is not null;

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Ayudantes internos (no ejecutables desde el navegador)
-- ---------------------------------------------------------------------------

-- Perfiles que reciben los avisos de un alumno: la propia cuenta del alumno y las de sus tutores.
create function public.student_recipients(p_student_id uuid)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select s.profile_id from public.students s where s.id = p_student_id and s.profile_id is not null
  union
  select g.profile_id
  from public.student_guardians sg
  join public.guardians g on g.id = sg.guardian_id
  where sg.student_id = p_student_id and g.profile_id is not null;
$$;

create function public.notify(
  p_users uuid[], p_kind text, p_title_es text, p_title_en text,
  p_body_es text, p_body_en text, p_link text, p_dedupe text
)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, kind, title_es, title_en, body_es, body_en, link, dedupe_key)
  select distinct u, p_kind, p_title_es, p_title_en, p_body_es, p_body_en, p_link, p_dedupe
  from unnest(p_users) as u
  where u is not null
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
$$;

revoke all on function public.student_recipients(uuid) from public, anon, authenticated;
revoke all on function public.notify(uuid[], text, text, text, text, text, text, text) from public, anon, authenticated;

-- Fecha y hora de la escuela para los textos de los avisos.
create function public.notice_when(p_at timestamptz)
returns text
language sql stable set search_path = ''
as $$ select to_char(p_at at time zone 'Australia/Brisbane', 'DD/MM HH24:MI') $$;
revoke all on function public.notice_when(timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Disparadores
-- ---------------------------------------------------------------------------

-- Cambios de clase: aviso a la docente al crearse y al alumno/tutor al decidirse.
create function public.notify_change_request()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_teacher uuid;
  v_student text;
  v_group text;
  v_when timestamptz;
begin
  select coalesce(se.teacher_id, g.teacher_id), g.name, se.starts_at
    into v_teacher, v_group, v_when
  from public.sessions se join public.groups g on g.id = se.group_id
  where se.id = new.session_id;
  select full_name into v_student from public.students where id = new.student_id;

  if tg_op = 'INSERT' then
    perform public.notify(
      array[v_teacher], 'change_request',
      'Nuevo aviso de cambio de clase', 'New class change request',
      v_student || ' · ' || v_group || ' · ' || public.notice_when(v_when),
      v_student || ' · ' || v_group || ' · ' || public.notice_when(v_when),
      'teacher/requests', 'cr:' || new.id
    );
  elsif new.status in ('approved', 'declined') and old.status is distinct from new.status then
    perform public.notify(
      array(select public.student_recipients(new.student_id)), 'change_decided',
      case when new.status = 'approved' then 'Tu cambio de clase fue aprobado' else 'Tu cambio de clase fue rechazado' end,
      case when new.status = 'approved' then 'Your class change was approved' else 'Your class change was declined' end,
      v_group || ' · ' || public.notice_when(v_when) || coalesce(' · ' || new.response_note, ''),
      v_group || ' · ' || public.notice_when(v_when) || coalesce(' · ' || new.response_note, ''),
      'student/requests', 'crd:' || new.id
    );
  end if;
  return new;
end;
$$;
create trigger notify_change_request after insert or update of status on public.session_change_requests
  for each row execute function public.notify_change_request();

-- Tareas: al publicarse, aviso a los alumnos matriculados (y tutores).
create function public.notify_assignment_published()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_group text;
  r record;
begin
  if new.status <> 'published' or (tg_op = 'UPDATE' and old.status = 'published') then
    return new;
  end if;
  select name into v_group from public.groups where id = new.group_id;
  for r in select e.student_id from public.enrollments e where e.group_id = new.group_id and e.status = 'active' loop
    perform public.notify(
      array(select public.student_recipients(r.student_id)), 'assignment_new',
      'Nueva tarea: ' || new.title, 'New assignment: ' || new.title,
      v_group || coalesce(' · entrega ' || public.notice_when(new.due_at), ''),
      v_group || coalesce(' · due ' || public.notice_when(new.due_at), ''),
      'student/assignments', 'an:' || new.id || ':' || r.student_id
    );
  end loop;
  return new;
end;
$$;
create trigger notify_assignment_published after insert or update of status on public.assignments
  for each row execute function public.notify_assignment_published();

-- Entregas: aviso a la docente al entregar y al alumno/tutor al calificar.
create function public.notify_submission()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_title text;
  v_teacher uuid;
  v_student text;
begin
  select a.title, g.teacher_id into v_title, v_teacher
  from public.assignments a join public.groups g on g.id = a.group_id where a.id = new.assignment_id;
  select full_name into v_student from public.students where id = new.student_id;

  if tg_op = 'INSERT' then
    perform public.notify(
      array[v_teacher], 'submission_new',
      'Nueva entrega: ' || v_title, 'New submission: ' || v_title,
      v_student, v_student, 'teacher/assignments', 'sub:' || new.id
    );
  elsif new.status = 'graded' and old.status is distinct from 'graded' then
    perform public.notify(
      array(select public.student_recipients(new.student_id)), 'submission_graded',
      'Tarea calificada: ' || v_title, 'Assignment graded: ' || v_title,
      'Nota: ' || new.grade, 'Grade: ' || new.grade,
      'student/assignments', 'subg:' || new.id || ':' || coalesce(to_char(new.graded_at, 'YYYYMMDDHH24MISS'), '')
    );
  end if;
  return new;
end;
$$;
create trigger notify_submission after insert or update of status on public.assignment_submissions
  for each row execute function public.notify_submission();

-- Clase cancelada: aviso a los alumnos matriculados (y tutores).
create function public.notify_session_cancelled()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_group text;
  r record;
begin
  if new.status <> 'cancelled' or old.status = 'cancelled' or new.starts_at < now() then
    return new;
  end if;
  select name into v_group from public.groups where id = new.group_id;
  for r in select e.student_id from public.enrollments e where e.group_id = new.group_id and e.status = 'active' loop
    perform public.notify(
      array(select public.student_recipients(r.student_id)), 'session_cancelled',
      'Clase cancelada', 'Class cancelled',
      v_group || ' · ' || public.notice_when(new.starts_at) || coalesce(' · ' || new.cancel_reason, ''),
      v_group || ' · ' || public.notice_when(new.starts_at) || coalesce(' · ' || new.cancel_reason, ''),
      'student/schedule', 'sc:' || new.id || ':' || r.student_id
    );
  end loop;
  return new;
end;
$$;
create trigger notify_session_cancelled after update of status on public.sessions
  for each row execute function public.notify_session_cancelled();

-- ---------------------------------------------------------------------------
-- Recordatorios (se ejecutan cada hora)
-- ---------------------------------------------------------------------------
-- Clases de las próximas 24 h, tareas que vencen en 48 h sin entrega y packs con una clase o menos.
-- `dedupe_key` evita repetir el mismo recordatorio aunque la función corra muchas veces.
create function public.generate_reminders()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_before integer;
  v_after integer;
  r record;
begin
  select count(*) into v_before from public.notifications;

  for r in
    select se.id as session_id, se.starts_at, g.name as group_name, e.student_id
    from public.sessions se
    join public.groups g on g.id = se.group_id
    join public.enrollments e on e.group_id = se.group_id and e.status = 'active'
    where se.status = 'scheduled' and se.starts_at > now() and se.starts_at <= now() + interval '24 hours'
  loop
    perform public.notify(
      array(select public.student_recipients(r.student_id)), 'class_reminder',
      'Clase mañana: ' || r.group_name, 'Class coming up: ' || r.group_name,
      public.notice_when(r.starts_at), public.notice_when(r.starts_at),
      'student/schedule', 'rem:' || r.session_id || ':' || r.student_id
    );
  end loop;

  for r in
    select a.id as assignment_id, a.title, a.due_at, e.student_id
    from public.assignments a
    join public.enrollments e on e.group_id = a.group_id and e.status = 'active'
    where a.status = 'published' and a.due_at > now() and a.due_at <= now() + interval '48 hours'
      and not exists (select 1 from public.assignment_submissions s where s.assignment_id = a.id and s.student_id = e.student_id)
  loop
    perform public.notify(
      array(select public.student_recipients(r.student_id)), 'assignment_due',
      'Tarea por vencer: ' || r.title, 'Assignment due soon: ' || r.title,
      'Entrega ' || public.notice_when(r.due_at), 'Due ' || public.notice_when(r.due_at),
      'student/assignments', 'due:' || r.assignment_id || ':' || r.student_id
    );
  end loop;

  select count(*) into v_after from public.notifications;
  return v_after - v_before;
end;
$$;
revoke all on function public.generate_reminders() from public, anon, authenticated;

-- Programa la ejecución cada hora con pg_cron si la base lo permite (Supabase sí; algunas bases
-- locales no). Si no se puede, los recordatorios no se generan hasta programarlos a mano:
--   select cron.schedule('spanglish-reminders', '5 * * * *', 'select public.generate_reminders()');
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('spanglish-reminders', '5 * * * *', 'select public.generate_reminders()');
exception when others then
  raise notice 'pg_cron no disponible (%): programar generate_reminders() a mano', sqlerrm;
end;
$$;

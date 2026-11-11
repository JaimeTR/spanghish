-- 0037_change_requests.sql
-- Cambios de clase: el alumno (o su tutor) avisa que no podrá asistir o pide cambiar una clase,
-- y la docente de ese grupo (o administración) lo aprueba o lo rechaza.
--
--   * Solo sobre clases programadas que aún no empezaron y donde el alumno está en la lista.
--   * Una solicitud pendiente por alumno y clase.
--   * El alumno puede cancelar la suya mientras esté pendiente; no puede decidir ni escribir la respuesta.
--   * Quién y cuándo decidió lo pone la base de datos.

create type public.change_request_kind as enum ('absence', 'reschedule');
create type public.change_request_status as enum ('pending', 'approved', 'declined', 'cancelled');

create table public.session_change_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  student_id uuid not null references public.students (id),
  kind public.change_request_kind not null,
  note text check (char_length(note) <= 500),
  status public.change_request_status not null default 'pending',
  response_note text check (char_length(response_note) <= 500),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.session_change_requests is 'Avisos de ausencia y pedidos de cambio de una clase; los decide la docente o administración.';
create unique index session_change_requests_pending_unique on public.session_change_requests (session_id, student_id) where status = 'pending';
create index session_change_requests_student_id_idx on public.session_change_requests (student_id);
create index session_change_requests_decided_by_idx on public.session_change_requests (decided_by);
create index session_change_requests_created_by_idx on public.session_change_requests (created_by);
create index session_change_requests_status_idx on public.session_change_requests (status, created_at desc);

create trigger session_change_requests_touch_updated_at before update on public.session_change_requests
  for each row execute function public.touch_updated_at();

create function public.change_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.sessions%rowtype;
begin
  select * into v_session from public.sessions s where s.id = new.session_id;
  if v_session.id is null or v_session.status <> 'scheduled' or v_session.starts_at <= now() then
    raise exception 'session_not_editable' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.session_roster_internal(new.session_id) r where r = new.student_id) then
    raise exception 'not_in_roster' using errcode = 'P0001';
  end if;
  new.status := 'pending';
  new.response_note := null;
  new.decided_by := null;
  new.decided_at := null;
  return new;
end;
$$;

revoke execute on function public.change_requests_before_insert() from public, anon, authenticated, service_role;
create trigger change_requests_before_insert before insert on public.session_change_requests
  for each row execute function public.change_requests_before_insert();

create function public.change_requests_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff boolean := (select auth.uid()) is null
    or public.user_has_role((select auth.uid()), 'admin')
    or exists (
      select 1 from public.sessions s join public.groups g on g.id = s.group_id
      where s.id = new.session_id
        and public.user_has_role((select auth.uid()), 'teacher')
        and (s.teacher_id = (select auth.uid()) or g.teacher_id = (select auth.uid()))
    );
begin
  if old.status <> 'pending' then
    raise exception 'conflict' using errcode = 'P0001';
  end if;
  if not v_staff then
    -- El alumno solo puede cancelar la suya.
    new.response_note := old.response_note;
    if new.status <> 'cancelled' then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.status in ('approved', 'declined') then
    new.decided_by := (select auth.uid());
    new.decided_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function public.change_requests_before_update() from public, anon, authenticated, service_role;
create trigger change_requests_before_update before update of status, response_note on public.session_change_requests
  for each row execute function public.change_requests_before_update();

alter table public.session_change_requests enable row level security;
revoke all on table public.session_change_requests from anon, authenticated;
grant select, insert on table public.session_change_requests to authenticated;
grant update (status, response_note) on table public.session_change_requests to authenticated;

create policy change_requests_select on public.session_change_requests for select to authenticated
  using (
    (select public.has_role('admin'))
    or (select public.teaches_session(session_id))
    or ((select public.is_active()) and (
      student_id in (select public.current_student_ids()) or student_id in (select public.guarded_student_ids())
    ))
  );
create policy change_requests_insert on public.session_change_requests for insert to authenticated
  with check (
    (select public.is_active()) and (
      student_id in (select public.current_student_ids()) or student_id in (select public.guarded_student_ids())
    )
  );
create policy change_requests_update_staff on public.session_change_requests for update to authenticated
  using ((select public.has_role('admin')) or (select public.teaches_session(session_id)))
  with check ((select public.has_role('admin')) or (select public.teaches_session(session_id)));
create policy change_requests_update_own on public.session_change_requests for update to authenticated
  using ((select public.is_active()) and status = 'pending' and (
    student_id in (select public.current_student_ids()) or student_id in (select public.guarded_student_ids())
  ))
  with check (status = 'cancelled');

select public.enable_audit('public.session_change_requests');

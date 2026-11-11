-- 0038_assignments_progress.sql
-- Tareas (la docente las crea para un grupo, el alumno entrega texto y/o un archivo, la docente
-- califica) y lecciones completadas (para el progreso del alumno).
--
--   * assignments: de un grupo; "borrador" solo lo ven administración y la docente de ese grupo.
--   * assignment_submissions: una por alumno y tarea. El alumno solo escribe el contenido (y
--     puede reenviar mientras no esté calificada); la nota y el comentario solo los pone la
--     docente del grupo o administración, y la base dice quién y cuándo. "Fuera de plazo" lo calcula la base.
--   * Archivos en el bucket privado assignment-files, en <tarea>/<alumno>/<uuid>.<ext>: el alumno
--     (y su tutor) lee y escribe los suyos, la docente del grupo y administración leen.
--   * lesson_completions: el alumno marca una lección que puede leer como completada.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create type public.assignment_status as enum ('draft', 'published');
create type public.submission_status as enum ('submitted', 'graded');

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  instructions text check (char_length(instructions) <= 4000),
  due_at timestamptz,
  max_grade smallint not null default 10 check (max_grade in (10, 20, 100)),
  status public.assignment_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.assignments is 'Tareas de un grupo: título, instrucciones, fecha de entrega y nota máxima.';
create index assignments_group_due_idx on public.assignments (group_id, due_at);
create index assignments_created_by_idx on public.assignments (created_by);
create trigger assignments_touch_updated_at before update on public.assignments
  for each row execute function public.touch_updated_at();

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.students (id),
  text_answer text check (char_length(text_answer) <= 5000),
  file_path text check (char_length(file_path) <= 300),
  file_name text check (char_length(file_name) <= 200),
  status public.submission_status not null default 'submitted',
  grade numeric(5, 2) check (grade >= 0),
  feedback text check (char_length(feedback) <= 2000),
  is_late boolean not null default false,
  submitted_at timestamptz not null default now(),
  graded_by uuid references public.profiles (id) on delete set null,
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_submissions_unique unique (assignment_id, student_id),
  constraint assignment_submissions_has_content check (text_answer is not null or file_path is not null)
);

comment on table public.assignment_submissions is 'Entregas de tareas (una por alumno): contenido del alumno, nota y comentario de la docente.';
create index assignment_submissions_student_idx on public.assignment_submissions (student_id);
create index assignment_submissions_graded_by_idx on public.assignment_submissions (graded_by);
create trigger assignment_submissions_touch_updated_at before update on public.assignment_submissions
  for each row execute function public.touch_updated_at();

create table public.lesson_completions (
  student_id uuid not null references public.students (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

comment on table public.lesson_completions is 'Lecciones que un alumno marcó como completadas (progreso).';
create index lesson_completions_lesson_idx on public.lesson_completions (lesson_id);

-- ---------------------------------------------------------------------------
-- Acceso
-- ---------------------------------------------------------------------------
create function public.teaches_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('teacher')
     and exists (
       select 1 from public.assignments a join public.groups g on g.id = a.group_id
       where a.id = p_assignment_id and g.teacher_id = (select auth.uid())
     );
$$;

-- ¿Puede la persona actual entregar esta tarea? Publicada y de un grupo donde está matriculada.
create function public.can_submit_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where a.id = p_assignment_id and a.status = 'published' and a.group_id in (select public.my_group_ids())
  );
$$;

revoke execute on function public.teaches_assignment(uuid) from public, anon, service_role;
revoke execute on function public.can_submit_assignment(uuid) from public, anon, service_role;
grant execute on function public.teaches_assignment(uuid) to authenticated;
grant execute on function public.can_submit_assignment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Entregas: qué puede escribir cada quién
-- ---------------------------------------------------------------------------
create function public.submissions_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment public.assignments%rowtype;
  v_staff boolean := (select auth.uid()) is null
    or public.user_has_role((select auth.uid()), 'admin')
    or public.teaches_assignment(new.assignment_id);
begin
  select * into v_assignment from public.assignments a where a.id = new.assignment_id;
  if v_assignment.id is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    if v_assignment.status <> 'published' then
      raise exception 'not_available' using errcode = 'P0001';
    end if;
    new.status := 'submitted';
    new.grade := null;
    new.feedback := null;
    new.graded_by := null;
    new.graded_at := null;
    new.submitted_at := now();
    new.is_late := v_assignment.due_at is not null and now() > v_assignment.due_at;
  elsif v_staff then
    -- La docente califica: el contenido del alumno no se toca.
    new.text_answer := old.text_answer;
    new.file_path := old.file_path;
    new.file_name := old.file_name;
    new.is_late := old.is_late;
    new.submitted_at := old.submitted_at;
    if new.grade is not null and new.grade > v_assignment.max_grade then
      raise exception 'invalid' using errcode = 'P0001';
    end if;
    if new.grade is not null then
      new.status := 'graded';
      new.graded_by := (select auth.uid());
      new.graded_at := now();
    else
      new.status := 'submitted';
      new.graded_by := null;
      new.graded_at := null;
    end if;
  else
    -- El alumno reenvía su contenido mientras no esté calificada; nota y comentario no son suyos.
    if old.status <> 'submitted' then
      raise exception 'conflict' using errcode = 'P0001';
    end if;
    new.status := old.status;
    new.grade := old.grade;
    new.feedback := old.feedback;
    new.graded_by := old.graded_by;
    new.graded_at := old.graded_at;
    new.submitted_at := now();
    new.is_late := v_assignment.due_at is not null and now() > v_assignment.due_at;
  end if;

  -- El archivo debe estar en la carpeta de esta tarea y de este alumno.
  if new.file_path is not null and new.file_path not like new.assignment_id::text || '/' || new.student_id::text || '/%' then
    raise exception 'invalid' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.submissions_before_write() from public, anon, authenticated, service_role;
create trigger submissions_before_write before insert or update on public.assignment_submissions
  for each row execute function public.submissions_before_write();

-- ---------------------------------------------------------------------------
-- RLS y privilegios
-- ---------------------------------------------------------------------------
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.lesson_completions enable row level security;

revoke all on table public.assignments, public.assignment_submissions, public.lesson_completions from anon, authenticated;
grant select, insert, update, delete on table public.assignments to authenticated;
grant select, insert on table public.assignment_submissions to authenticated;
grant update (text_answer, file_path, file_name, grade, feedback) on table public.assignment_submissions to authenticated;
grant select, insert, delete on table public.lesson_completions to authenticated;

create policy assignments_select on public.assignments for select to authenticated
  using (
    (select public.has_role('admin'))
    or (select public.teaches_group(group_id))
    or ((select public.is_active()) and status = 'published' and group_id in (select public.my_group_ids()))
  );
create policy assignments_insert on public.assignments for insert to authenticated
  with check ((select public.has_role('admin')) or (select public.teaches_group(group_id)));
create policy assignments_update on public.assignments for update to authenticated
  using ((select public.has_role('admin')) or (select public.teaches_group(group_id)))
  with check ((select public.has_role('admin')) or (select public.teaches_group(group_id)));
create policy assignments_delete on public.assignments for delete to authenticated
  using ((select public.has_role('admin')) or (select public.teaches_group(group_id)));

create policy submissions_select on public.assignment_submissions for select to authenticated
  using (
    (select public.has_role('admin'))
    or (select public.teaches_assignment(assignment_id))
    or ((select public.is_active()) and (
      student_id in (select public.current_student_ids()) or student_id in (select public.guarded_student_ids())
    ))
  );
create policy submissions_insert on public.assignment_submissions for insert to authenticated
  with check (
    (select public.is_active())
    and student_id in (select public.current_student_ids())
    and (select public.can_submit_assignment(assignment_id))
  );
create policy submissions_update_staff on public.assignment_submissions for update to authenticated
  using ((select public.has_role('admin')) or (select public.teaches_assignment(assignment_id)))
  with check ((select public.has_role('admin')) or (select public.teaches_assignment(assignment_id)));
create policy submissions_update_own on public.assignment_submissions for update to authenticated
  using ((select public.is_active()) and status = 'submitted' and student_id in (select public.current_student_ids()))
  with check (student_id in (select public.current_student_ids()));

create policy lesson_completions_select on public.lesson_completions for select to authenticated
  using (
    (select public.has_role('admin'))
    or student_id in (select public.current_student_ids())
    or student_id in (select public.guarded_student_ids())
    or student_id in (select public.taught_student_ids())
  );
create policy lesson_completions_insert on public.lesson_completions for insert to authenticated
  with check (
    (select public.is_active())
    and student_id in (select public.current_student_ids())
    and exists (select 1 from public.lessons l where l.id = lesson_id)
  );
create policy lesson_completions_delete on public.lesson_completions for delete to authenticated
  using (student_id in (select public.current_student_ids()));

-- ---------------------------------------------------------------------------
-- Archivos de las entregas
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('assignment-files', 'assignment-files', false, 10485760, array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'audio/mpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Ruta <tarea>/<alumno>/<archivo>. Escribir: el alumno en su carpeta de una tarea que puede entregar.
-- Leer: además su tutor, la docente del grupo y administración.
create function public.assignment_file_access(p_name text, p_write boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[] := string_to_array(p_name, '/');
  v_assignment uuid;
  v_student uuid;
begin
  if array_length(v_parts, 1) <> 3
     or v_parts[1] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or v_parts[2] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_assignment := v_parts[1]::uuid;
  v_student := v_parts[2]::uuid;

  if v_student in (select public.current_student_ids()) and public.can_submit_assignment(v_assignment) then
    return true;
  end if;
  if p_write then
    return false;
  end if;
  return public.has_role('admin')
    or public.teaches_assignment(v_assignment)
    or (v_student in (select public.guarded_student_ids())
        and exists (select 1 from public.assignments a where a.id = v_assignment and a.status = 'published'));
end;
$$;

revoke execute on function public.assignment_file_access(text, boolean) from public, anon, service_role;
grant execute on function public.assignment_file_access(text, boolean) to authenticated;

create policy assignment_files_select on storage.objects for select to authenticated
  using (bucket_id = 'assignment-files' and public.assignment_file_access(name, false));
create policy assignment_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'assignment-files' and public.assignment_file_access(name, true));
create policy assignment_files_update on storage.objects for update to authenticated
  using (bucket_id = 'assignment-files' and public.assignment_file_access(name, true))
  with check (bucket_id = 'assignment-files' and public.assignment_file_access(name, true));
create policy assignment_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'assignment-files' and public.assignment_file_access(name, true));

select public.enable_audit('public.assignments');
select public.enable_audit('public.assignment_submissions');

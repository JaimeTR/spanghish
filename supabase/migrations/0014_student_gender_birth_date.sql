-- 0014_student_gender_birth_date.sql
-- Alumnos: género y fecha de nacimiento completa (la edad se calcula en la app).
-- birth_year se conserva por compatibilidad y create_student lo rellena con el
-- año de birth_date. Las notas internas siguen existiendo en la ficha, pero el
-- alta ya no las pide.

alter table public.student_private
  add column gender text check (gender in ('female', 'male', 'other', 'unspecified')),
  add column birth_date date check (birth_date between date '1900-01-01' and current_date);

create or replace function public.create_student(p_payload jsonb)
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
  v_birth_date date := nullif(p_payload ->> 'birth_date', '')::date;
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

  insert into public.student_private (student_id, email, phone, birth_year, birth_date, gender)
  values (
    v_student_id,
    nullif(btrim(p_payload ->> 'email'), ''),
    nullif(btrim(p_payload ->> 'phone'), ''),
    coalesce(extract(year from v_birth_date)::smallint, nullif(p_payload ->> 'birth_year', '')::smallint),
    v_birth_date,
    nullif(p_payload ->> 'gender', '')
  );

  if nullif(btrim(p_payload ->> 'admin_notes'), '') is not null then
    insert into public.student_admin_notes (student_id, notes)
    values (v_student_id, btrim(p_payload ->> 'admin_notes'));
  end if;

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

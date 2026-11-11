-- 0039_guardian_consents.sql
-- Consentimientos desde el portal del tutor: dar o retirar el de grabaciones y el de fotos de un hijo.
--
--   * Solo recordings y photos: el consentimiento de datos del menor (minor_data) es requisito de la
--     matrícula y lo gestiona la escuela.
--   * Solo el tutor vinculado a ese menor, y solo si hay un texto vigente de ese tipo.
--   * Siempre se agrega un registro nuevo (consents es append-only): el último manda.

create function public.set_my_consent(p_student_id uuid, p_kind public.consent_kind, p_granted boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guardian uuid;
  v_text text;
begin
  if p_kind not in ('recordings', 'photos') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select g.id into v_guardian
  from public.guardians g
  join public.student_guardians sg on sg.guardian_id = g.id
  where sg.student_id = p_student_id
    and g.id in (select public.current_guardian_ids())
  limit 1;
  if v_guardian is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select t.id into v_text
  from public.consent_texts t
  where t.kind = p_kind and t.effective_from <= public.school_today()
  order by t.effective_from desc, t.created_at desc
  limit 1;
  if v_text is null then
    raise exception 'not_available' using errcode = 'P0001';
  end if;

  insert into public.consents (student_id, guardian_id, text_id, kind, granted, method)
  values (p_student_id, v_guardian, v_text, p_kind, p_granted, 'portal');
end;
$$;

comment on function public.set_my_consent(uuid, public.consent_kind, boolean) is
  'El tutor da o retira el consentimiento de grabaciones o fotos de su hijo (registro nuevo; el último manda).';
revoke execute on function public.set_my_consent(uuid, public.consent_kind, boolean) from public, anon, service_role;
grant execute on function public.set_my_consent(uuid, public.consent_kind, boolean) to authenticated;

-- guardian_consents.test.sql — consentimientos del tutor (0039)
begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('e5000000-0000-4000-8000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e5-guardian1@test.local', '{}', '{"initial_role":"guardian"}', now(), now()),
  ('e5000000-0000-4000-8000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e5-guardian2@test.local', '{}', '{"initial_role":"guardian"}', now(), now());
insert into public.guardians (id, profile_id, full_name, email) values
  ('e5200000-0000-4000-8000-0000000000d1', 'e5000000-0000-4000-8000-0000000000d1', 'E5 Guardian One', 'e5-g1@private.local'),
  ('e5200000-0000-4000-8000-0000000000d2', 'e5000000-0000-4000-8000-0000000000d2', 'E5 Guardian Two', 'e5-g2@private.local');
insert into public.students (id, full_name, audience) values ('e5100000-0000-4000-8000-0000000000f1', 'E5 Kid', 'kids');
insert into public.student_guardians (student_id, guardian_id, relationship)
values ('e5100000-0000-4000-8000-0000000000f1', 'e5200000-0000-4000-8000-0000000000d1', 'parent');

reset role;
-- Ya puede haber textos de otras pruebas; se añade uno propio para no depender de ellos.
insert into public.consent_texts (id, kind, body_es, body_en, effective_from) values
  ('photos-v91', 'photos', 'E5 texto fotos', 'E5 photos text', '2026-01-01'),
  ('recordings-v91', 'recordings', 'E5 texto grabaciones', 'E5 recordings text', '2026-01-01');

set local request.jwt.claims = '{"sub":"e5000000-0000-4000-8000-0000000000d1","role":"authenticated"}';
set local role authenticated;
select lives_ok($$ select public.set_my_consent('e5100000-0000-4000-8000-0000000000f1', 'photos', true) $$, 'the guardian grants photo consent');
select is((select granted from public.consents where student_id = 'e5100000-0000-4000-8000-0000000000f1' and kind = 'photos' order by recorded_at desc limit 1), true, 'and it is the current consent');
select lives_ok($$ select public.set_my_consent('e5100000-0000-4000-8000-0000000000f1', 'photos', false) $$, 'the guardian can withdraw it');
select is((select granted from public.consents where student_id = 'e5100000-0000-4000-8000-0000000000f1' and kind = 'photos' order by recorded_at desc limit 1), false, 'the last record wins');
select throws_ok($$ select public.set_my_consent('e5100000-0000-4000-8000-0000000000f1', 'minor_data', true) $$,
  '42501', null, 'the school-managed consent cannot be changed from the portal');

set local request.jwt.claims = '{"sub":"e5000000-0000-4000-8000-0000000000d2","role":"authenticated"}';
select throws_ok($$ select public.set_my_consent('e5100000-0000-4000-8000-0000000000f1', 'photos', true) $$,
  '42501', null, 'another guardian cannot touch this child''s consents');

reset role;
select is((select count(*)::int from public.consents where student_id = 'e5100000-0000-4000-8000-0000000000f1' and method = 'portal'), 2,
  'both changes were recorded as new rows (append-only)');

select * from finish();
rollback;

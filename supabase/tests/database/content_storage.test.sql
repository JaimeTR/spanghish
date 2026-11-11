-- Pruebas pgTAP de Storage de contenido (0011). Se insertan filas en
-- storage.objects con el rol y los claims de cada persona (no hace falta el
-- servicio de Storage). Transacción revertida al final.
-- Personas (prefijo d2): A admin, S1 alumno con ficha activa, V visitante,
-- SU admin suspendida, anon. Recursos d23…, objetos d26….
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('d2000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd2-admin@test.local', '{}', '{}', now(), now()),
  ('d2000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd2-student1@test.local', '{}', '{}', now(), now()),
  ('d2000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd2-visitor@test.local', '{}', '{}', now(), now()),
  ('d2000000-0000-4000-8000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'd2-suspended@test.local', '{}', '{}', now(), now());
insert into public.user_roles (user_id, role) values
  ('d2000000-0000-4000-8000-0000000000a1', 'admin'),
  ('d2000000-0000-4000-8000-0000000000e1', 'admin');
update public.profiles set status = 'suspended' where id = 'd2000000-0000-4000-8000-0000000000e1';
insert into public.students (id, profile_id, full_name, audience) values
  ('d2100000-0000-4000-8000-0000000000c1', 'd2000000-0000-4000-8000-0000000000c1', 'D2 Student One', 'adults');

-- "Matriculado" exige una matrícula activa (0035).
insert into public.programs (id, code, name_es, name_en, language_code, audience, format)
values ('d2500000-0000-4000-8000-000000000001', 'd2-prog', 'D2 programa', 'D2 program', 'es', 'adults', 'local_group');
insert into public.groups (id, code, name, program_id, format, capacity, status)
values ('d2500000-0000-4000-8000-000000000002', 'D2-GRP', 'D2 grupo', 'd2500000-0000-4000-8000-000000000001', 'local_group', 10, 'active');
insert into public.enrollments (student_id, group_id, status, billing_mode)
values ('d2100000-0000-4000-8000-0000000000c1', 'd2500000-0000-4000-8000-000000000002', 'active', 'free');

-- F1 public publicado, F2 enrolled publicado, F3 public borrador; objeto 09 huérfano.
insert into public.resources (id, kind, access_level, status, title_es, title_en, file_path, file_mime, file_size_bytes)
values
  ('d2300000-0000-4000-8000-000000000001', 'worksheet', 'public', 'published', 'D2 F1', 'D2 F1',
   'resources/d2300000-0000-4000-8000-000000000001/d2600000-0000-4000-8000-000000000001.pdf', 'application/pdf', 100),
  ('d2300000-0000-4000-8000-000000000002', 'document', 'enrolled', 'published', 'D2 F2', 'D2 F2',
   'resources/d2300000-0000-4000-8000-000000000002/d2600000-0000-4000-8000-000000000002.pdf', 'application/pdf', 100),
  ('d2300000-0000-4000-8000-000000000003', 'worksheet', 'public', 'draft', 'D2 F3', 'D2 F3',
   'resources/d2300000-0000-4000-8000-000000000003/d2600000-0000-4000-8000-000000000003.pdf', 'application/pdf', 100);
insert into storage.objects (bucket_id, name, owner_id) values
  ('resource-files', 'resources/d2300000-0000-4000-8000-000000000001/d2600000-0000-4000-8000-000000000001.pdf', null),
  ('resource-files', 'resources/d2300000-0000-4000-8000-000000000002/d2600000-0000-4000-8000-000000000002.pdf', null),
  ('resource-files', 'resources/d2300000-0000-4000-8000-000000000003/d2600000-0000-4000-8000-000000000003.pdf', null),
  ('resource-files', 'resources/d2300000-0000-4000-8000-000000000009/d2600000-0000-4000-8000-000000000009.pdf', null);

-- Objetos de prueba visibles (sufijo de 2 cifras) para el usuario actual.
create function pg_temp.d2_objects()
returns setof text language sql as $$
  select right(split_part(name, '.', 1), 2) from storage.objects
  where bucket_id = 'resource-files' and name like 'resources/d23%' order by 1;
$$;
grant execute on function pg_temp.d2_objects() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------------
select results_eq(
  $$ select id, public, file_size_limit, allowed_mime_types from storage.buckets
     where id in ('content-media', 'resource-files') order by id $$,
  $$ values
       ('content-media'::text, true, 2097152::bigint, array['image/png', 'image/jpeg', 'image/webp']::text[]),
       ('resource-files', false, 26214400::bigint, array['application/pdf', 'image/png', 'image/jpeg', 'audio/mpeg',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation']::text[]) $$,
  'buckets have the exact limits and mime types of UPLOAD_RULES'
);
select ok(
  (select public from storage.buckets where id = 'content-media')
  and not (select public from storage.buckets where id = 'resource-files'),
  'content-media is public and resource-files is private'
);

-- ---------------------------------------------------------------------------
-- Escritura
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"d2000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values
       ('resource-files', 'resources/d2300000-0000-4000-8000-000000000001/d2600000-0000-4000-8000-0000000000a1.pdf',
        'd2000000-0000-4000-8000-0000000000a1') $$,
  'admin can insert an object in resource-files and content-media: resource-files'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values
       ('content-media', 'thumbnails/d2600000-0000-4000-8000-0000000000a2.png', 'd2000000-0000-4000-8000-0000000000a1') $$,
  'admin can insert an object in resource-files and content-media: content-media'
);

set local request.jwt.claims = '{"sub":"d2000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values
       ('resource-files', 'resources/d2300000-0000-4000-8000-000000000001/d2600000-0000-4000-8000-0000000000c1.pdf',
        'd2000000-0000-4000-8000-0000000000c1') $$,
  '42501', null, 'student1 cannot insert into resource-files or content-media: resource-files'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values
       ('content-media', 'thumbnails/d2600000-0000-4000-8000-0000000000c1.png', 'd2000000-0000-4000-8000-0000000000c1') $$,
  '42501', null, 'student1 cannot insert into resource-files or content-media: content-media'
);
update storage.objects set name = name || '.x'
where name = 'resources/d2300000-0000-4000-8000-000000000001/d2600000-0000-4000-8000-000000000001.pdf';
select is(
  (select count(*) from storage.objects where name like 'resources/d23%.x'),
  0::bigint,
  'student1 cannot rename an object it can read'
);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('content-media', 'thumbnails/d2600000-0000-4000-8000-0000000000f1.png') $$,
  '42501', null, 'anon cannot upload to content-media'
);

-- ---------------------------------------------------------------------------
-- Lectura (firmar) por nivel
-- ---------------------------------------------------------------------------
select results_eq('select * from pg_temp.d2_objects()', $$ values ('01') $$,
  'anon selects the object of a published public resource, not drafts, enrolled or orphans');
select is(
  (select count(*) from storage.objects where bucket_id = 'content-media'),
  0::bigint,
  'anon lists nothing in content-media through the API (public reads go by URL)'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"d2000000-0000-4000-8000-0000000000c2","role":"authenticated"}';
select results_eq('select * from pg_temp.d2_objects()', $$ values ('01') $$,
  'visitor cannot select an enrolled object and student1 can: visitor');

set local request.jwt.claims = '{"sub":"d2000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select results_eq('select * from pg_temp.d2_objects()', $$ values ('01'), ('02') $$,
  'visitor cannot select an enrolled object and student1 can: student1');

set local request.jwt.claims = '{"sub":"d2000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
select results_eq('select * from pg_temp.d2_objects()', $$ values ('01') $$,
  'suspended admin selects nothing beyond what anon can (published public)');
select is(
  (select count(*) from storage.objects where bucket_id = 'content-media'),
  0::bigint,
  'suspended admin selects nothing in content-media'
);

set local request.jwt.claims = '{"sub":"d2000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
select results_eq('select * from pg_temp.d2_objects()', $$ values ('01'), ('02'), ('03'), ('09'), ('a1') $$,
  'an object not referenced by any resource is invisible to everyone but admin');

-- El recurso público pasa a enrolled: anon ya no puede firmarlo.
reset role;
update public.resources set access_level = 'enrolled' where id = 'd2300000-0000-4000-8000-000000000001';
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select results_eq('select count(*) from pg_temp.d2_objects()', $$ values (0::bigint) $$,
  'anon cannot select the object once the resource becomes enrolled');

-- Y si se despublica, tampoco el alumno.
reset role;
update public.resources set status = 'draft' where id = 'd2300000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claims = '{"sub":"d2000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select results_eq('select * from pg_temp.d2_objects()', $$ values ('01') $$,
  'anon cannot select the object of a draft resource (nor student1 once unpublished)');

select * from finish();
rollback;

-- ===========================================================================
-- SOLO DESARROLLO LOCAL
-- ===========================================================================
-- Usuarios de prueba para `supabase db reset` (local) y las pruebas e2e.
-- NUNCA ejecutar este archivo contra un proyecto remoto: crea cuentas con una
-- contraseña conocida y pública.
--
-- Contraseña de todos los usuarios (solo desarrollo): Spanglish-dev-2026
-- (También figura en apps/app/e2e/fixtures.ts; no repetirla en otros sitios.)
--
--   admin@spanglish.test      -> admin
--   teacher@spanglish.test    -> teacher + student (prueba de prioridad de roles)
--   student@spanglish.test    -> student
--   suspended@spanglish.test  -> student, profiles.status = 'suspended'
--   teacher2@spanglish.test   -> teacher (initial_role en app_metadata)
--   guardian@spanglish.test   -> guardian (initial_role en app_metadata)
--
-- El trigger on_auth_user_created crea el perfil y el rol 'student'; aquí solo
-- se ajustan roles y estado. GoTrue necesita contraseña bcrypt, columnas de
-- token como cadena vacía (no NULL) y una fila en auth.identities por usuario.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Guarda: aborta si la base no es el stack local de la CLI.
-- Marcador elegido (verificado en el contenedor local): la CLI fija, a nivel de
-- base de datos, app.settings.jwt_secret = el secreto de demostración público
-- 'super-secret-jwt-token-with-at-least-32-characters-long'. Un proyecto alojado
-- (y sus ramas de preview) nunca usa ese secreto; si el ajuste no existe o es
-- otro valor, el seed falla antes de crear nada. inet_server_addr() no sirve
-- (es NULL por socket Unix). NUNCA usar `supabase db push --include-seed` ni
-- Supabase Branching con este archivo.
-- ---------------------------------------------------------------------------
do $guard$
begin
  if coalesce(current_setting('app.settings.jwt_secret', true), '')
     <> 'super-secret-jwt-token-with-at-least-32-characters-long' then
    raise exception 'seed.sql es SOLO DESARROLLO LOCAL: esta base no es el stack local de Supabase'
      using errcode = 'P0001';
  end if;
end
$guard$;

with seed_users (id, email, full_name, app_meta) as (
  values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@spanglish.test', 'Admin Local', '{}'::jsonb),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'teacher@spanglish.test', 'Teacher Local', '{}'::jsonb),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'student@spanglish.test', 'Student Local', '{}'::jsonb),
    ('a0000000-0000-4000-8000-000000000004'::uuid, 'suspended@spanglish.test', 'Suspended Local', '{}'::jsonb),
    -- Rol inicial por app_metadata (0007), como el alta de la administradora.
    ('a0000000-0000-4000-8000-000000000005'::uuid, 'teacher2@spanglish.test', 'Teacher Two',
     '{"initial_role":"teacher"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000006'::uuid, 'guardian@spanglish.test', 'Guardian Local',
     '{"initial_role":"guardian"}'::jsonb)
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('Spanglish-dev-2026', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb || app_meta,
  jsonb_build_object('full_name', full_name), now(), now(),
  '', '', '', ''
from seed_users;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select
  u.id, u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.email like '%@spanglish.test';

-- Roles: el trigger dio 'student' a todos.
insert into public.user_roles (user_id, role) values
  ('a0000000-0000-4000-8000-000000000001', 'admin'),
  ('a0000000-0000-4000-8000-000000000002', 'teacher');

delete from public.user_roles
where user_id = 'a0000000-0000-4000-8000-000000000001' and role = 'student';

update public.profiles set status = 'suspended'
where id = 'a0000000-0000-4000-8000-000000000004';

-- ---------------------------------------------------------------------------
-- Catálogo de desarrollo (0008): 2 sedes, 1 programa, 1 edición y 2 precios.
-- IDs fijos (b0…) para las e2e (SEED_IDS en apps/app/e2e/fixtures.ts).
-- ---------------------------------------------------------------------------
insert into public.locations (id, name, kind, region, address, map_url) values
  ('b0000000-0000-4000-8000-000000000001', 'Biblioteca Local', 'library', 'sunshine_coast',
   'Calle de prueba 1', 'https://maps.example.com/biblioteca-local'),
  ('b0000000-0000-4000-8000-000000000002', 'Online', 'online', 'online', null, null);

insert into public.programs (id, code, name_es, name_en, language_code, audience, format, level_id,
                             duration_weeks, lesson_minutes, is_public)
select 'b0000000-0000-4000-8000-000000000101', 'adults-a1-local', 'Adultos A1 (local)', 'Adults A1 (local)',
       'es', 'adults', 'local_group', l.id, 9, 70, true
from public.levels l
where l.language_code = 'es' and l.code = 'A1';

insert into public.program_editions (id, program_id, label_es, label_en, starts_on, ends_on, status) values
  ('b0000000-0000-4000-8000-000000000201', 'b0000000-0000-4000-8000-000000000101',
   'Edición de prueba', 'Test edition', '2027-02-01', '2027-04-02', 'open');

insert into public.program_prices (id, program_id, edition_id, location_id, kind, amount_cents, lessons_included) values
  ('b0000000-0000-4000-8000-000000000301', 'b0000000-0000-4000-8000-000000000101', null, null, 'per_lesson', 3500, null),
  ('b0000000-0000-4000-8000-000000000302', 'b0000000-0000-4000-8000-000000000101',
   'b0000000-0000-4000-8000-000000000201', null, 'upfront', 31000, null);

-- ---------------------------------------------------------------------------
-- Personas de desarrollo (0009). Texto de consentimiento SOLO de desarrollo
-- (los reales los crea la administradora desde la app).
--   Student Local -> adulto enlazado a student@spanglish.test
--   Student Two   -> adulto sin cuenta
--   Kid Local     -> menor, tutor Guardian Local (guardian@spanglish.test),
--                    alta con create_student() como la haría la administradora
-- ---------------------------------------------------------------------------
insert into public.consent_texts (id, kind, body_es, body_en, effective_from) values
  ('minor_data-v1', 'minor_data',
   'TEXTO DE DESARROLLO: autorizo el tratamiento de los datos del menor para gestionar sus clases.',
   'DEVELOPMENT TEXT: I authorise the processing of the minor''s data to manage their lessons.',
   '2026-01-01');

insert into public.students (id, profile_id, full_name, audience, level_id) values
  ('b0000000-0000-4000-8000-000000000401', 'a0000000-0000-4000-8000-000000000003', 'Student Local', 'adults',
   (select id from public.levels where language_code = 'es' and code = 'A1')),
  ('b0000000-0000-4000-8000-000000000402', null, 'Student Two', 'adults', null);
insert into public.student_private (student_id, email, phone) values
  ('b0000000-0000-4000-8000-000000000401', 'student@spanglish.test', '0400 000 001'),
  ('b0000000-0000-4000-8000-000000000402', 'student.two@example.com', null);
insert into public.student_admin_notes (student_id, notes) values
  ('b0000000-0000-4000-8000-000000000401', 'Nota interna de desarrollo (solo administración).');

insert into public.guardians (id, profile_id, full_name, email, phone) values
  ('b0000000-0000-4000-8000-000000000501', 'a0000000-0000-4000-8000-000000000006', 'Guardian Local',
   'guardian@spanglish.test', '0400 000 002');

do $kid$
begin
  -- create_student exige una admin activa en el JWT de la petición.
  perform set_config('request.jwt.claims',
    '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  perform public.create_student(jsonb_build_object(
    'full_name', 'Kid Local',
    'audience', 'kids',
    'birth_year', 2018,
    'admin_notes', 'Nota interna de desarrollo (solo administración).',
    'guardian', jsonb_build_object('id', 'b0000000-0000-4000-8000-000000000501', 'relationship', 'parent'),
    'consent', jsonb_build_object('text_id', 'minor_data-v1', 'method', 'paper')
  ));
  perform set_config('request.jwt.claims', '', true);
end
$kid$;

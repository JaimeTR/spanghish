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
--
-- El trigger on_auth_user_created crea el perfil y el rol 'student'; aquí solo
-- se ajustan roles y estado. GoTrue necesita contraseña bcrypt, columnas de
-- token como cadena vacía (no NULL) y una fila en auth.identities por usuario.
-- ===========================================================================

with seed_users (id, email, full_name) as (
  values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@spanglish.test', 'Admin Local'),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'teacher@spanglish.test', 'Teacher Local'),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'student@spanglish.test', 'Student Local'),
    ('a0000000-0000-4000-8000-000000000004'::uuid, 'suspended@spanglish.test', 'Suspended Local')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('Spanglish-dev-2026', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
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

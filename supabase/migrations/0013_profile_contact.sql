-- 0013_profile_contact.sql
-- Datos de contacto en el perfil de cada cuenta (admin, docente, alumno, tutor):
-- teléfono, fecha de nacimiento y dirección. Los edita la propia persona en
-- "Mi cuenta"; admin puede editar cualquier perfil (política ya existente).
-- El correo sigue sincronizado desde auth.users (0007) y no se edita aquí.

alter table public.profiles
  add column phone text check (char_length(phone) <= 30),
  add column birth_date date check (birth_date between date '1900-01-01' and current_date),
  add column address text check (char_length(address) <= 300),
  add column city text check (char_length(city) <= 100),
  add column country text check (char_length(country) <= 100);

grant update (phone, birth_date, address, city, country) on table public.profiles to authenticated;

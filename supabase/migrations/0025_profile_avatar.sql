-- 0025_profile_avatar.sql
-- Foto de perfil de cada cuenta.
--
--   * profiles.avatar_path: ruta en el bucket público content-media,
--     avatars/<id de la cuenta>/<uuid>.<ext> (png, jpg o webp, 2 MB como el resto
--     del bucket). Cada persona cambia la suya; admin la de cualquiera (política
--     de profiles ya existente + privilegio por columna).
--   * Storage: cada cuenta puede subir, leer, reemplazar y borrar SOLO lo que
--     cuelga de su propia carpeta avatars/<su id>/. La lectura pública del
--     bucket sigue yendo por la URL pública. Admin ya tiene acceso a todo el
--     bucket (0011).

alter table public.profiles
  add column avatar_path text
  check (avatar_path ~ '^avatars/[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$');

grant update (avatar_path) on table public.profiles to authenticated;

create policy content_media_own_avatar_select on storage.objects for select to authenticated
  using (
    bucket_id = 'content-media'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and (select public.is_active())
  );

create policy content_media_own_avatar_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'content-media'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and (select public.is_active())
  );

create policy content_media_own_avatar_update on storage.objects for update to authenticated
  using (
    bucket_id = 'content-media'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and (select public.is_active())
  )
  with check (
    bucket_id = 'content-media'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and (select public.is_active())
  );

create policy content_media_own_avatar_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'content-media'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and (select public.is_active())
  );

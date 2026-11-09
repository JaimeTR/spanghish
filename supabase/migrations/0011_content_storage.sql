-- 0011_content_storage.sql
-- Storage de contenido:
--   * content-media (público, 2 MB, png/jpeg/webp): imágenes de lecciones y
--     miniaturas. Lectura pública por URL; escritura solo admin.
--   * resource-files (privado, 25 MB, tipos de UPLOAD_RULES.resourceFile):
--     archivos de recursos. Se sirven con URL firmadas de vida corta; firmar
--     (SELECT) exige la misma regla de nivel que los recursos:
--     can_read_resource_object(name) = existe un recurso publicado con ese
--     file_path y access_level <= content_tier(). Admin: todo.
-- Los buckets se crean igual en local y en remoto (db push); no van en
-- config.toml. Rutas (las fija la app): resources/<resource_id>/<uuid>.<ext>,
-- thumbnails/<uuid>.<ext>, lessons/<lesson_id>/<uuid>.<ext>.
-- Los límites deben coincidir con UPLOAD_RULES de @spanglish/content (pgTAP).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('content-media', 'content-media', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('resource-files', 'resource-files', false, 26214400, array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'audio/mpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function public.can_read_resource_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.resources r
    where r.file_path = p_name
      and r.status = 'published'
      and r.access_level <= public.content_tier()
  );
$$;

comment on function public.can_read_resource_object(text) is
  'true si el objeto de resource-files pertenece a un recurso publicado accesible para quien llama.';

revoke execute on function public.can_read_resource_object(text) from public, anon, authenticated, service_role;
grant execute on function public.can_read_resource_object(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Políticas en storage.objects
-- ---------------------------------------------------------------------------
-- content-media: la lectura pública va por la URL pública del bucket (no pasa
-- por RLS). La admin también necesita SELECT para sobrescribir y listar.
create policy content_media_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'content-media' and (select public.has_role('admin')));
create policy content_media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'content-media' and (select public.has_role('admin')));
create policy content_media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'content-media' and (select public.has_role('admin')))
  with check (bucket_id = 'content-media' and (select public.has_role('admin')));
create policy content_media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'content-media' and (select public.has_role('admin')));

create policy resource_files_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'resource-files' and (select public.has_role('admin')))
  with check (bucket_id = 'resource-files' and (select public.has_role('admin')));

create policy resource_files_read_by_tier on storage.objects for select to anon, authenticated
  using (bucket_id = 'resource-files' and public.can_read_resource_object(name));

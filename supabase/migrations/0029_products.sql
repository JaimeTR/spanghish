-- 0029_products.sql
-- Productos de la tienda (materiales descargables que se venden en la web).
--
--   * products: gestionados solo por administración. El identificador que usa
--     el carrito es `slug` (estable: los carritos guardados siguen valiendo).
--   * Portada: bucket público content-media (products/<uuid>.<ext>).
--   * Archivo del producto: bucket PRIVADO product-files
--     (products/<product_id>/<uuid>.<ext>); solo administración lo lee o escribe.
--     La entrega al comprador se hará con enlaces firmados de corta duración.
--   * list_shop_products(): lo que la web pública necesita para vender (sin la
--     ruta del archivo). Solo productos publicados.
--   * Publicar exige un precio de al menos 50 centavos (mínimo de Stripe en AUD).
--   * Auditoría con enable_audit().

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name_es text not null check (char_length(name_es) between 1 and 120),
  name_en text not null check (char_length(name_en) between 1 and 120),
  summary_es text check (char_length(summary_es) <= 800),
  summary_en text check (char_length(summary_en) <= 800),
  price_cents integer not null check (price_cents >= 0),
  compare_at_cents integer check (compare_at_cents > price_cents),
  cover_path text check (cover_path ~ '^products/[0-9a-f-]{36}\.(png|jpg|webp)$'),
  cover_width smallint check (cover_width between 1 and 4000),
  cover_height smallint check (cover_height between 1 and 4000),
  file_path text check (file_path ~ '^products/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]{2,5}$'),
  file_name text check (char_length(file_name) <= 200),
  file_size_bytes integer check (file_size_bytes > 0),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_key unique (slug),
  constraint products_cover_dims check ((cover_path is null) = (cover_width is null) and (cover_path is null) = (cover_height is null)),
  constraint products_file_meta check ((file_path is null) = (file_size_bytes is null))
);

comment on table public.products is 'Productos de la tienda (descargables); solo administración. La web lee list_shop_products().';
create index products_created_by_idx on public.products (created_by);

create function public.products_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' then
    if new.price_cents < 50 then
      raise exception 'content_incomplete' using errcode = 'P0001';
    end if;
    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger products_guard before insert or update on public.products
  for each row execute function public.products_guard();
create trigger products_touch_updated_at before update on public.products
  for each row execute function public.touch_updated_at();

revoke execute on function public.products_guard() from public, anon, authenticated, service_role;

alter table public.products enable row level security;
grant select, insert, update, delete on table public.products to authenticated;

create policy products_admin_all on public.products for all to authenticated
  using ((select public.is_active()) and (select public.has_role('admin')))
  with check ((select public.is_active()) and (select public.has_role('admin')));

-- Bucket privado para los archivos que se venden.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-files', 'product-files', false, 26214400, array[
    'application/pdf',
    'application/zip',
    'image/png',
    'image/jpeg',
    'audio/mpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy product_files_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'product-files' and (select public.has_role('admin')))
  with check (bucket_id = 'product-files' and (select public.has_role('admin')));

create function public.list_shop_products()
returns table (
  slug text,
  name_es text,
  name_en text,
  summary_es text,
  summary_en text,
  price_cents integer,
  compare_at_cents integer,
  cover_path text,
  cover_width smallint,
  cover_height smallint,
  has_file boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.slug, p.name_es, p.name_en, p.summary_es, p.summary_en, p.price_cents, p.compare_at_cents,
         p.cover_path, p.cover_width, p.cover_height, (p.file_path is not null)
  from public.products p
  where p.status = 'published'
  order by p.created_at, p.slug;
$$;

comment on function public.list_shop_products() is 'Productos publicados para la tienda de la web (sin la ruta del archivo).';
revoke execute on function public.list_shop_products() from public, anon, authenticated, service_role;
grant execute on function public.list_shop_products() to anon, authenticated;

-- Los tres productos que ya vendía la web (precios e imágenes tal como estaban).
insert into public.products (slug, name_es, name_en, summary_es, summary_en, price_cents, compare_at_cents, status)
select v.slug, v.name_es, v.name_en, v.summary_es, v.summary_en, v.price, v.compare, 'published'
from (values
  ('alphabet', 'El Abecedario – The Alphabet', 'El Abecedario – The Alphabet',
   'Material descargable: el abecedario en español.', 'Downloadable material: the Spanish alphabet.', 200, 500),
  ('spanish-regular-verbs-basic', 'Spanish Regular Verbs Basic', 'Spanish Regular Verbs Basic',
   '¡Lo básico para empezar o seguir una clase de español sin tropiezos! Con este material, aprender los verbos regulares en español es más fácil. Seas profe o estudiante, te va a encantar.',
   'Have the basics to learn or start a Spanish lesson smoothly! Download the best resources you can find for you or your Spanish lessons! With these materials, learning the Spanish regular verbs is easier. Whether you are a teacher or student, you will love it.',
   200, 500),
  ('regular-verbs-spanish', 'Regular Verbs in Spanish', 'Regular Verbs in Spanish',
   'Aprende y practica los verbos regulares en español con un recurso educativo divertido, visual y ameno, pensado para que aprender sea más fácil y agradable.',
   'Learn and practise regular verbs in Spanish with a fun, visual and engaging educational resource designed to make learning easier and more enjoyable.',
   199, 499)
) as v(slug, name_es, name_en, summary_es, summary_en, price, compare)
where not exists (select 1 from public.products x where x.slug = v.slug);

select public.enable_audit('public.products');

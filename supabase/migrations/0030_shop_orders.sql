-- 0030_shop_orders.sql
-- Pedidos de la tienda y entrega automática de los archivos.
--
--   * shop_orders / shop_order_items: un pedido pagado en Stripe y sus productos.
--     Solo los escribe el servidor del portal (service_role) cuando la web le avisa
--     del pago (API protegida con el secreto compartido); administración los lee.
--   * `token` es el secreto del enlace de descarga del comprador: largo, aleatorio
--     y con caducidad (expires_at, 30 días). No se muestra en la administración.
--   * stripe_session_id único: registrar dos veces el mismo pago no duplica nada.
--   * Sin auditoría a propósito: el registro de auditoría copiaría el token de descarga,
--     y nadie edita estas filas desde la administración (solo se leen).

create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique check (char_length(stripe_session_id) between 10 and 255),
  email text check (char_length(email) <= 254),
  locale text not null default 'es' check (locale in ('es', 'en')),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'aud' check (char_length(currency) = 3),
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

comment on table public.shop_orders is 'Pedidos pagados de la tienda; los escribe el servidor del portal, los lee administración.';
create index shop_orders_created_idx on public.shop_orders (created_at desc);

create table public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  slug text not null check (char_length(slug) between 1 and 60),
  name text not null check (char_length(name) between 1 and 200),
  amount_cents integer not null check (amount_cents >= 0),
  constraint shop_order_items_unique unique (order_id, slug)
);

comment on table public.shop_order_items is 'Productos de cada pedido (nombre y precio tal como se vendieron).';
create index shop_order_items_product_idx on public.shop_order_items (product_id);

alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;

-- Administración lee, pero nunca el token (privilegio por columna).
revoke all on table public.shop_orders from anon, authenticated;
grant select (id, stripe_session_id, email, locale, total_cents, currency, expires_at, created_at) on table public.shop_orders to authenticated;
revoke all on table public.shop_order_items from anon, authenticated;
grant select on table public.shop_order_items to authenticated;

create policy shop_orders_admin_select on public.shop_orders for select to authenticated
  using ((select public.is_active()) and (select public.has_role('admin')));
create policy shop_order_items_admin_select on public.shop_order_items for select to authenticated
  using ((select public.is_active()) and (select public.has_role('admin')));

